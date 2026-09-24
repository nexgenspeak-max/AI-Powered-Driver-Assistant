"""
external-api-service requires a Bearer access token on every /api/v1/* route.
llm-orchestrator has no end-user session, so it signs its own short-lived
internal token with the JWT_SECRET shared with identity-service.
Login tokens are issued only by identity-service.
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
    secret = settings.jwt_secret
    if not secret:
        raise RuntimeError("JWT_SECRET is required for service-to-service calls")

    expires_in = 5 * 60
    _cached_token = jwt.encode(
        {
            "sub": "llm-orchestrator",
            "role": "admin",
            "permissions": ["*"],
            "name": "llm-orchestrator",
            "type": "access",
            "iat": now,
            "exp": now + expires_in,
        },
        secret,
        algorithm="HS256",
    )
    _cached_expiry = now + expires_in
    return _cached_token


def auth_headers(extra: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {_service_token()}"}
    if extra:
        headers.update(extra)
    return headers
