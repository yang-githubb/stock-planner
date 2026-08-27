from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

# Supabase signs access tokens with RS256 (legacy JWT secret projects use HS256,
# which JWKS-based verification does not cover); ES256 covers newer key types.
_ALLOWED_ALGORITHMS = ["RS256", "ES256"]
_JWKS_TTL_SECONDS = 15 * 60


@dataclass
class AuthUser:
    id: str
    email: str | None = None


_jwks_cache: dict[str, Any] | None = None
_jwks_fetched_at: float = 0.0


async def _fetch_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_fetched_at
    if not settings.SUPABASE_JWKS_URL:
        # Misconfiguration must fail loudly: silently treating requests as
        # anonymous would disable auth for the whole deployment.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured (SUPABASE_JWKS_URL is unset)",
        )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.SUPABASE_JWKS_URL)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = time.monotonic()
        return _jwks_cache


async def _get_signing_key(kid: str | None) -> dict[str, Any]:
    jwks = _jwks_cache
    if jwks is None or time.monotonic() - _jwks_fetched_at > _JWKS_TTL_SECONDS:
        jwks = await _fetch_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        # Unknown kid may mean Supabase rotated its keys; refetch once.
        jwks = await _fetch_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token key")
    return key


def _get_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


async def _verify_token(token: str) -> AuthUser:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    key = await _get_signing_key(header.get("kid"))
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=_ALLOWED_ALGORITHMS,
            issuer=settings.SUPABASE_JWT_ISSUER or None,
            options={"verify_aud": False},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    return AuthUser(id=user_id, email=claims.get("email"))


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return await _verify_token(token)


async def get_writable_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Like get_current_user, but rejects the shared read-only demo account."""
    if (
        settings.DEMO_USER_EMAIL
        and user.email
        and user.email.lower() == settings.DEMO_USER_EMAIL.lower()
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The demo account is read-only. Sign up for your own account to make changes.",
        )
    return user


async def verify_access_token(token: str) -> AuthUser:
    return await _verify_token(token)
