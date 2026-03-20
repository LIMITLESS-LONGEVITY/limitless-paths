"""
UserMembership endpoints — superadmin only.

Handles tier assignment, active membership lookup, history, and session revocation.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.user_memberships import UserMembershipCreate, UserMembershipRead
from src.db.users import PublicUser
from src.security.auth import get_authenticated_user
from src.security.superadmin import require_superadmin
from src.services.auth.validate import blacklist_user
from src.services.membership_tiers.user_memberships import (
    assign_tier_to_user,
    get_user_active_membership,
    get_user_membership_history,
)

router = APIRouter()


@router.post("/assign", response_model=UserMembershipRead, status_code=201)
async def api_assign_tier(
    data: UserMembershipCreate,
    current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> UserMembershipRead:
    """
    Assign a membership tier to a user (superadmin only).

    Expires any currently active membership, creates a new active one,
    and invalidates the user's cached auth/validate response.
    """
    return assign_tier_to_user(data, assigned_by=current_user.id, db_session=db_session)


@router.get("/user/{user_id}/active", response_model=Optional[UserMembershipRead])
async def api_get_active_membership(
    user_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> Optional[UserMembershipRead]:
    """Get a user's active membership tier (superadmin only). Returns null if none."""
    return get_user_active_membership(user_id, db_session)


@router.get("/user/{user_id}/history", response_model=List[UserMembershipRead])
async def api_get_membership_history(
    user_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> List[UserMembershipRead]:
    """Get a user's full membership history, newest first (superadmin only)."""
    return get_user_membership_history(user_id, db_session)


@router.post("/user/{user_id}/revoke")
async def api_revoke_user_sessions(
    user_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
):
    """Immediately revoke all active sessions for a user by adding them to the Redis blacklist."""
    blacklist_user(user_id)
    return {"detail": f"All sessions revoked for user {user_id}"}
