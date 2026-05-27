from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import jwk, jwt
from jose.utils import base64url_decode

from app.core.config import settings


@dataclass
class AuthUser:
    id: str
    email: str | None = None


_jwks_cache: dict[str, Any] | None = None


async def _load_jwks() -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not settings.SUPABASE_JWKS_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWKS_URL is not configured",
        )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.SUPABASE_JWKS_URL)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


def _get_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


async def _verify_token(token: str) -> AuthUser:
    unverified_header = jwt.get_unverified_header(token)
    jwks = await _load_jwks()
    key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == unverified_header.get("kid")), None)
    if not key_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token key")

    public_key = jwk.construct(key_data)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode("utf-8"))
    if not public_key.verify(message.encode("utf-8"), decoded_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    claims = jwt.get_unverified_claims(token)
    if settings.SUPABASE_JWT_ISSUER and claims.get("iss") != settings.SUPABASE_JWT_ISSUER:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer")
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    return AuthUser(id=user_id, email=claims.get("email"))


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return await _verify_token(token)


async def get_optional_user(
    authorization: str | None = Header(default=None),
) -> AuthUser | None:
    token = _get_bearer_token(authorization)
    if not token:
        return None
    try:
        return await _verify_token(token)
    except HTTPException:
        return None


async def verify_access_token(token: str) -> AuthUser:
    return await _verify_token(token)
