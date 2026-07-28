"""
HTTP API for delivery-photo scanning, deployed as its own ECS service (same
container image as the LiveKit worker, different Command — see
infra/voice-agent/cfn.yaml's VisionApiTaskDefinition/VisionApiService).
Kept out of app/main.py and out of the worker's task on purpose: that
process's main thread is owned by livekit-agents' blocking cli.run_app(), and
a crash/bad-health-check here must never be able to make ECS cycle the
worker task mid-call — so this runs as a fully separate task, not a
same-task sidecar or a background thread in the worker process.

Run locally: uvicorn app.vision_api.main:app --port 8080
"""
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

import os
from pathlib import Path
from dotenv import load_dotenv

_base_dir = Path(__file__).resolve().parents[2]
_env = os.getenv("ENV", "local")
_env_file = _base_dir / "envs" / f".env.{_env}"
if _env_file.exists():
    load_dotenv(_env_file)

from fastapi import Depends, FastAPI, HTTPException

from app.vision_api.auth import require_service_token
from app.vision_api.delivery_extraction import extract_delivery_info

app = FastAPI(title="voice-agent vision API")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/vision/delivery-scan")
async def delivery_scan(body: dict, _claims: dict = Depends(require_service_token)):
    image_base64 = body.get("image_base64")
    if not image_base64 or not isinstance(image_base64, str):
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        extracted = await extract_delivery_info(image_base64, body.get("mime_type", "image/jpeg"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to read delivery photo: {exc}")

    return {"extracted": extracted}
