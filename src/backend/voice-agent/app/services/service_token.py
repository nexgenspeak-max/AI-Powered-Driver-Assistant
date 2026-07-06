"""
trip-service now requires a Bearer access token on every /api/v1/* route. voice-agent
has no end-user session, so it signs its own short-lived internal token with the
JWT_SECRET shared across auth-service/trip-service/voice-agent.
"""
import time
import jwt
from app.config.settings import get_settings

_cached_token: str | None = None
_cached_expiry: int = 0


def _service_token() -> str:
    global _cached_token, _cached_expiry
    now = int(time.time())
    if _cached_token and _cached_expiry - 30 > now:
        return _cached_token

    settings = get_settings()
    expires_in = 5 * 60
    _cached_token = jwt.encode(
        {
            "sub": "voice-agent",
            "role": "admin",
            "permissions": ["*"],
            "name": "voice-agent",
            "type": "access",
            "iat": now,
            "exp": now + expires_in,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    _cached_expiry = now + expires_in
    return _cached_token


def auth_headers(extra: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {_service_token()}"}
    if extra:
        headers.update(extra)
    return headers
