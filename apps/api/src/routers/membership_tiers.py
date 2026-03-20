"""
MembershipTier CRUD endpoints — superadmin only.

All routes are protected by the require_superadmin dependency.
"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.membership_tiers import MembershipTierCreate, MembershipTierRead, MembershipTierUpdate
from src.db.users import PublicUser
from src.security.superadmin import require_superadmin
from src.services.membership_tiers.tiers import (
    create_tier,
    get_all_tiers,
    get_tier_by_id,
    get_tier_user_count,
    update_tier,
)

router = APIRouter()


@router.get("/", response_model=List[MembershipTierRead])
async def api_list_tiers(
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> List[MembershipTierRead]:
    """List all membership tiers (superadmin only)."""
    return get_all_tiers(db_session)


@router.post("/", response_model=MembershipTierRead, status_code=status.HTTP_201_CREATED)
async def api_create_tier(
    tier_data: MembershipTierCreate,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> MembershipTierRead:
    """Create a new membership tier (superadmin only)."""
    return create_tier(tier_data, db_session)


@router.get("/{tier_id}", response_model=MembershipTierRead)
async def api_get_tier(
    tier_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> MembershipTierRead:
    """Get a single membership tier by ID (superadmin only)."""
    return get_tier_by_id(tier_id, db_session)


@router.put("/{tier_id}", response_model=MembershipTierRead)
async def api_update_tier(
    tier_id: int,
    tier_data: MembershipTierUpdate,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> MembershipTierRead:
    """Partially update a membership tier (superadmin only)."""
    return update_tier(tier_id, tier_data, db_session)


@router.get("/{tier_id}/count")
async def api_get_tier_user_count(
    tier_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """Get the active user count for a membership tier (superadmin only)."""
    return get_tier_user_count(tier_id, db_session)
