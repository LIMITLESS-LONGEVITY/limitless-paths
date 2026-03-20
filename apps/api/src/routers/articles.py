"""
Article CRUD router.

POST   /articles/                — articles.create. Create article (status=DRAFT).
GET    /articles/                — articles.read. List articles with filters.
GET    /articles/{article_uuid}  — articles.read. Get single article.
PUT    /articles/{article_uuid}  — articles.update OR own DRAFT + articles.create.
DELETE /articles/{article_uuid}  — articles.delete. Delete article + versions.

Workflow transitions (submit_review, approve, publish, archive) are in Task 6.
"""

from typing import List, Optional, Union

from fastapi import APIRouter, Depends, Query, Request, status
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.articles import ArticleCreate, ArticleRead, ArticleUpdate
from src.db.users import PublicUser
from src.security.auth import get_authenticated_user
from src.services.articles.articles import (
    create_article,
    delete_article,
    get_article_by_uuid,
    get_articles,
    update_article,
)

router = APIRouter()


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

    Status is NOT updatable here — use workflow endpoints (Task 6).

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
