"""
UserMembership service functions.

Handles tier assignment, active membership lookup, history retrieval,
and auto-assignment of the free tier on user registration.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.db.membership_tiers import MembershipTier
from src.db.user_memberships import UserMembership, UserMembershipCreate, UserMembershipRead
from src.services.auth.validate import invalidate_user_cache

logger = logging.getLogger(__name__)


def assign_tier_to_user(
    data: UserMembershipCreate,
    assigned_by: int,
    db_session: Session,
) -> UserMembershipRead:
    """
    Assign a membership tier to a user.

    Expires any currently active membership, then creates a new active one.
    Invalidates the user's cached /auth/validate response afterward.
    """
    # Verify the target tier exists
    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == data.tier_id)
    ).first()
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership tier not found",
        )

    # Expire all currently active memberships for this user
    active_memberships = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == data.user_id)
        .where(UserMembership.status == "active")
    ).all()

    for membership in active_memberships:
        membership.status = "expired"
        membership.update_date = str(datetime.now())
        membership.updated_by = assigned_by
        db_session.add(membership)

    # Create the new active membership
    new_membership = UserMembership(
        user_id=data.user_id,
        tier_id=data.tier_id,
        status="active",
        source=data.source,
        started_at=str(datetime.now()),
        expires_at=data.expires_at,
        updated_by=assigned_by,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(new_membership)
    db_session.commit()
    db_session.refresh(new_membership)

    # Invalidate the user's cached auth/validate response
    invalidate_user_cache(data.user_id)

    return UserMembershipRead.model_validate(new_membership)


def get_user_active_membership(
    user_id: int, db_session: Session
) -> Optional[UserMembershipRead]:
    """Return the user's active membership, or None if none exists."""
    membership = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == user_id)
        .where(UserMembership.status == "active")
    ).first()

    if not membership:
        return None

    return UserMembershipRead.model_validate(membership)


def get_user_membership_history(
    user_id: int, db_session: Session
) -> list[UserMembershipRead]:
    """Return all memberships for a user, ordered by id descending (newest first)."""
    memberships = db_session.exec(
        select(UserMembership)
        .where(UserMembership.user_id == user_id)
        .order_by(UserMembership.id.desc())  # type: ignore[union-attr]
    ).all()

    return [UserMembershipRead.model_validate(m) for m in memberships]


def auto_assign_free_tier(user_id: int, db_session: Session) -> None:
    """
    Auto-assign the 'free' tier to a newly registered user.

    Looks up the tier by slug='free'. If no free tier is configured,
    logs a warning and silently returns (does not fail user registration).
    """
    try:
        free_tier = db_session.exec(
            select(MembershipTier).where(MembershipTier.slug == "free")
        ).first()

        if not free_tier:
            logger.warning(
                "auto_assign_free_tier: no tier with slug='free' found; "
                "skipping auto-assignment for user_id=%s",
                user_id,
            )
            return

        membership = UserMembership(
            user_id=user_id,
            tier_id=free_tier.id,  # type: ignore[arg-type]
            status="active",
            source="system",
            started_at=str(datetime.now()),
            expires_at=None,
            updated_by=None,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )

        db_session.add(membership)
        db_session.commit()

        logger.info(
            "auto_assign_free_tier: assigned free tier (id=%s) to user_id=%s",
            free_tier.id,
            user_id,
        )
    except Exception as exc:
        # Never fail user registration because of membership assignment errors
        logger.error(
            "auto_assign_free_tier failed for user_id=%s: %s", user_id, exc
        )
