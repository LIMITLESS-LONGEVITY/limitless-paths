"""
ContentPillar CRUD service functions.

Superadmin enforcement is handled at the router layer.
Public GET endpoints have no auth; authenticated endpoints
check the caller's identity at the router level.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.db.content_pillars import (
    ContentPillar,
    ContentPillarCreate,
    ContentPillarRead,
    ContentPillarUpdate,
)
from src.db.articles import Article, ArticleRead
from src.db.courses.courses import Course

logger = logging.getLogger(__name__)


def create_pillar(data: ContentPillarCreate, db_session: Session) -> ContentPillarRead:
    """Create a new content pillar. Raises 409 if slug already exists."""
    existing = db_session.exec(
        select(ContentPillar).where(ContentPillar.slug == data.slug)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A pillar with slug '{data.slug}' already exists",
        )

    pillar = ContentPillar(
        name=data.name,
        slug=data.slug,
        description=data.description,
        icon=data.icon,
        display_order=data.display_order,
        is_active=data.is_active,
        org_id=data.org_id,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(pillar)
    db_session.commit()
    db_session.refresh(pillar)

    logger.info(f"Created pillar id={pillar.id} slug={pillar.slug}")
    return ContentPillarRead.model_validate(pillar)


def get_all_pillars(
    db_session: Session,
    org_id: Optional[int] = None,
) -> list[ContentPillarRead]:
    """
    List active pillars.

    If org_id is provided, return platform-wide pillars (org_id IS NULL)
    plus org-specific pillars for that org, ordered by display_order.
    If org_id is not provided, return all platform-wide active pillars.
    """
    stmt = select(ContentPillar).where(ContentPillar.is_active == True)

    if org_id is not None:
        stmt = stmt.where(
            (ContentPillar.org_id == None) | (ContentPillar.org_id == org_id)
        )
    else:
        stmt = stmt.where(ContentPillar.org_id == None)

    stmt = stmt.order_by(ContentPillar.display_order)
    pillars = db_session.exec(stmt).all()
    return [ContentPillarRead.model_validate(p) for p in pillars]


def get_pillar_by_id(pillar_id: int, db_session: Session) -> ContentPillarRead:
    """Return a single pillar or raise 404."""
    pillar = db_session.exec(
        select(ContentPillar).where(ContentPillar.id == pillar_id)
    ).first()

    if not pillar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pillar {pillar_id} not found",
        )

    return ContentPillarRead.model_validate(pillar)


def update_pillar(
    pillar_id: int, data: ContentPillarUpdate, db_session: Session
) -> ContentPillarRead:
    """Partially update a pillar. Raises 409 if new slug conflicts."""
    pillar = db_session.exec(
        select(ContentPillar).where(ContentPillar.id == pillar_id)
    ).first()

    if not pillar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pillar {pillar_id} not found",
        )

    # Slug uniqueness check when slug is changing
    if data.slug is not None and data.slug != pillar.slug:
        existing = db_session.exec(
            select(ContentPillar).where(ContentPillar.slug == data.slug)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A pillar with slug '{data.slug}' already exists",
            )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pillar, key, value)

    pillar.update_date = str(datetime.now())

    db_session.add(pillar)
    db_session.commit()
    db_session.refresh(pillar)

    logger.info(f"Updated pillar id={pillar_id}")
    return ContentPillarRead.model_validate(pillar)


def delete_pillar(pillar_id: int, db_session: Session) -> dict:
    """
    Delete a pillar. Raises 409 if articles or courses reference it.
    """
    pillar = db_session.exec(
        select(ContentPillar).where(ContentPillar.id == pillar_id)
    ).first()

    if not pillar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pillar {pillar_id} not found",
        )

    # Check for linked articles
    linked_article = db_session.exec(
        select(Article).where(Article.pillar_id == pillar_id).limit(1)
    ).first()
    if linked_article:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete pillar: articles are linked to it",
        )

    # Check for linked courses
    linked_course = db_session.exec(
        select(Course).where(Course.pillar_id == pillar_id).limit(1)
    ).first()
    if linked_course:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete pillar: courses are linked to it",
        )

    db_session.delete(pillar)
    db_session.commit()

    logger.info(f"Deleted pillar id={pillar_id}")
    return {"detail": f"Pillar {pillar_id} deleted successfully"}


def get_pillar_content(pillar_id: int, db_session: Session) -> dict:
    """
    Return all articles and courses tagged with this pillar.

    Returns: {"articles": [...], "courses": [...]}
    """
    # Verify pillar exists
    pillar = db_session.exec(
        select(ContentPillar).where(ContentPillar.id == pillar_id)
    ).first()

    if not pillar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pillar {pillar_id} not found",
        )

    articles = db_session.exec(
        select(Article).where(Article.pillar_id == pillar_id)
    ).all()

    courses = db_session.exec(
        select(Course).where(Course.pillar_id == pillar_id)
    ).all()

    # Return simplified course dicts (CourseRead requires authors to be pre-populated)
    course_dicts = [
        {
            "id": c.id,
            "course_uuid": c.course_uuid,
            "name": c.name,
            "description": c.description,
            "org_id": c.org_id,
            "public": c.public,
            "published": c.published,
            "pillar_id": c.pillar_id,
            "creation_date": c.creation_date,
            "update_date": c.update_date,
        }
        for c in courses
    ]

    return {
        "articles": [ArticleRead.model_validate(a) for a in articles],
        "courses": course_dicts,
    }
