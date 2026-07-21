"""
Wake-word voiceprint gate — enrollment capture + verification.

Captures raw mic audio directly from a LiveKit participant (no need to wait on
track-publication races: AudioStream.from_participant grabs the microphone
source stream via LiveKit's FFI as soon as it exists) and runs it through
speaker_id.py for embedding + cosine comparison.
"""
import asyncio
import logging

import numpy as np
from livekit import rtc

from app.config.settings import get_settings
from app.services import auth_api, speaker_id

logger = logging.getLogger("voice-agent.speaker-verify")

_ENROLL_PHRASES = [
    "Xin chào, tôi là chủ tài khoản này.",
    "Hôm nay trời đẹp quá, phải không?",
    "Một hai ba bốn năm, năm bốn ba hai một.",
    "Xin chào, hãy đánh thức trợ lý ảo giúp tôi.",
]


async def capture_clip(room: rtc.Room, identity: str, seconds: float, join_timeout: float = 5.0) -> bytes | None:
    """Records `seconds` of 16kHz mono PCM16 from the given participant's mic.
    Returns None if the participant never joined/published within join_timeout."""
    deadline = asyncio.get_event_loop().time() + join_timeout
    participant = room.remote_participants.get(identity)
    while participant is None and asyncio.get_event_loop().time() < deadline:
        await asyncio.sleep(0.2)
        participant = room.remote_participants.get(identity)

    if participant is None:
        logger.warning("speaker-verify: participant %s never joined, skipping capture", identity)
        return None

    stream = rtc.AudioStream.from_participant(
        participant=participant,
        track_source=rtc.TrackSource.SOURCE_MICROPHONE,
        sample_rate=16000,
        num_channels=1,
    )
    chunks: list[bytes] = []
    collected_samples = 0
    target_samples = int(seconds * 16000)
    try:
        async for event in stream:
            chunks.append(bytes(event.frame.data))
            collected_samples += event.frame.samples_per_channel
            if collected_samples >= target_samples:
                break
    finally:
        await stream.aclose()

    if not chunks:
        return None
    return b"".join(chunks)


async def run_enrollment(session, room: rtc.Room, identity: str, account_id: str) -> bool:
    """Prompts the user through _ENROLL_PHRASES (like iOS Voice ID's multiple
    repetitions), averages the resulting embeddings, and saves them. Returns
    True on success."""
    embeddings = []
    for phrase in _ENROLL_PHRASES:
        await session.say(f'Hãy đọc theo: "{phrase}"', allow_interruptions=False)
        clip = await capture_clip(room, identity, seconds=3.5)
        if clip is None:
            await session.say("Không nghe thấy giọng nói, vui lòng thử lại sau.", allow_interruptions=False)
            return False
        embeddings.append(speaker_id.embed(clip))

    voiceprint = speaker_id.average_embedding(embeddings)
    await auth_api.save_voiceprint(account_id, voiceprint.tolist())
    await session.say("Đăng ký giọng nói thành công! Bạn có thể đóng màn hình này.", allow_interruptions=False)
    return True


async def verify_speaker(session, room: rtc.Room, identity: str, account_id: str) -> bool:
    """Returns True if the caller should be allowed to proceed:
    - not enrolled yet -> True (opt-in feature, backward compatible)
    - enrolled and similarity >= threshold -> True
    - enrolled and similarity < threshold -> False (caller should reject/hang up)
    """
    settings = get_settings()
    if not settings.speaker_verify_enabled:
        return True

    try:
        stored = await auth_api.get_voiceprint(account_id)
    except Exception:
        logger.exception("speaker-verify: voiceprint lookup failed, failing open")
        return True

    if stored is None:
        return True  # not enrolled — feature is opt-in

    clip = await capture_clip(room, identity, seconds=2.5)
    if clip is None:
        logger.warning("speaker-verify: no audio captured for %s, failing open", identity)
        return True

    live_embedding = speaker_id.embed(clip)
    similarity = speaker_id.cosine_similarity(live_embedding, np.array(stored, dtype=np.float32))
    logger.info("speaker-verify: identity=%s similarity=%.3f threshold=%.3f", identity, similarity, settings.speaker_verify_threshold)
    return similarity >= settings.speaker_verify_threshold
