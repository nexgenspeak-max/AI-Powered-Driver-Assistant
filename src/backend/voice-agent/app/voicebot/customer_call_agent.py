"""CustomerCallAgent — in-room (agent mode) or isolated room (background mode)."""
import asyncio
import logging

from livekit.agents import Agent

from app.voicebot.prompts.customer_call import build_customer_call_prompt
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.customer_call_tools import end_customer_call

logger = logging.getLogger("voice-agent.customer_call_agent")

# Isolated (background) call answer flow — the ONLY deterministic, timer-
# driven piece left here is stating the call's purpose if the customer hasn't
# said anything yet (see _customer_spoke, set from session.py's
# user_input_transcribed/conversation_item_added handlers) — this can't be
# left to the LLM alone (it doesn't reliably decide to speak up on its own
# this early). Ending the call on silence is no longer handled here at all:
# a single generic rule now owns that for the whole call, from this point
# forward — the SilenceTracker configured for "custcall" rooms in
# app/agent/session.py, tuned to end the call after one plain silence gap
# (session.py's `silence_seconds`/`max_silences_default` for mode=="custcall")
# with neither the AI nor the customer saying anything. That one rule replaces
# what used to be three separate, overlapping hand-rolled timers here.
#
# Kept shorter than the SilenceTracker's own threshold (not equal to it) on
# purpose: SilenceTracker.start() runs earlier, during session setup, before
# on_enter() ever gets here — if both waits were the same length, whichever
# fires first would be a race (the tracker could end the call before the
# purpose is ever spoken). This margin guarantees the purpose is always
# spoken first, which also pauses/resets the tracker's own clock.
_INITIAL_WAIT_SECONDS = 3.0


