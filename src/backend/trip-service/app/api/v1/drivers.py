from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services import driver_service, trip_service

router = APIRouter(prefix="/drivers", tags=["drivers"])

_UPCOMING_STATUSES = {"pending", "notified", "calling", "confirmed"}
_ACTIVE_STATUSES = {"confirmed", "notified", "calling"}


def _phone_variants(phone: str) -> list[str]:
    """Room tokens strip '+'; DynamoDB may store either format."""
    p = phone.strip()
    bare = p.lstrip("+")
    variants = [p]
    if p != bare:
        variants.append(bare)
    if not p.startswith("+"):
        variants.append(f"+{bare}")
    return list(dict.fromkeys(variants))


def _trips_for_driver(phone: str) -> list[dict]:
    seen: set[str] = set()
    trips: list[dict] = []
    for variant in _phone_variants(phone):
        for trip in trip_service.list_by_driver(variant, limit=50):
            tid = trip.get("trip_id")
            if tid and tid not in seen:
                seen.add(tid)
                trips.append(trip)
    return sorted(trips, key=lambda t: t.get("created_at", ""), reverse=True)


class RegisterRequest(BaseModel):
    phone:     str
    name:      str
    fcm_token: str = ""


class UpdateDriverRequest(BaseModel):
    name:      str | None = None
    fcm_token: str | None = None
    status:    str | None = None   # online | offline


@router.post("", status_code=201)
def register(body: RegisterRequest):
    existing = driver_service.get(body.phone)
    if existing:
        # re-registration — update token and name
        return driver_service.update(body.phone, {
            "name": body.name,
            "fcm_token": body.fcm_token,
        })
    return driver_service.register(body.phone, body.name, body.fcm_token)


@router.get("")
def list_drivers():
    return driver_service.list_all()


@router.get("/online")
def list_online_drivers():
    return driver_service.list_online()


@router.get("/{phone}")
def get_driver(phone: str):
    driver = driver_service.get(phone)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.get("/me/trips/upcoming")
def upcoming_trips(x_driver_phone: str = Header(..., alias="X-Driver-Phone")):
    """Trips assigned to the driver that are not finished yet (voice-agent tool)."""
    trips = [
        t for t in _trips_for_driver(x_driver_phone)
        if t.get("status") in _UPCOMING_STATUSES
    ]
    return trips


@router.get("/me/trips/current")
def current_trip(x_driver_phone: str = Header(..., alias="X-Driver-Phone")):
    """Active trip for the driver, if any (voice-agent tool)."""
    for trip in _trips_for_driver(x_driver_phone):
        if trip.get("status") in _ACTIVE_STATUSES:
            return trip
    raise HTTPException(status_code=404, detail="No active trip")


@router.patch("/{phone}")
def update_driver(phone: str, body: UpdateDriverRequest):
    driver = driver_service.get(phone)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        return driver

    if "status" in fields and fields["status"] not in ("online", "offline"):
        raise HTTPException(status_code=400, detail="status must be online or offline")

    return driver_service.update(phone, fields)
