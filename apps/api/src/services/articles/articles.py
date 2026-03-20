"""
Article CRUD service functions.

Workflow transitions (submit_review, approve, publish, archive) are in Task 6.
This module handles only Create, Read, Update, Delete.
"""

import logging
import re
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.db.articles import (
    Article,
    ArticleCreate,
    ArticleRead,
    ArticleStatusEnum,
    ArticleUpdate,
)
from src.db.article_versions import ArticleVersion
from src.db.roles import Role
from src.db.user_organizations import UserOrganization
from src.db.access_levels import AccessLevel
from src.db.content_pillars import ContentPillar
from src.security.superadmin import is_user_superadmin

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Slug generation
# ---------------------------------------------------------------------------

def _slugify(title: str) -> str:
    """Lowercase, replace spaces with hyphens, remove non-alphanumeric chars."""
    slug = title.lower().strip()
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or "article"


def _ensure_unique_slug(base_slug: str, org_id: int, db_session: Session, exclude_id: Optional[int] = None) -> str:
    """Append a numeric suffix until the slug is unique within the org."""
    slug = base_slug
    counter = 1
    while True:
        stmt = select(Article).where(
            Article.slug == slug,
            Article.org_id == org_id,
        )
        if exclude_id is not None:
            stmt = stmt.where(Article.id != exclude_id)
        existing = db_session.exec(stmt).first()
        if not existing:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------

def _get_article_rights(user_id: int, org_id: int, db_session: Session) -> dict:
    """
    Return the merged article permissions for the user in the given org.

    We iterate over the user's roles for that org (plus global roles) and
    accumulate granted permissions using OR semantics — any role that grants
    a permission makes it available.
    """
    # Superadmin gets everything
    if is_user_superadmin(user_id, db_session):
        return {
            "action_create": True,
            "action_read": True,
            "action_update": True,
            "action_delete": True,
            "action_submit_review": True,
            "action_review": True,
            "action_publish": True,
        }

    stmt = (
        select(Role)
        .join(UserOrganization, UserOrganization.role_id == Role.id)
        .where(UserOrganization.user_id == user_id)
        .where(
            (UserOrganization.org_id == org_id) | (Role.org_id == None)
        )
    )
    roles = db_session.exec(stmt).all()

    merged = {
        "action_create": False,
        "action_read": False,
        "action_update": False,
        "action_delete": False,
        "action_submit_review": False,
        "action_review": False,
        "action_publish": False,
    }

    for role in roles:
        rights = role.rights
        if not rights:
            continue
        if isinstance(rights, dict):
            article_rights = rights.get("articles", {})
        else:
            article_rights = getattr(rights, "articles", None)
            if article_rights:
                article_rights = article_rights.model_dump() if hasattr(article_rights, "model_dump") else dict(article_rights)
            else:
                article_rights = {}

        for key in merged:
            if isinstance(article_rights, dict):
                if article_rights.get(key, False):
                    merged[key] = True
            else:
                if getattr(article_rights, key, False):
                    merged[key] = True

    return merged


def _check_article_permission(user_id: int, org_id: int, action: str, db_session: Session) -> None:
    """Raise 403 if the user does not have the named article permission."""
    rights = _get_article_rights(user_id, org_id, db_session)
    if not rights.get(f"action_{action}", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have articles.{action} permission",
        )


# ---------------------------------------------------------------------------
# CRUD functions
# ---------------------------------------------------------------------------

def create_article(
    data: ArticleCreate,
    author_id: int,
    org_id: int,
    db_session: Session,
) -> ArticleRead:
    """
    Create an article in DRAFT status.

    - Generates article_uuid automatically.
    - Auto-generates slug from title if not provided.
    - Creates the initial ArticleVersion (version_number=1).
    """
    _check_article_permission(author_id, org_id, "create", db_session)

    # Validate access_level if explicitly provided (ArticleCreate doesn't expose it yet,
    # but guard against future callers passing it in unexpected ways via model extensions)
    if hasattr(data, "access_level") and data.access_level is not None:
        valid_levels = [e.value for e in AccessLevel]
        if data.access_level not in valid_levels:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid access_level: {data.access_level!r}. Valid values: {valid_levels}",
            )

    article_uuid = f"article_{uuid4()}"

    # Resolve slug
    base_slug = _slugify(data.slug) if data.slug else _slugify(data.title)
    slug = _ensure_unique_slug(base_slug, org_id, db_session)

    # Determine access_level: use explicitly provided value, then pillar default, then "free"
    explicit_access_level = getattr(data, "access_level", None)

    article = Article(
        article_uuid=article_uuid,
        title=data.title,
        slug=slug,
        summary=data.summary,
        content=data.content or {},
        featured_image=data.featured_image,
        status=ArticleStatusEnum.DRAFT.value,
        access_level=explicit_access_level or "free",
        pillar_id=data.pillar_id,
        org_id=org_id,
        author_id=author_id,
        related_courses=data.related_courses or [],
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    # Inherit access_level from pillar if not explicitly set
    if not explicit_access_level and article.pillar_id:
        pillar = db_session.get(ContentPillar, article.pillar_id)
        if pillar and hasattr(pillar, "default_access_level") and pillar.default_access_level:
            article.access_level = pillar.default_access_level
            db_session.add(article)
            db_session.commit()
            db_session.refresh(article)

    # Create initial version
    version = ArticleVersion(
        article_id=article.id,
        version_number=1,
        content=data.content or {},
        created_by_id=author_id,
        created_at=str(datetime.now()),
        notes="Initial draft",
    )
    db_session.add(version)
    db_session.commit()

    logger.info(f"Created article article_uuid={article_uuid} org_id={org_id} author_id={author_id}")
    return ArticleRead.model_validate(article)


def get_articles(
    org_id: int,
    db_session: Session,
    pillar_id: Optional[int] = None,
    status: Optional[str] = None,
    author_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
) -> List[ArticleRead]:
    """
    List articles for an org with optional filters.

    Ordered by update_date descending, paginated.
    """
    stmt = select(Article).where(Article.org_id == org_id)

    if pillar_id is not None:
        stmt = stmt.where(Article.pillar_id == pillar_id)
    if status is not None:
        stmt = stmt.where(Article.status == status)
    if author_id is not None:
        stmt = stmt.where(Article.author_id == author_id)

    stmt = stmt.order_by(Article.update_date.desc())  # type: ignore[union-attr]
    stmt = stmt.offset((page - 1) * limit).limit(limit)

    articles = db_session.exec(stmt).all()
    return [ArticleRead.model_validate(a) for a in articles]


def get_article_by_uuid(article_uuid: str, db_session: Session) -> ArticleRead:
    """Return an article by its UUID or raise 404."""
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{article_uuid}' not found",
        )

    return ArticleRead.model_validate(article)


