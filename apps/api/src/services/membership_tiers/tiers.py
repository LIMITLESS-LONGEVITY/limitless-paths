"""
MembershipTier CRUD service functions.

All endpoints are superadmin-only. Superadmin enforcement is handled
at the router layer via the require_superadmin dependency.
"""

import logging
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from src.db.membership_tiers import (
    MembershipTier,
    MembershipTierCreate,
    MembershipTierRead,
    MembershipTierUpdate,
)
from src.db.user_memberships import UserMembership

logger = logging.getLogger(__name__)


def create_tier(tier_data: MembershipTierCreate, db_session: Session) -> MembershipTierRead:
    """Create a new membership tier. Raises 409 if slug is already taken."""
    # Check slug uniqueness
    existing = db_session.exec(
        select(MembershipTier).where(MembershipTier.slug == tier_data.slug)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A tier with slug '{tier_data.slug}' already exists",
        )

    tier = MembershipTier(
        name=tier_data.name,
        slug=tier_data.slug,
        description=tier_data.description,
        is_active=tier_data.is_active,
        priority=tier_data.priority,
        permissions=tier_data.permissions,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)

    return MembershipTierRead.model_validate(tier)


def get_all_tiers(db_session: Session) -> list[MembershipTierRead]:
    """Return all membership tiers ordered by priority descending."""
    tiers = db_session.exec(
        select(MembershipTier).order_by(MembershipTier.priority.desc())  # type: ignore[union-attr]
    ).all()
    return [MembershipTierRead.model_validate(t) for t in tiers]


def get_tier_by_id(tier_id: int, db_session: Session) -> MembershipTierRead:
    """Return a single tier or raise 404."""
    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == tier_id)
    ).first()

    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership tier not found",
        )

    return MembershipTierRead.model_validate(tier)


def update_tier(
    tier_id: int, tier_data: MembershipTierUpdate, db_session: Session
) -> MembershipTierRead:
    """Partially update a tier. Raises 409 if new slug conflicts."""
    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == tier_id)
    ).first()

    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership tier not found",
        )

    # If slug is being changed, check uniqueness
    if tier_data.slug is not None and tier_data.slug != tier.slug:
        existing = db_session.exec(
            select(MembershipTier).where(MembershipTier.slug == tier_data.slug)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A tier with slug '{tier_data.slug}' already exists",
            )

    update_data = tier_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tier, key, value)

    tier.update_date = str(datetime.now())

    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)

    return MembershipTierRead.model_validate(tier)


def get_tier_user_count(tier_id: int, db_session: Session) -> dict:
    """Return the count of active user memberships for a given tier."""
    # Verify tier exists first
    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == tier_id)
    ).first()

    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership tier not found",
        )

    count = db_session.exec(
        select(func.count(UserMembership.id))  # type: ignore[arg-type]
        .where(UserMembership.tier_id == tier_id)
        .where(UserMembership.status == "active")
    ).one()

    return {"tier_id": tier_id, "active_user_count": count}
