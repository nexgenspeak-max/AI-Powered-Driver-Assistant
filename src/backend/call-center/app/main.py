from fastapi import FastAPI
from mangum import Mangum
from app.api.v1 import calls

app = FastAPI(title="Driver Assistant API", version="1.0.0")
app.include_router(calls.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


# Lambda handler
handler = Mangum(app, lifespan="off")