def update_article(
    article_uuid: str,
    data: ArticleUpdate,
    user_id: int,
    db_session: Session,
    auto_save: bool = False,
) -> ArticleRead:
    """
    Update an article's content fields.

    Permission rules:
    - User has articles.update  → can update any article in the org
    - User is the author AND article is DRAFT AND user has articles.create
      → can update their own draft

    If auto_save=False (explicit save): creates a new ArticleVersion with
    incremented version_number.
    If auto_save=True: updates in place without creating a new version.

    Cross-reference: if related_courses is provided, invalid UUIDs are
    silently filtered (validation is best-effort, not blocking).
    """
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{article_uuid}' not found",
        )

    org_id = article.org_id
    rights = _get_article_rights(user_id, org_id, db_session)

    has_update_perm = rights.get("action_update", False)
    is_own_draft = (
        article.author_id == user_id
        and article.status == ArticleStatusEnum.DRAFT.value
        and rights.get("action_create", False)
    )

    if not has_update_perm and not is_own_draft:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this article",
        )

    update_data = data.model_dump(exclude_unset=True)

    # Validate access_level if provided
    if "access_level" in update_data and update_data["access_level"] is not None:
        valid_levels = [e.value for e in AccessLevel]
        if update_data["access_level"] not in valid_levels:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid access_level: {update_data['access_level']!r}. Valid values: {valid_levels}",
            )

    # Validate related_courses (silently filter invalid ones)
    if "related_courses" in update_data and update_data["related_courses"]:
        from src.db.courses.courses import Course
        valid_courses = []
        for course_uuid in update_data["related_courses"]:
            exists = db_session.exec(
                select(Course).where(
                    Course.course_uuid == course_uuid,
                    Course.org_id == org_id,
                )
            ).first()
            if exists:
                valid_courses.append(course_uuid)
        update_data["related_courses"] = valid_courses

    # If slug is changing, ensure it remains unique
    if "slug" in update_data and update_data["slug"]:
        new_slug = _slugify(update_data["slug"])
        update_data["slug"] = _ensure_unique_slug(new_slug, org_id, db_session, exclude_id=article.id)

    for key, value in update_data.items():
        setattr(article, key, value)

    article.update_date = str(datetime.now())

    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    # Create a version snapshot on explicit save
    if not auto_save:
        last_version = db_session.exec(
            select(ArticleVersion)
            .where(ArticleVersion.article_id == article.id)
            .order_by(ArticleVersion.version_number.desc())  # type: ignore[union-attr]
            .limit(1)
        ).first()

        next_version_number = (last_version.version_number + 1) if last_version else 1
        version = ArticleVersion(
            article_id=article.id,
            version_number=next_version_number,
            content=article.content or {},
            created_by_id=user_id,
            created_at=str(datetime.now()),
        )
        db_session.add(version)
        db_session.commit()

    logger.info(f"Updated article article_uuid={article_uuid} auto_save={auto_save}")
    return ArticleRead.model_validate(article)


def delete_article(article_uuid: str, user_id: int, db_session: Session) -> dict:
    """
    Delete an article and its versions (cascade handled by DB FK ON DELETE CASCADE).
    """
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{article_uuid}' not found",
        )

    _check_article_permission(user_id, article.org_id, "delete", db_session)

    db_session.delete(article)
    db_session.commit()

    logger.info(f"Deleted article article_uuid={article_uuid}")
    return {"detail": f"Article '{article_uuid}' deleted successfully"}
