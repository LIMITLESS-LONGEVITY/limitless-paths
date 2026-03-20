"""
GET /auth/validate — Token validation endpoint.

Returns the authenticated user's membership tier and org memberships.
Rejects anonymous users, blacklisted users, and rate-limited IPs.
Responses are cached in Redis for 60 seconds per (user, JWT-signature) pair.
"""

import logging
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.users import AnonymousUser, APITokenUser, PublicUser
from src.security.auth import get_current_user, extract_jwt_from_request
from src.services.auth.validate import (
    get_cached_validation,
    cache_validation,
    is_user_blacklisted,
    get_user_validation_data,
)
from src.services.security.rate_limiting import (
    check_rate_limit,
    get_client_ip,
    get_redis_connection,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate-limit constants for this endpoint
_VALIDATE_MAX_REQUESTS = 60
_VALIDATE_WINDOW_SECONDS = 60  # 1 minute


def _check_validate_rate_limit(request: Request):
    """60 req/min per IP for the validate endpoint."""
    ip = get_client_ip(request)
    key = f"validate:{ip}"
    try:
        is_allowed, _count, retry_after = check_rate_limit(
            key=key,
            max_attempts=_VALIDATE_MAX_REQUESTS,
            window_seconds=_VALIDATE_WINDOW_SECONDS,
        )
    except Exception as exc:
        # If Redis is unavailable, fail open — don't block valid users
        logger.warning("Rate-limit check failed for validate endpoint: %s", exc)
        return

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMITED",
                "message": "Too many validation requests. Please try again later.",
                "retry_after": retry_after,
            },
        )


@router.get("/validate")
async def validate_token(
    request: Request,
    current_user: Union[PublicUser, APITokenUser, AnonymousUser] = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Validate the current user's JWT and return their tier + org memberships.

    - 401 if no valid JWT / anonymous
    - 401 if user is blacklisted
    - 429 if rate limit exceeded (60 req/min per IP)
    - 200 with cached or fresh validation data
    """
    # --- Rate limit -------------------------------------------------------
    _check_validate_rate_limit(request)

    # --- Reject anonymous users -------------------------------------------
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Reject blacklisted users -----------------------------------------
    if is_user_blacklisted(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_BLACKLISTED",
                "message": "This account has been suspended. Please contact support.",
            },
        )

    # --- Try cache --------------------------------------------------------
    # Use JWT signature as cache discriminator so rotated tokens bypass stale cache.
    token = extract_jwt_from_request(request)
    jwt_sig = token if token else str(current_user.id)  # fallback for API tokens

    cached = get_cached_validation(current_user.id, jwt_sig)
    if cached is not None:
        return cached

    # --- Build fresh response ---------------------------------------------
    data = get_user_validation_data(current_user, db_session)

    # Store in cache (fire-and-forget — errors are logged inside)
    cache_validation(current_user.id, jwt_sig, data)

    return data
