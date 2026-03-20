"""
ContentPillar CRUD router.

GET /pillars/           — Public (no auth). List active pillars, filter by org.
POST /pillars/          — Superadmin. Create pillar.
PUT /pillars/{id}       — Superadmin. Update pillar.
DELETE /pillars/{id}    — Superadmin. Delete pillar (409 if content linked).
GET /pillars/{id}/content — Authenticated. List articles + courses for a pillar.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.content_pillars import ContentPillarCreate, ContentPillarRead, ContentPillarUpdate
from src.db.users import PublicUser
from src.security.auth import get_authenticated_user, get_current_user
from src.security.superadmin import require_superadmin
from src.services.content_pillars.pillars import (
    create_pillar,
    delete_pillar,
    get_all_pillars,
    get_pillar_by_id,
    get_pillar_content,
    update_pillar,
)

router = APIRouter()


@router.get("/", response_model=List[ContentPillarRead])
async def api_list_pillars(
    org_id: Optional[int] = Query(default=None, description="Filter by org (includes platform-wide pillars)"),
    db_session: Session = Depends(get_db_session),
) -> List[ContentPillarRead]:
    """
    List active content pillars. Public — no authentication required.

    - If org_id is supplied: returns platform-wide pillars + org-specific pillars
    - Otherwise: returns platform-wide pillars only

    Results are ordered by display_order ascending.
    """
    return get_all_pillars(db_session, org_id=org_id)


@router.post("/", response_model=ContentPillarRead, status_code=status.HTTP_201_CREATED)
async def api_create_pillar(
    pillar_data: ContentPillarCreate,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> ContentPillarRead:
    """Create a new content pillar. Superadmin only."""
    return create_pillar(pillar_data, db_session)


@router.get("/{pillar_id}/content")
async def api_get_pillar_content(
    pillar_id: int,
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    List all articles and courses tagged with this pillar.

    Returns: {"articles": [...], "courses": [...]}

    Articles are filtered by access control — only articles the current user
    can access are returned. Anonymous users see free published articles only.
    Authentication is no longer strictly required for free content.
    """
    user_id = current_user.id if hasattr(current_user, "id") else None
    return get_pillar_content(pillar_id, db_session, user_id=user_id)


@router.put("/{pillar_id}", response_model=ContentPillarRead)
async def api_update_pillar(
    pillar_id: int,
    pillar_data: ContentPillarUpdate,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> ContentPillarRead:
    """Partially update a content pillar. Superadmin only."""
    return update_pillar(pillar_id, pillar_data, db_session)


@router.delete("/{pillar_id}", status_code=status.HTTP_200_OK)
async def api_delete_pillar(
    pillar_id: int,
    _current_user: PublicUser = Depends(require_superadmin),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    Delete a content pillar. Superadmin only.

    Returns 409 Conflict if any articles or courses are linked to this pillar.
    """
    return delete_pillar(pillar_id, db_session)
