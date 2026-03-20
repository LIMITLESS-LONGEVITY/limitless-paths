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

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, SQLModel, select

from src.core.events.database import get_db_session
from src.db.articles import Article, ArticleCreate, ArticleListItem, ArticleRead, ArticleUpdate
from src.db.article_versions import ArticleVersionRead
from src.db.users import PublicUser
from src.security.auth import get_authenticated_user, get_current_user
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
from src.services.access_control.access_control import (
    can_user_access_article,
    get_article_access_info,
    get_effective_access,
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


@router.get("/", response_model=Union[List[ArticleRead], List[ArticleListItem]])
async def api_list_articles(
    org_id: int = Query(..., description="Organization ID (required)"),
    pillar_id: Optional[int] = Query(default=None),
    article_status: Optional[str] = Query(default=None, alias="status"),
    author_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    include_locked: bool = Query(
        default=False,
        description="If true, return all PUBLISHED articles with a 'locked' flag for inaccessible ones (content=null for locked). If false (default), only return accessible articles.",
    ),
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> Union[List[ArticleRead], List[ArticleListItem]]:
    """
    List articles for an organization.

    Filters: pillar_id, status, author_id.
    Ordered by update_date descending, paginated.

    Access control:
    - Authenticated users with articles.read RBAC permission see all articles.
    - Otherwise, only accessible articles are returned (or marked locked if include_locked=true).
    - Anonymous users see only free published articles.
    """
    from src.services.articles.articles import _get_article_rights

    user_id = current_user.id if hasattr(current_user, "id") else None

    # Resolve RBAC permissions for admin bypass
    user_perms = None
    if user_id is not None:
        user_perms = _get_article_rights(user_id, org_id, db_session)

    # Admin bypass: users with read permission see everything unfiltered
    is_admin = user_perms is not None and user_perms.get("action_read", False)

    if is_admin:
        # Full access — no access-level filtering
        return get_articles(
            org_id=org_id,
            db_session=db_session,
            pillar_id=pillar_id,
            status=article_status,
            author_id=author_id,
            page=page,
            limit=limit,
        )

    # Compute effective access levels for this user
    effective = get_effective_access(user_id, db_session)

    if not include_locked:
        # SQL-level filter: only return articles with an accessible access_level
        # Fetch raw Article objects to filter by access_level
        stmt = select(Article).where(Article.org_id == org_id)
        if pillar_id is not None:
            stmt = stmt.where(Article.pillar_id == pillar_id)
        if article_status is not None:
            stmt = stmt.where(Article.status == article_status)
        if author_id is not None:
            stmt = stmt.where(Article.author_id == author_id)
        stmt = stmt.where(Article.access_level.in_(list(effective)))  # type: ignore[union-attr]
        stmt = stmt.order_by(Article.update_date.desc())  # type: ignore[union-attr]
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        articles = db_session.exec(stmt).all()
        return [ArticleRead.model_validate(a) for a in articles]
    else:
        # Return all, mark locked ones with locked=True and null content
        articles_read = get_articles(
            org_id=org_id,
            db_session=db_session,
            pillar_id=pillar_id,
            status=article_status,
            author_id=author_id,
            page=page,
            limit=limit,
        )
        result: List[ArticleListItem] = []
        for art in articles_read:
            item = ArticleListItem(**art.model_dump())
            if art.access_level not in effective:
                item.locked = True
                item.content = None
            result.append(item)
        return result


@router.get("/{article_uuid}/access")
async def api_get_article_access(
    article_uuid: str,
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    Return access information for an article without exposing content.

    Response:
    - accessible (bool): whether the current user can read this article
    - required_level (str): the access_level set on the article
    - user_levels (list[str]): sorted list of access levels the user holds

    Does not require authentication — anonymous users get {"user_levels": ["free"]}.
    """
    article_orm = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article_orm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Article '{article_uuid}' not found")

    user_id = current_user.id if hasattr(current_user, "id") else None
    return get_article_access_info(user_id, article_orm, db_session)


@router.get("/{article_uuid}", response_model=ArticleRead)
async def api_get_article(
    article_uuid: str,
    request: Request,
    course_uuid: Optional[str] = Query(default=None, description="Course UUID for course-reference bypass"),
    current_user=Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> ArticleRead:
    """
    Get a single article by its UUID.

    - Authenticated users with articles.read RBAC permission can access any article in their org.
    - Published articles are access-controlled by membership tier (access_level).
    - Anonymous users can read free published articles.
    - Pass course_uuid to enable course-reference bypass.

    Returns 403 if access is denied (upgrade required).
    Returns 404 if article does not exist.
    """
    # Fetch the raw Article ORM object (not ArticleRead) so we can pass it to access control
    article_orm = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article_orm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Article '{article_uuid}' not found")

    user_id = current_user.id if hasattr(current_user, "id") else None

    # Resolve RBAC permissions for admin bypass (authenticated users only)
    user_perms = None
    if user_id is not None:
        user_perms = _get_article_rights(user_id, article_orm.org_id, db_session)

    if not can_user_access_article(
        user_id=user_id,
        article=article_orm,
        db_session=db_session,
        user_article_permissions=user_perms,
        course_uuid=course_uuid,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied — upgrade your membership",
        )

    return ArticleRead.model_validate(article_orm)


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
