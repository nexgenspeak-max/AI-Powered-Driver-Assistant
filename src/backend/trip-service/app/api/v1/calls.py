from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.services import call_service, trip_service

router = APIRouter(prefix="/calls", tags=["calls"])


class StartCallRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    driver_id: str = Field(alias="driverId")
    customer_id: str = Field(alias="customerId", default="")
    trip_id: str = Field(alias="tripId", default="")
    phone_number: str = Field(alias="phoneNumber")
    mode: str = "bridge"


@router.post("/start")
async def start_call(body: StartCallRequest):
    """
    Driver-initiated call to the trip customer (voice-agent call_customer tool).

    Dials via call-center → Twilio. Local trial: see CALL_FORCE_VERIFIED_TO.
    """
    phone = body.phone_number.strip()
    if body.trip_id:
        trip = trip_service.get(body.trip_id)
        if trip and trip.get("customer_phone"):
            phone = trip["customer_phone"]

    if not phone:
        raise HTTPException(status_code=400, detail="phoneNumber is required")

    try:
        return await call_service.start_customer_call(
            driver_phone=body.driver_id,
            customer_phone=phone,
            trip_id=body.trip_id,
            mode=body.mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/latest")
def latest_call(x_driver_phone: str = Header(..., alias="X-Driver-Phone")):
    """Stub for summarize_last_call — returns empty until call records are stored."""
    raise HTTPException(status_code=404, detail="No recent call found")


@router.post("/{call_id}/summary")
def summarize_call(call_id: str):
    """Stub — summary comes from call-logger in a future step."""
    raise HTTPException(status_code=404, detail="Call summary not available")
