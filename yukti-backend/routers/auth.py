"""
routers/auth.py
───────────────
• get_current_user – FastAPI dependency that verifies Firebase JWT and
                     injects the decoded token (including uid) downstream.
• POST /verify-token – public endpoint to check whether a token is valid.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.firebase import get_auth
from models.schemas import VerifyTokenRequest, VerifyTokenResponse

router  = APIRouter(tags=["auth"])
bearer  = HTTPBearer()


# ── Shared dependency ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    """
    Verify the Bearer token with Firebase Admin SDK.
    Raises 401 if the token is missing, expired, or invalid.
    Returns the decoded token dict (contains uid, email, etc.).
    """
    token = credentials.credentials
    try:
        decoded = get_auth().verify_id_token(token)
        return decoded
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Public endpoint ───────────────────────────────────────────────────────────

@router.post("/verify-token", response_model=VerifyTokenResponse)
async def verify_token(body: VerifyTokenRequest) -> VerifyTokenResponse:
    """
    Public endpoint — no auth required.
    Returns uid + email if the token is valid, otherwise raises 401.
    """
    try:
        decoded = get_auth().verify_id_token(body.token)
        return VerifyTokenResponse(
            uid   = decoded["uid"],
            email = decoded.get("email", ""),
            valid = True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {exc}",
        )
