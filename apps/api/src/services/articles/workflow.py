"""
Editorial workflow state machine for articles.

State transitions:
  DRAFT      --submit-->  IN_REVIEW
  IN_REVIEW  --approve--> APPROVED
  IN_REVIEW  --reject-->  DRAFT
  APPROVED   --publish--> PUBLISHED
  APPROVED   --revise-->  DRAFT
  PUBLISHED  --archive--> ARCHIVED
  ARCHIVED   --reopen-->  DRAFT

Version snapshots are created on every successful transition.
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.db.articles import Article, ArticleRead
from src.db.article_versions import ArticleVersion, ArticleVersionRead

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State machine definition
# ---------------------------------------------------------------------------

# {current_status: {action: (target_status, required_permission_field)}}
TRANSITIONS: dict[str, dict[str, tuple[str, str]]] = {
    "DRAFT": {
        "submit": ("IN_REVIEW", "action_submit_review"),
    },
    "IN_REVIEW": {
        "approve": ("APPROVED", "action_review"),
        "reject": ("DRAFT", "action_review"),
    },
    "APPROVED": {
        "publish": ("PUBLISHED", "action_publish"),
        "revise": ("DRAFT", "action_publish"),
    },
    "PUBLISHED": {
        "archive": ("ARCHIVED", "action_publish"),
    },
    "ARCHIVED": {
        "reopen": ("DRAFT", "action_publish"),
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _next_version_number(article_id: int, db_session: Session) -> int:
    """Return the next version number for an article (max + 1, or 1 if no versions)."""
    max_version = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article_id)
        .order_by(ArticleVersion.version_number.desc())  # type: ignore[union-attr]
    ).first()
    return (max_version.version_number + 1) if max_version else 1


# ---------------------------------------------------------------------------
# Transition
# ---------------------------------------------------------------------------

def transition_article(
    article_uuid: str,
    action: str,
    user,          # PublicUser / User — must have .id attribute
    user_rights: dict,   # ArticlePermissions dict from _get_article_rights()
    db_session: Session,
    review_notes: Optional[str] = None,
) -> ArticleRead:
    """
    Execute an editorial state transition on an article.

    Args:
        article_uuid: UUID of the article to transition.
        action: One of submit | approve | reject | publish | revise | archive | reopen.
        user: Authenticated user object (must have `.id`).
        user_rights: Dict of article permissions for the user, e.g.
            {"action_submit_review": True, "action_review": False, ...}
        db_session: Active SQLModel session.
        review_notes: Required when action == "reject".

    Returns:
        ArticleRead of the updated article.

    Raises:
        HTTPException 404 if article not found.
        HTTPException 400 if transition is invalid or review_notes missing on reject.
        HTTPException 403 if the user lacks the required permission or is not the author.
    """
    # 1. Fetch article
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # 2. Validate transition
    allowed_actions = TRANSITIONS.get(article.status, {})
    if action not in allowed_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot '{action}' an article with status '{article.status}'",
        )

    target_status, permission_field = allowed_actions[action]

    # 3. Permission check
    if not user_rights.get(permission_field, False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {permission_field}",
        )

    # 4. Action-specific validation
    if action == "submit":
        # Author can always submit their own draft; otherwise requires action_update
        if article.author_id != user.id and not user_rights.get("action_update", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author (or a user with articles.update) can submit for review",
            )

    if action == "reject":
        if not review_notes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="review_notes is required when rejecting an article",
            )
        article.review_notes = review_notes

    if action == "approve":
        article.reviewer_id = user.id
        article.review_date = str(datetime.now())

    if action == "publish":
        article.published_at = str(datetime.now())

    # 5. Update status
    old_status = article.status
    article.status = target_status
    article.update_date = str(datetime.now())

    # 6. Create version snapshot
    new_version_number = _next_version_number(article.id, db_session)
    version = ArticleVersion(
        article_id=article.id,
        version_number=new_version_number,
        content=article.content or {},
        created_by_id=user.id,
        created_at=str(datetime.now()),
        notes=f"Status transition: {old_status} → {target_status} (action: {action})",
    )
    db_session.add(version)

    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)

    logger.info(
        f"Article {article_uuid} transitioned {old_status} → {target_status} "
        f"by user_id={user.id} via action={action}"
    )
    return ArticleRead.model_validate(article)


# ---------------------------------------------------------------------------
# Version history
# ---------------------------------------------------------------------------

def get_article_versions(
    article_uuid: str,
    db_session: Session,
    page: int = 1,
    limit: int = 20,
) -> List[ArticleVersionRead]:
    """
    List version history for an article, newest first.

    Args:
        article_uuid: UUID of the article.
        db_session: Active SQLModel session.
        page: 1-based page number.
        limit: Items per page (max 100).

    Returns:
        List[ArticleVersionRead] ordered by version_number descending.

    Raises:
        HTTPException 404 if article not found.
    """
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    versions = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article.id)
        .order_by(ArticleVersion.version_number.desc())  # type: ignore[union-attr]
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return [ArticleVersionRead.model_validate(v) for v in versions]


def restore_article_version(
    article_uuid: str,
    version_number: int,
    user_id: int,
    db_session: Session,
) -> ArticleRead:
    """
    Restore an article to a previous version's content.

    Creates a new version with the old content so the restore is auditable.

    Args:
        article_uuid: UUID of the article.
        version_number: The version number to restore from.
        user_id: ID of the user performing the restore.
        db_session: Active SQLModel session.

    Returns:
        ArticleRead of the updated article.

    Raises:
        HTTPException 404 if article or version not found.
    """
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    old_version = db_session.exec(
        select(ArticleVersion)
        .where(ArticleVersion.article_id == article.id)
        .where(ArticleVersion.version_number == version_number)
    ).first()
    if not old_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} not found for this article",
        )

    new_version_number = _next_version_number(article.id, db_session)

    # Create a new version with the restored content
    new_version = ArticleVersion(
        article_id=article.id,
        version_number=new_version_number,
        content=old_version.content,
        created_by_id=user_id,
        created_at=str(datetime.now()),
        notes=f"Restored from version {version_number}",
    )
    db_session.add(new_version)

    # Apply the old content to the article
    article.content = old_version.content
    article.update_date = str(datetime.now())
    db_session.add(article)

    db_session.commit()
    db_session.refresh(article)

    logger.info(
        f"Article {article_uuid} content restored to version {version_number} "
        f"by user_id={user_id} (new version: {new_version_number})"
    )
    return ArticleRead.model_validate(article)
