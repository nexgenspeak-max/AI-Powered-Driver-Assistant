from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.api.v1 import trips, drivers, voice, calls

app = FastAPI(title="Driver Assistant — Trip Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router,   prefix="/api/v1")
app.include_router(drivers.router, prefix="/api/v1")
app.include_router(voice.router,   prefix="/api/v1")
app.include_router(calls.router,   prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}

handler = Mangum(app, lifespan="off")
