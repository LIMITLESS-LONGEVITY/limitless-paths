"""
Org Admin Router
Superadmin-only endpoints for org stats and global user search.
"""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.users import PublicUser
from src.security.superadmin import require_superadmin
from src.services.org_admin.org_admin import get_org_stats, search_users_by_email

router = APIRouter()


@router.get("/orgs/{org_id}/stats", dependencies=[Depends(require_superadmin)])
async def api_get_org_stats(
    org_id: int,
    db_session: Session = Depends(get_db_session),
    _current_user: PublicUser = Depends(require_superadmin),
) -> dict:
    """
    Return aggregate stats for an organization.
    Superadmin only.
    """
    return await get_org_stats(org_id, db_session)


@router.get("/users/search", dependencies=[Depends(require_superadmin)])
async def api_search_users_by_email(
    email: str = Query(..., description="Email search query (case-insensitive)"),
    limit: int = Query(default=10, ge=1, le=50),
    db_session: Session = Depends(get_db_session),
    _current_user: PublicUser = Depends(require_superadmin),
) -> List[dict]:
    """
    Search users globally by email (case-insensitive partial match).
    Superadmin only.
    """
    return await search_users_by_email(email, db_session, limit)
