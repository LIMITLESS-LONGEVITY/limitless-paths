"""
Article CRUD router.

POST   /articles/                — articles.create. Create article (status=DRAFT).
GET    /articles/                — articles.read. List articles with filters.
GET    /articles/{article_uuid}  — articles.read. Get single article.
PUT    /articles/{article_uuid}  — articles.update OR own DRAFT + articles.create.
DELETE /articles/{article_uuid}  — articles.delete. Delete article + versions.

Workflow transitions (7 state-machine actions):
POST   /articles/{article_uuid}/submit   — DRAFT → IN_REVIEW
POST   /articles/{article_uuid}/approve  — IN_REVIEW → APPROVED
POST   /articles/{article_uuid}/reject   — IN_REVIEW → DRAFT  (requires review_notes)
POST   /articles/{article_uuid}/publish  — APPROVED → PUBLISHED
POST   /articles/{article_uuid}/revise   — APPROVED → DRAFT
POST   /articles/{article_uuid}/archive  — PUBLISHED → ARCHIVED
POST   /articles/{article_uuid}/reopen   — ARCHIVED → DRAFT

Version history:
GET    /articles/{article_uuid}/versions                            — list versions
POST   /articles/{article_uuid}/versions/{version_number}/restore  — restore version
"""

from typing import List, Optional, Union

from fastapi import APIRouter, Depends, Query, Request, status
from sqlmodel import Session, SQLModel

