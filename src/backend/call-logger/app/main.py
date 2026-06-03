from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.api.v1 import records

app = FastAPI(title="Driver Assistant — Call Logger", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(records.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


# Lambda handler
handler = Mangum(app, lifespan="off")
