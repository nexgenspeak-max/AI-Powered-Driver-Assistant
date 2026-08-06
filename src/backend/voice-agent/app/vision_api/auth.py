import jwt
from fastapi import Header, HTTPException

from app.config.settings import get_settings

# Only trip-service calls this API, signing its own short-lived token with the
# shared JWT_SECRET (same pattern trip-service's authServiceClient.ts uses to
# call auth-service) — so a valid token here must carry role=admin, not just
# any authenticated driver/customer session.
def require_service_token(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization[len("Bearer "):]

    settings = get_settings()
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if claims.get("type") != "access":
        raise HTTPException(status_code=401, detail="Not an access token")
    if claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Service callers only")

    return claims