from src.core.events.database import get_db_session
from src.db.articles import ArticleCreate, ArticleRead, ArticleUpdate
from src.db.article_versions import ArticleVersionRead
from src.db.users import PublicUser
from src.security.auth import get_authenticated_user
from src.services.articles.articles import (
    create_article,
    delete_article,
    get_article_by_uuid,
    get_articles,
    update_article,
    _get_article_rights,
)
from src.services.articles.workflow import (
    transition_article,
    get_article_versions,
    restore_article_version,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request body schemas
# ---------------------------------------------------------------------------

class RejectBody(SQLModel):
    """Body for the reject endpoint — review_notes is required."""
    review_notes: str


# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=ArticleRead, status_code=status.HTTP_201_CREATED)
async def api_create_article(
    article_data: ArticleCreate,
    org_id: int = Query(..., description="Organization ID the article belongs to"),
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Create a new article in DRAFT status.

    - Generates article_uuid server-side.
    - Auto-generates slug from title if not provided.
    - Creates the initial ArticleVersion (version_number=1).

    Requires articles.create permission in the org.
    """
    return create_article(
        data=article_data,
        author_id=current_user.id,
        org_id=org_id,
        db_session=db_session,
    )


@router.get("/", response_model=List[ArticleRead])
async def api_list_articles(
    org_id: int = Query(..., description="Organization ID (required)"),
    pillar_id: Optional[int] = Query(default=None),
    article_status: Optional[str] = Query(default=None, alias="status"),
    author_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> List[ArticleRead]:
    """
    List articles for an organization.

    Filters: pillar_id, status, author_id.
    Ordered by update_date descending, paginated.

    Requires articles.read permission (checked at service layer).
    """
    from src.services.articles.articles import _check_article_permission
    _check_article_permission(current_user.id, org_id, "read", db_session)

    return get_articles(
        org_id=org_id,
        db_session=db_session,
        pillar_id=pillar_id,
        status=article_status,
        author_id=author_id,
        page=page,
        limit=limit,
    )


@router.get("/{article_uuid}", response_model=ArticleRead)
async def api_get_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Get a single article by its UUID.

    Requires articles.read permission in the article's org.
    """
    article = get_article_by_uuid(article_uuid, db_session)

    from src.services.articles.articles import _check_article_permission
    _check_article_permission(current_user.id, article.org_id, "read", db_session)

    return article


@router.put("/{article_uuid}", response_model=ArticleRead)
async def api_update_article(
    article_uuid: str,
    article_data: ArticleUpdate,
    auto_save: bool = Query(
        default=False,
        description="If true, update content without creating a version snapshot",
    ),
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Update article content fields.

    Status is NOT updatable here — use workflow endpoints.

    Permission:
    - User has articles.update  → can update any article in the org.
    - User is author AND article is DRAFT AND user has articles.create
      → can update their own draft.

    If auto_save=False (default): creates a new ArticleVersion.
    If auto_save=True: updates in place, no version created.
    """
    return update_article(
        article_uuid=article_uuid,
        data=article_data,
        user_id=current_user.id,
        db_session=db_session,
        auto_save=auto_save,
    )


@router.delete("/{article_uuid}", status_code=status.HTTP_200_OK)
async def api_delete_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    Delete an article and all its versions.

    ArticleVersions are cascade-deleted by the DB (FK ON DELETE CASCADE).

    Requires articles.delete permission.
    """
    return delete_article(
        article_uuid=article_uuid,
        user_id=current_user.id,
        db_session=db_session,
    )


# ---------------------------------------------------------------------------
# Internal helper: resolve user rights for workflow endpoints
# ---------------------------------------------------------------------------

def _resolve_workflow_rights(user_id: int, article_uuid: str, db_session: Session) -> dict:
    """
    Fetch the article's org_id then return the merged ArticlePermissions dict
    for the given user.  Used by all transition endpoints.
    """
    from sqlmodel import select
    from src.db.articles import Article

    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Article not found")

    return _get_article_rights(user_id, article.org_id, db_session)


# ---------------------------------------------------------------------------
# Workflow transition endpoints
# ---------------------------------------------------------------------------

@router.post("/{article_uuid}/submit", response_model=ArticleRead)
async def api_submit_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Submit a DRAFT article for review.  Transitions DRAFT → IN_REVIEW.

    Requires articles.action_submit_review permission.
    Authors can always submit their own drafts if they have that permission.
    Non-authors additionally need articles.action_update.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="submit",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


@router.post("/{article_uuid}/approve", response_model=ArticleRead)
async def api_approve_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Approve an article that is IN_REVIEW.  Transitions IN_REVIEW → APPROVED.

    Sets reviewer_id and review_date on the article.
    Requires articles.action_review permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="approve",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


@router.post("/{article_uuid}/reject", response_model=ArticleRead)
async def api_reject_article(
    article_uuid: str,
    body: RejectBody,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Reject an article that is IN_REVIEW.  Transitions IN_REVIEW → DRAFT.

    Stores `review_notes` on the article.  `review_notes` is required in the
    request body — 400 is returned without it.
    Requires articles.action_review permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="reject",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
        review_notes=body.review_notes,
    )


@router.post("/{article_uuid}/publish", response_model=ArticleRead)
async def api_publish_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Publish an APPROVED article.  Transitions APPROVED → PUBLISHED.

    Sets published_at on the article.
    Requires articles.action_publish permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="publish",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


@router.post("/{article_uuid}/revise", response_model=ArticleRead)
async def api_revise_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Send an APPROVED article back to DRAFT for revisions.
    Transitions APPROVED → DRAFT.

    Requires articles.action_publish permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="revise",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


@router.post("/{article_uuid}/archive", response_model=ArticleRead)
async def api_archive_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Archive a PUBLISHED article.  Transitions PUBLISHED → ARCHIVED.

    Requires articles.action_publish permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="archive",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


@router.post("/{article_uuid}/reopen", response_model=ArticleRead)
async def api_reopen_article(
    article_uuid: str,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Reopen an ARCHIVED article.  Transitions ARCHIVED → DRAFT.

    Requires articles.action_publish permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    return transition_article(
        article_uuid=article_uuid,
        action="reopen",
        user=current_user,
        user_rights=user_rights,
        db_session=db_session,
    )


# ---------------------------------------------------------------------------
# Version history endpoints
# ---------------------------------------------------------------------------

@router.get("/{article_uuid}/versions", response_model=List[ArticleVersionRead])
async def api_get_article_versions(
    article_uuid: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> List[ArticleVersionRead]:
    """
    List version history for an article, newest version first.

    Requires articles.read permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    if not user_rights.get("action_read", False):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Missing permission: action_read")

    return get_article_versions(
        article_uuid=article_uuid,
        db_session=db_session,
        page=page,
        limit=limit,
    )


@router.post(
    "/{article_uuid}/versions/{version_number}/restore",
    response_model=ArticleRead,
)
async def api_restore_article_version(
    article_uuid: str,
    version_number: int,
    current_user=Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Restore an article to a previous version's content.

    Creates a new version snapshot with the old content so the restore is
    fully auditable.  Does not change article status.

    Requires articles.update permission.
    """
    user_rights = _resolve_workflow_rights(current_user.id, article_uuid, db_session)
    if not user_rights.get("action_update", False):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Missing permission: action_update")

    return restore_article_version(
        article_uuid=article_uuid,
        version_number=version_number,
        user_id=current_user.id,
        db_session=db_session,
    )
