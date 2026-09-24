"""
SilenceTracker — monitors user speech activity and notifies the LLM when the
user goes silent for too long.  After `max_consecutive_silences` consecutive
silent periods the session is torn down gracefully.

Adapted from genai-core-livekit-voice-platform/src/services/silence_tracker.py.
"""
import asyncio
import logging
import time
from typing import Awaitable, Callable, Optional

from livekit.agents import AgentSession, JobContext

from app.services.session_control import end_room_session

logger = logging.getLogger("llm-orchestrator.silence_tracker")


class SilenceTracker:
    """
    Monitors how long the user has been silent and injects a hidden system
    signal (<speech_not_detected>) so the LLM can ask if the driver is still
    there.  After `max_consecutive_silences` the session ends to free resources.
    """

    def __init__(
        self,
        session: AgentSession,
        ctx: JobContext,
        silence_threshold_seconds: float = 15.0,
        silence_message: str = "<speech_not_detected>",
        max_consecutive_silences: int = 3,
        end_session_on_timeout: bool = True,
        on_timeout: Optional[Callable[[], Awaitable[None]]] = None,
        goodbye_message: Optional[str] = None,
        check_in_spoken_message: Optional[str] = None,
    ) -> None:
        self.session = session
        self.ctx = ctx
        self.silence_threshold_seconds = silence_threshold_seconds
        self.silence_message = silence_message
        self.max_consecutive_silences = max_consecutive_silences
        self.end_session_on_timeout = end_session_on_timeout
        self.on_timeout = on_timeout
        self.goodbye_message = goodbye_message
        self.check_in_spoken_message = check_in_spoken_message

        self._last_speech_time: Optional[float] = None
        self._silence_task: Optional[asyncio.Task] = None
        self._is_active = False
        self._is_paused = False
        self._consecutive_silence_count = 0
        self._check_seq = 0  # TEMP DEBUG — see _check_silence()

    # ── Public API ────────────────────────────────────────────────────────────

    async def start(self) -> None:
        if self._is_active:
            return
        self._is_active = True
        self._last_speech_time = time.time()
        self._schedule_silence_check()
        logger.info(
            "SilenceTracker started | threshold=%.0fs max_silences=%d",
            self.silence_threshold_seconds,
            self.max_consecutive_silences,
        )

    async def stop(self) -> None:
        self._is_active = False
        task = self._silence_task
        # _end_session() calls stop() from inside _check_silence itself (the
        # timeout branch), i.e. from the very task held in self._silence_task —
        # cancelling and then awaiting that task from within itself is a
        # self-await, which asyncio rejects ("await wasn't used with future").
        # That exception used to propagate out of session.py's finally block
        # and skip the conv_service.finish() call right after it, silently
        # losing the whole call's DynamoDB record.
        if task and not task.done() and task is not asyncio.current_task():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        logger.info("SilenceTracker stopped")

    def reset_silence_timer(self, source: str = "unknown") -> None:
        """Reset on any user / conversation activity."""
        if not self._is_active or self._is_paused:
            return
        # TEMP DEBUG: this call was previously silent whenever
        # _consecutive_silence_count was already 0 (the common case — no
        # timeout has fired yet this session), which made it impossible to
        # tell from logs whether the 60s clock was being reset by real user
        # speech or by something else (e.g. STT firing on background noise)
        # before it ever reached the threshold. Unconditional now so every
        # reset is visible; remove the `source` plumbing once confirmed.
        logger.info("SilenceTracker reset_silence_timer | source=%s", source)
        self._last_speech_time = time.time()
        if self._consecutive_silence_count > 0:
            logger.debug(
                "SilenceTracker reset | cleared %d consecutive silence(s)",
                self._consecutive_silence_count,
            )
            self._consecutive_silence_count = 0
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        self._schedule_silence_check()

    def pause(self) -> None:
        """Pause while waiting for the assistant to respond."""
        if not self._is_active:
            return
        self._is_paused = True
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        logger.info("SilenceTracker paused")

    def resume(self) -> None:
        """Resume after the assistant has finished speaking."""
        if not self._is_active or not self._is_paused:
            return
        self._is_paused = False
        self._last_speech_time = time.time()
        self._schedule_silence_check()
        logger.info("SilenceTracker resumed")

    # ── Properties ───────────────────────────────────────────────────────────

    @property
    def is_active(self) -> bool:
        return self._is_active

    @property
    def is_paused(self) -> bool:
        return self._is_paused

    @property
    def consecutive_silence_count(self) -> int:
        return self._consecutive_silence_count

    # ── Internals ─────────────────────────────────────────────────────────────

    def _schedule_silence_check(self) -> None:
        if not self._is_active or self._is_paused:
            logger.info(
                "SilenceTracker _schedule_silence_check | SKIPPED (is_active=%s is_paused=%s)",
                self._is_active,
                self._is_paused,
            )
            return
        self._check_seq += 1
        seq = self._check_seq
        logger.info("SilenceTracker _schedule_silence_check | creating check #%d", seq)
        self._silence_task = asyncio.create_task(self._check_silence(seq))

    # TEMP DEBUG: `seq` + the two log lines below (entry right after waking
    # from sleep, and the guard's actual values on early-return) exist purely
    # to catch a reproduced-but-unexplained bug: a scheduled check silently
    # never fires at all (no log of any kind — not even a cancellation), no
    # exception/traceback anywhere, and the process is provably still alive
    # and responsive throughout (confirmed via later log activity). Remove
    # once the cause is confirmed.
    async def _check_silence(self, seq: int = 0) -> None:
        try:
            logger.info("SilenceTracker _check_silence #%d | sleeping %.0fs", seq, self.silence_threshold_seconds)
            await asyncio.sleep(self.silence_threshold_seconds)
            logger.info("SilenceTracker _check_silence #%d | woke up", seq)

            if not (self._is_active and not self._is_paused and self._last_speech_time):
                logger.info(
                    "SilenceTracker _check_silence #%d | guard failed, returning "
                    "(is_active=%s is_paused=%s last_speech_time=%s)",
                    seq,
                    self._is_active,
                    self._is_paused,
                    self._last_speech_time,
                )
                return

            silence_duration = time.time() - self._last_speech_time
            # 1s tolerance: asyncio.sleep() above waits on the event loop's
            # internal monotonic clock, while silence_duration is computed
            # from time.time() (wall clock) — the two aren't perfectly
            # synchronized, so a task that genuinely slept the full
            # threshold can still measure a duration a few milliseconds
            # *under* it. Without this tolerance that hit this early-return
            # (meant for a genuine reset mid-sleep, which already gets a
            # replacement task scheduled by reset_silence_timer() itself)
            # even though no reset happened here — silently dropping the
            # reschedule and killing the whole silence-detection loop after
            # this task. Confirmed in production logs: a task that slept
            # exactly 60s measured "60.0s" here and still took this branch.
            if silence_duration < self.silence_threshold_seconds - 1.0:
                logger.info(
                    "SilenceTracker _check_silence #%d | woke early, only %.1fs since last speech — returning",
                    seq,
                    silence_duration,
                )
                return

            self._consecutive_silence_count += 1
            logger.info(
                "SilenceTracker | %.1fs silence detected (%d/%d)",
                silence_duration,
                self._consecutive_silence_count,
                self.max_consecutive_silences,
            )

            if self._consecutive_silence_count >= self.max_consecutive_silences:
                if self.end_session_on_timeout:
                    logger.info("SilenceTracker | max consecutive silences reached — ending session")
                    await self._end_session()
                else:
                    logger.info(
                        "SilenceTracker | max consecutive silences reached — "
                        "end_session_on_timeout disabled, stopping check-ins"
                    )
                    self._consecutive_silence_count = 0
                    await self.stop()
            else:
                # Next cycle is scheduled BEFORE awaiting the notification,
                # not after. `self.session.run(...)` inside
                # _send_silence_notification() below makes the LLM react to
                # the injected nudge, which typically flips agent_state to
                # "thinking"/"speaking" — and that state change calls
                # pause(), which cancels whatever task `self._silence_task`
                # currently points to. If the *next* task weren't created
                # until after this await, `self._silence_task` would still
                # be pointing at THIS running task while it awaited, so
                # pause() would cancel this very coroutine mid-flight —
                # raising CancelledError right here and skipping the
                # reschedule below entirely. That silently killed the whole
                # silence-detection loop after exactly one cycle (confirmed
                # in production logs: "60.0s silence detected (1/3)" fires
                # once, then nothing ever again). Scheduling first means
                # `self._silence_task` already points at the *new* task by
                # the time pause() can possibly fire, so a cancellation
                # there just cancels that fresh task cleanly — resume() (via
                # the same agent_state_changed handler, once the AI finishes
                # asking "still there?") reschedules it again from a clean
                # timer, which is the semantically correct behavior anyway
                # (measure silence from when the AI stops talking, not from
                # when it started responding to its own nudge).
                self._schedule_silence_check()
                await self._send_silence_check_in()

        except asyncio.CancelledError:
            logger.info("SilenceTracker _check_silence #%d | cancelled", seq)
        except Exception as exc:
            logger.error("SilenceTracker _check_silence #%d error: %s", seq, exc, exc_info=True)

    async def _send_silence_check_in(self) -> None:
        """One deterministic spoken check-in, or LLM nudge when none configured."""
        try:
            if self.check_in_spoken_message:
                await self.session.say(
                    self.check_in_spoken_message,
                    allow_interruptions=True,
                )
                logger.debug(
                    "SilenceTracker | spoken check-in: %s",
                    self.check_in_spoken_message,
                )
            else:
                await self._send_silence_notification()
        except Exception as exc:
            logger.error("SilenceTracker | failed to send silence check-in: %s", exc)

    async def _send_silence_notification(self) -> None:
        try:
            await self.session.run(user_input=self.silence_message)
            logger.debug("SilenceTracker | injected: %s", self.silence_message)
        except Exception as exc:
            logger.error("SilenceTracker | failed to send silence notification: %s", exc)

    async def _end_session(self) -> None:
        try:
            await self.stop()

            if self.goodbye_message:
                try:
                    await self.session.say(self.goodbye_message, allow_interruptions=False)
                except Exception:
                    logger.error("SilenceTracker | failed to say goodbye message", exc_info=True)

            if self.on_timeout:
                try:
                    await self.on_timeout()
                except Exception:
                    logger.error("SilenceTracker | on_timeout callback failed", exc_info=True)
        except Exception as exc:
            logger.error("SilenceTracker | error during session teardown: %s", exc)
        finally:
            await end_room_session(
                self.ctx,
                reason=f"silence timeout after {self._consecutive_silence_count} consecutive silences",
            )
