"""
Thin async HTTP client for auth-service's accounts API — voiceprint
lookup/enroll only. Same auth pattern as backend_api.py (self-signed admin
service JWT via service_token.auth_headers()).
"""
import logging
import httpx
from app.config.settings import get_settings
from app.services.service_token import auth_headers

logger = logging.getLogger("voice-agent.auth-api")


def _auth_base() -> str:
    return get_settings().auth_service_url


async def get_account_id_by_phone(phone: str, role: str) -> str | None:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"{_auth_base()}/api/v1/accounts/phone/{phone}",
            params={"role": role},
            headers=auth_headers(),
        )
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()["id"]


async def get_voiceprint(account_id: str) -> list[float] | None:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"{_auth_base()}/api/v1/accounts/{account_id}/voiceprint",
            headers=auth_headers(),
        )
        r.raise_for_status()
        data = r.json()
        return data["embedding"] if data["has_voiceprint"] else None


async def save_voiceprint(account_id: str, embedding: list[float]) -> None:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.put(
            f"{_auth_base()}/api/v1/accounts/{account_id}/voiceprint",
            json={"embedding": embedding},
            headers=auth_headers(),
        )
        r.raise_for_status()
        logger.info("voiceprint saved | account=%s", account_id)