class CustomerCallAgent(SpeechTextFixMixin, Agent):
    """
    - mode=agent: handoff in driver room; driver listens live.
    - mode=background: separate custcall-* room; driver keeps DriverAgent elsewhere.
    """

    def __init__(
        self,
        *,
        lang: str,
        trip: dict,
        customer_name: str,
        driver_name: str = "",
        isolated: bool = False,
        custom_message: str = "",
    ) -> None:
        self._lang = lang
        self._isolated = isolated
        self._trip = trip
        self._customer_name = customer_name
        self._driver_name = driver_name
        self._custom_message = custom_message
        instructions = build_customer_call_prompt(
            lang=lang,
            customer_name=customer_name,
            driver_name=driver_name,
            pickup_address=trip.get("pickup_address", ""),
            trip_id=trip.get("trip_id", ""),
            isolated=isolated,
            custom_message=custom_message,
        )
        super().__init__(instructions=instructions, tools=[end_customer_call])

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    async def on_enter(self) -> None:
        logger.info("CustomerCallAgent active | lang=%s isolated=%s", self._lang, self._isolated)
        if self._isolated:
            await self._run_isolated_answer_flow()
            return

        from app.voicebot.processors.sip_call_watch import wait_for_sip_pickup

        await wait_for_sip_pickup(self.session.userdata)

        # Same resume-on-pickup as _run_isolated_answer_flow below — without
        # this, the tracker (paused right before dialing, see
        # customer_call.py::_pause_silence) never runs again for the rest of
        # an agent-mode call: the agent_state_changed handler in session.py
        # only auto-resumes it once customer_call_active goes False, which
        # doesn't happen until the call actually ends. That silenced the
        # <speech_not_detected> signal this class's own prompt tells the LLM
        # to wait for, removing any timing feedback and leaving nothing but
        # the LLM's own (unreliable) judgment of when the call is "done".
        tracker = self.session.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()

        # Marks "ring/dial time is over, this is genuine pickup" — gates
        # session.py's agent_state_changed handler so it only starts the
        # "customer isn't responding" clock (_agent_call_quiet_since) from
        # here onward, never during ringing. Mirrors _isolated_call_answered
        # below, same reasoning.
        self.session.userdata["_agent_call_answered"] = True

        if self._custom_message:
            hint = (
                f'The person is being dialed into this room. When they answer, greet them '
                f'briefly, then deliver this message from the driver: "{self._custom_message}" '
                "The driver can hear everything — stay brief."
                if self._lang == "en"
                else (
                    f'Người nhận đang được kết nối vào cuộc gọi. Khi họ nghe máy, chào ngắn gọn '
                    f'rồi truyền đạt đúng nội dung tài xế nhắn: "{self._custom_message}" '
                    "Tài xế nghe trực tiếp — nói ngắn gọn."
                )
            )
        elif not self._trip.get("trip_id"):
            # Contact call (no trip attached) with no dictated message — same
            # "Khách"/pickup-flavored wording as the trip-customer branch
            # below was wrong here too (a personal contact isn't a ride
            # customer), just milder since it doesn't name "pickup"
            # explicitly. The custom_message branch above already got this
            # right ("Người nhận"/"The person"); mirror that neutral framing
            # here. Real trip-customer calls (trip_id set) are unaffected —
            # they still hit the branches below, unchanged.
            hint = (
                "The person is being dialed into this room. When they answer, greet them and "
                "explain the driver asked you to give them a call — this is a personal contact, "
                "NOT a ride customer, so don't mention a pickup or a trip. "
                "The driver can hear everything — stay brief."
                if self._lang == "en"
                else (
                    "Người nhận đang được kết nối vào cuộc gọi. Khi họ nghe máy, chào và giải "
                    "thích tài xế nhờ bạn gọi cho họ — đây là người quen của tài xế, KHÔNG PHẢI "
                    "khách đặt xe, nên đừng nhắc gì tới đón khách hay chuyến đi. "
                    "Tài xế nghe trực tiếp — nói ngắn gọn."
                )
            )
        elif self._lang == "en":
            hint = (
                "The customer is being dialed into this room. "
                "When they answer, greet them and explain the driver asked you to call. "
                "The driver can hear everything — stay brief."
            )
        else:
            hint = (
                "Khách đang được kết nối vào cuộc gọi. "
                "Khi khách nghe máy, chào và giải thích tài xế nhờ bạn gọi. "
                "Tài xế nghe trực tiếp — nói ngắn gọn."
            )
        await self.session.generate_reply(instructions=hint)

    def _customer_spoke(self) -> bool:
        return bool(self.session.userdata.get("_customer_spoke"))

    async def _run_isolated_answer_flow(self) -> None:
        """States the call's purpose once, if the customer hasn't spoken yet
        — see the module-level constant's docstring for why this alone is
        still hand-timed while everything past it is now the SilenceTracker's
        job."""
        from app.voicebot.processors.sip_call_watch import wait_for_sip_pickup

        # Wait for genuine pickup (sip.callStatus == active) before letting
        # the SilenceTracker's 5s clock run at all — it was started paused
        # for this exact reason (see session.py's custcall silence_seconds
        # comment). Best-effort like every other use of wait_for_sip_pickup:
        # if the signal is unavailable or times out, this still proceeds
        # (speak/resume anyway) rather than silently stalling the call.
        await wait_for_sip_pickup(self.session.userdata)
        self.session.userdata["_isolated_call_answered"] = True
        tracker = self.session.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()

        await asyncio.sleep(_INITIAL_WAIT_SECONDS)
        if self._customer_spoke():
            return  # customer already talking — normal LLM turn-taking takes it from here

        # Contact calls (no trip attached — self._trip == {}) must NOT use the
        # pickup-confirmation line below: it's nonsensical for a personal
        # contact ("gọi để xác nhận đón anh/chị" to someone who isn't a ride
        # customer — confirmed live, the contact got confused and pushed
        # back). Real trip-customer calls (trip_id always set) are
        # unaffected — same branch condition as build_customer_call_prompt's
        # own trip_id=="" check, so this stays consistent with the system
        # prompt's framing.
        is_contact = not self._trip.get("trip_id")
        pickup_address = self._trip.get("pickup_address", "")
        # custom_message ALWAYS wins first, for both contacts AND real trips —
        # this used to only be checked in the is_contact branch, so a real
        # trip's background call (proximity-arrival notify, etc.) with a
        # custom_message set would silently ignore it here and speak the
        # generic pickup-confirm line instead whenever the callee stayed
        # silent past the first 3s (very common — many people wait for the
        # caller to speak first). The system prompt's own goal_line already
        # prioritized custom_message correctly; this fallback line just
        # hadn't been taught to match. Only the no-custom_message case still
        # branches on is_contact/trip below — unchanged from before.
        if self._custom_message:
            if self._lang == "en":
                purpose = (
                    f'Hello, this is the driver\'s assistant. The driver asked me to pass along: '
                    f'"{self._custom_message}" Can you hear me?'
                )
            else:
                purpose = (
                    f'Xin chào, tôi là trợ lý của tài xế. Tài xế nhờ tôi nhắn: "{self._custom_message}". '
                    "Anh/chị có nghe rõ không?"
                )
        elif is_contact:
            purpose = (
                "Hello, this is the driver's assistant. The driver asked me to give you a call. Can you hear me?"
                if self._lang == "en"
                else "Xin chào, tôi là trợ lý của tài xế. Tài xế nhờ tôi gọi cho anh/chị. Anh/chị có nghe rõ không?"
            )
        elif self._lang == "en":
            purpose = (
                f"Hello, this is the driver's assistant calling to confirm your pickup"
                + (f" at {pickup_address}" if pickup_address else "")
                + ". Can you hear me?"
            )
        else:
            purpose = (
                f"Xin chào, tôi là trợ lý của tài xế, gọi để xác nhận đón anh/chị"
                + (f" tại {pickup_address}" if pickup_address else "")
                + ". Anh/chị có nghe rõ không?"
            )
        logger.info("isolated call | %.0fs silence — stating purpose", _INITIAL_WAIT_SECONDS)
        await self.session.say(purpose, allow_interruptions=True)
        # From here on, ending the call on silence (customer never responds,
        # or the conversation just trails off later) is entirely the
        # SilenceTracker's job — see this method's docstring.
