"""
Token validation service for the /auth/validate endpoint.

Provides Redis-based blacklisting, caching, and DB query for user
membership tier and org membership data.

Redis is synchronous (redis-py) — all functions here are sync.
"""

import json
import logging
from typing import Optional

from sqlmodel import Session, select

from src.db.membership_tiers import MembershipTier
from src.db.organizations import Organization
from src.db.roles import Role
from src.db.user_memberships import UserMembership
from src.db.user_organizations import UserOrganization
from src.services.security.rate_limiting import get_redis_connection

logger = logging.getLogger(__name__)

# TTLs
BLACKLIST_TTL = 28800   # 8 hours
CACHE_TTL = 60          # 60 seconds


# ---------------------------------------------------------------------------
# Blacklist helpers
# ---------------------------------------------------------------------------

def _blacklist_key(user_id: int) -> str:
    return f"blacklist:user:{user_id}"


def is_user_blacklisted(user_id: int) -> bool:
    """Return True if the user is on the Redis blacklist."""
    try:
        r = get_redis_connection()
        return bool(r.exists(_blacklist_key(user_id)))
    except Exception as exc:
        logger.warning("Redis blacklist check failed for user %s: %s", user_id, exc)
        # Fail open — don't block users if Redis is unavailable
        return False


def blacklist_user(user_id: int, ttl: int = BLACKLIST_TTL) -> None:
    """Add user to the Redis blacklist with an 8-hour TTL."""
    try:
        r = get_redis_connection()
        r.setex(_blacklist_key(user_id), ttl, "1")
    except Exception as exc:
        logger.error("Failed to blacklist user %s: %s", user_id, exc)


# ---------------------------------------------------------------------------
# Validation-response cache helpers
# ---------------------------------------------------------------------------

def _cache_key(user_id: int, jwt_sig: str) -> str:
    """Cache key scoped to user + JWT signature (last 16 chars are enough)."""
    return f"validate:{user_id}:{jwt_sig[-16:]}"


def get_cached_validation(user_id: int, jwt_sig: str) -> Optional[dict]:
    """Return cached validation data dict, or None on miss / error."""
    try:
        r = get_redis_connection()
        raw = r.get(_cache_key(user_id, jwt_sig))
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis cache get failed for user %s: %s", user_id, exc)
    return None


def cache_validation(user_id: int, jwt_sig: str, data: dict) -> None:
    """Cache validation data for 60 seconds."""
    try:
        r = get_redis_connection()
        r.setex(_cache_key(user_id, jwt_sig), CACHE_TTL, json.dumps(data))
    except Exception as exc:
        logger.warning("Redis cache set failed for user %s: %s", user_id, exc)


def invalidate_user_cache(user_id: int) -> None:
    """Delete all cached validation entries for a user (pattern: validate:{user_id}:*)."""
    try:
        r = get_redis_connection()
        pattern = f"validate:{user_id}:*"
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor, match=pattern, count=100)
            if keys:
                r.delete(*keys)
            if cursor == 0:
                break
    except Exception as exc:
        logger.warning("Redis cache invalidation failed for user %s: %s", user_id, exc)


# ---------------------------------------------------------------------------
# DB query
# ---------------------------------------------------------------------------

_DEFAULT_TIER = {"slug": "free", "priority": 0, "permissions": {}}


def get_user_validation_data(user, db_session: Session) -> dict:
    """
    Query the DB for a user's active membership tier and org memberships.

    Args:
        user: A User / PublicUser instance (must have .id, .user_uuid,
              .email, .first_name, .last_name attributes).
        db_session: SQLModel Session.

    Returns:
        dict with keys: user_id, user_uuid, email, name, tier, orgs
    """
    # --- Membership tier --------------------------------------------------
    tier_data = _DEFAULT_TIER.copy()

    stmt = (
        select(UserMembership, MembershipTier)
        .join(MembershipTier, UserMembership.tier_id == MembershipTier.id)
        .where(UserMembership.user_id == user.id)
        .where(UserMembership.status == "active")
    )
    result = db_session.exec(stmt).first()

    if result is not None:
        membership, tier = result
        tier_data = {
            "slug": tier.slug,
            "priority": tier.priority,
            "permissions": tier.permissions if tier.permissions else {},
        }

    # --- Org memberships --------------------------------------------------
    org_stmt = (
        select(UserOrganization, Organization, Role)
        .join(Organization, UserOrganization.org_id == Organization.id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(UserOrganization.user_id == user.id)
    )
    org_rows = db_session.exec(org_stmt).all()

    orgs = [
        {
            "slug": org.slug,
            "org_type": org.org_type,
            "role": role.name,
        }
        for _uo, org, role in org_rows
    ]

    return {
        "user_id": user.id,
        "user_uuid": str(user.user_uuid),
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "tier": tier_data,
        "orgs": orgs,
    }
