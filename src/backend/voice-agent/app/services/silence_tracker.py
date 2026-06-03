"""
SilenceTracker — monitors user speech activity and notifies the LLM when the
user goes silent for too long.  After `max_consecutive_silences` consecutive
silent periods the session is torn down gracefully.

Adapted from genai-core-livekit-voice-platform/src/services/silence_tracker.py.
"""
import asyncio
import logging
import os
import time
from typing import Optional

from livekit import api
from livekit.agents import AgentSession, JobContext
from livekit.protocol.room import RoomParticipantIdentity

logger = logging.getLogger("voice-agent.silence_tracker")


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
    ) -> None:
        self.session = session
        self.ctx = ctx
        self.silence_threshold_seconds = silence_threshold_seconds
        self.silence_message = silence_message
        self.max_consecutive_silences = max_consecutive_silences
        self.end_session_on_timeout = end_session_on_timeout

        self._last_speech_time: Optional[float] = None
        self._silence_task: Optional[asyncio.Task] = None
        self._is_active = False
        self._is_paused = False
        self._consecutive_silence_count = 0

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
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
            try:
                await self._silence_task
            except asyncio.CancelledError:
                pass
        logger.info("SilenceTracker stopped")

    def reset_silence_timer(self) -> None:
        """Reset on any user / conversation activity."""
        if not self._is_active or self._is_paused:
            return
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
        logger.debug("SilenceTracker paused")

    def resume(self) -> None:
        """Resume after the assistant has finished speaking."""
        if not self._is_active or not self._is_paused:
            return
        self._is_paused = False
        self._last_speech_time = time.time()
        self._schedule_silence_check()
        logger.debug("SilenceTracker resumed")

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
            return
        self._silence_task = asyncio.create_task(self._check_silence())

    async def _check_silence(self) -> None:
        try:
            await asyncio.sleep(self.silence_threshold_seconds)

            if not (self._is_active and not self._is_paused and self._last_speech_time):
                return

            silence_duration = time.time() - self._last_speech_time
            if silence_duration < self.silence_threshold_seconds:
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
                        "end_session_on_timeout disabled, keeping session alive"
                    )
                    self._consecutive_silence_count = 0
                    await self._send_silence_notification()
                    self._schedule_silence_check()
            else:
                await self._send_silence_notification()
                self._schedule_silence_check()

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("SilenceTracker error: %s", exc)

    async def _send_silence_notification(self) -> None:
        try:
            await self.session.run(user_input=self.silence_message)
            logger.debug("SilenceTracker | injected: %s", self.silence_message)
        except Exception as exc:
            logger.error("SilenceTracker | failed to send silence notification: %s", exc)

    async def _end_session(self) -> None:
        try:
            await self.stop()

            remote_participants = list(self.ctx.room.remote_participants.values())
            if remote_participants:
                lk = api.LiveKitAPI(
                    url=os.getenv("LIVEKIT_URL", ""),
                    api_key=os.getenv("LIVEKIT_API_KEY", ""),
                    api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
                )
                try:
                    for p in remote_participants:
                        try:
                            await lk.room.remove_participant(
                                RoomParticipantIdentity(
                                    room=self.ctx.room.name,
                                    identity=p.identity,
                                )
                            )
                            logger.info("SilenceTracker | removed participant %s", p.identity)
                        except Exception as exc:
                            logger.warning(
                                "SilenceTracker | could not remove %s: %s", p.identity, exc
                            )
                    await asyncio.sleep(0.5)
                finally:
                    await lk.aclose()
        except Exception as exc:
            logger.error("SilenceTracker | error during session teardown: %s", exc)
        finally:
            self.ctx.shutdown(
                reason=f"silence timeout after {self._consecutive_silence_count} consecutive silences"
            )
