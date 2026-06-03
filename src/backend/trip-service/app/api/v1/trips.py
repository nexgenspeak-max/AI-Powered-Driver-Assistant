from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.config import get_settings
from app.services import trip_service, maps_service, dispatch_service

router = APIRouter(prefix="/trips", tags=["trips"])


class CreateTripRequest(BaseModel):
    driver_phone:    str
    customer_name:   str
    customer_phone:  str = ""
    pickup_address:  str
    dropoff_address: str
    pickup_time:     str = ""
    booked_via:      str = "app"   # app | voice | admin


class UpdateStatusRequest(BaseModel):
    status: str   # confirmed | rejected | no_answer | completed


# ── Create trip ───────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_trip(body: CreateTripRequest):
    s = get_settings()

    route = await maps_service.get_route(
        body.pickup_address,
        body.dropoff_address,
        s.google_maps_api_key,
    )

    trip = trip_service.create({
        **body.model_dump(),
        "distance_km":   route.get("distance_km", 0),
        "eta_minutes":   route.get("eta_minutes", 0),
        "traffic_note":  route.get("traffic_note", ""),
        "route_summary": route.get("summary", ""),
    })
    return trip


# ── List trips (admin + polling) ─────────────────────────────────────────────

@router.get("")
def list_trips(
    status:         str = Query(default=""),
    driver_phone:   str = Query(default=""),
    customer_phone: str = Query(default=""),
    limit:          int = Query(default=50, le=200),
):
    """
    GET /api/v1/trips                                → all trips (admin)
    GET /api/v1/trips?status=pending                 → filter by status
    GET /api/v1/trips?driver_phone=+84xxx            → driver's trips
    GET /api/v1/trips?customer_phone=+84xxx          → customer's trips (for AI agent)
    """
    if driver_phone and status:
        return trip_service.list_by_driver_and_status(driver_phone, status, limit)
    if driver_phone:
        return trip_service.list_by_driver(driver_phone, limit)
    if customer_phone:
        return trip_service.list_by_customer(customer_phone, limit)
    if status:
        return trip_service.list_by_status(status, limit)
    return trip_service.list_recent(limit)


# ── Get one trip ──────────────────────────────────────────────────────────────

@router.get("/{trip_id}")
def get_trip(trip_id: str):
    trip = trip_service.get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


# ── Update status ─────────────────────────────────────────────────────────────

@router.patch("/{trip_id}")
def update_trip_status(trip_id: str, body: UpdateStatusRequest):
    allowed = {"confirmed", "rejected", "no_answer", "calling", "notified", "pending", "completed"}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of {allowed}")

    trip = trip_service.get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return trip_service.update_status(trip_id, body.status)


# ── Dispatch call (fallback) ──────────────────────────────────────────────────

@router.post("/{trip_id}/dispatch")
async def dispatch_trip(trip_id: str):
    """Trigger outbound SIP call to driver — used as fallback when driver has no app."""
    trip = trip_service.get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["status"] not in ("pending", "notified", "rejected", "no_answer"):
        raise HTTPException(status_code=409, detail=f"Cannot dispatch trip with status={trip['status']}")

    try:
        room_name = await dispatch_service.dispatch_call(dict(trip))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return trip_service.update_status(trip_id, "calling", {"room_name": room_name})


# ── Notify driver (app push / polling) ───────────────────────────────────────

@router.post("/{trip_id}/notify")
async def notify_driver(trip_id: str):
    """
    Mark trip as notified (driver app will pick it up via polling).
    In production: also sends FCM push here.
    """
    trip = trip_service.get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return trip_service.update_status(trip_id, "notified")
