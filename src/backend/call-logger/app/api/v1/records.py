"""
POST /api/v1/records          voice-agent POSTs here at end of every call
GET  /api/v1/records          list recent calls (filter: ?caller=+84...)
GET  /api/v1/records/{call_id} full record with transcript + summary
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import record_service

router = APIRouter(prefix="/records", tags=["records"])


class Turn(BaseModel):
    role: str    # "user" | "assistant"
    text: str
    ts: float


class CallRecord(BaseModel):
    call_id: str          # LiveKit room name
    caller: str           # driver phone number e.g. +84867347452
    started_at: str       # ISO 8601
    ended_at: str
    duration_seconds: int
    turns: list[Turn]
    summary: str
    stt_provider: str = ""
    llm_model: str = ""


@router.post("", status_code=201)
async def save_record(body: CallRecord):
    record_service.save(body.model_dump())
    return {"status": "saved", "call_id": body.call_id}


@router.get("")
async def list_records(
    caller: str = Query(default="", description="Filter by driver phone number"),
    limit: int = Query(default=20, le=100),
):
    if caller:
        return record_service.list_by_caller(caller, limit)
    return record_service.list_recent(limit)


@router.get("/{call_id}")
async def get_record(call_id: str):
    record = record_service.get(call_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record
