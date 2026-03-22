"""
Access Control Service for Limitless Longevity LearnHouse.

Determines whether a user can access a given article based on:
 - Their membership tier's content_access permissions
 - Their organization's content_access_level
 - Admin bypass (action_update or action_publish role permissions)
 - Whether the article is PUBLISHED
 - Org-specific content rules (non-default org requires membership)
 - Course reference bypass (article linked to a course the user can access)
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from src.db.articles import Article, ArticleStatusEnum
from src.db.organizations import Organization
from src.db.user_memberships import UserMembership
from src.db.membership_tiers import MembershipTier
from src.db.user_organizations import UserOrganization
from src.db.courses.courses import Course
from src.db.usergroup_resources import UserGroupResource
from src.db.usergroup_user import UserGroupUser
from src.db.resource_authors import ResourceAuthor, ResourceAuthorshipStatusEnum

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default org cache (module-level, reset per test via _default_org_cache)
# ---------------------------------------------------------------------------

_default_org_cache: Optional[Organization] = None


def _get_default_org(db_session: Session) -> Optional[Organization]:
    """Return the Organization with slug='default', cached at module level."""
    global _default_org_cache
    if _default_org_cache is not None:
        return _default_org_cache
    org = db_session.exec(
        select(Organization).where(Organization.slug == "default")
    ).first()
    if org is not None:
        _default_org_cache = org
    return org


def _clear_default_org_cache() -> None:
    """Reset the default org cache. Useful in tests."""
    global _default_org_cache
    _default_org_cache = None


# ---------------------------------------------------------------------------
# Helper: expires_at check
# ---------------------------------------------------------------------------

def _membership_is_active(membership: UserMembership) -> bool:
    """Return True if the membership status is 'active' and not expired."""
    if membership.status != "active":
        return False
    if membership.expires_at is None:
        return True
    try:
        expiry = datetime.fromisoformat(membership.expires_at)
        return expiry > datetime.now()
    except (ValueError, TypeError):
        return True  # unparseable expiry — assume still valid


# ---------------------------------------------------------------------------
# Core: get_effective_access
# ---------------------------------------------------------------------------

def get_effective_access(user_id: Optional[int], db_session: Session) -> set[str]:
    """
    Return the set of access levels the user is entitled to.

    - Anonymous (user_id=None) → {"free"}
    - Active membership tier's permissions.content_access list
    - The user's org content_access_level for each org they belong to
    - Always includes "free" as a baseline
    """
    levels: set[str] = {"free"}

    if user_id is None:
        return levels

    # 1. Membership tier permissions
    memberships = db_session.exec(
        select(UserMembership).where(UserMembership.user_id == user_id)
    ).all()

    for membership in memberships:
        if not _membership_is_active(membership):
            continue
        tier = db_session.get(MembershipTier, membership.tier_id)
        if tier is None:
            continue
        permissions = tier.permissions or {}
        content_access = permissions.get("content_access", [])
        if isinstance(content_access, list):
            for level in content_access:
                levels.add(str(level))
        elif isinstance(content_access, str):
            levels.add(content_access)

    # 2. Org content_access_level for all orgs the user belongs to
    user_org_rows = db_session.exec(
        select(UserOrganization).where(UserOrganization.user_id == user_id)
    ).all()

    for uo in user_org_rows:
        org = db_session.get(Organization, uo.org_id)
        if org is not None and org.content_access_level:
            levels.add(org.content_access_level)

    return levels


# ---------------------------------------------------------------------------
# Core: can_user_access_article
# ---------------------------------------------------------------------------

def can_user_access_article(
    user_id: Optional[int],
    article: Article,
    db_session: Session,
    user_article_permissions: Optional[dict] = None,
    course_uuid: Optional[str] = None,
) -> bool:
    """
    Return True if the user may read the given article.

    Decision tree:
    1. Admin bypass — any role with action_update or action_publish → True
    1b. Creator bypass — article author can always access their own articles
    2. Published check — article must be PUBLISHED
    3. Org-specific check — non-default org → user must be org member
    4. Course reference bypass — article linked to course user can access
    5. Effective access — article.access_level in user's effective levels
    """

    # 1. Admin bypass
    if user_article_permissions is not None:
        if user_article_permissions.get("action_update") or user_article_permissions.get("action_publish"):
            return True

    # 1b. Creator bypass — authors can always access their own articles (drafts, in-review, etc.)
    if user_id is not None and article.author_id == user_id:
        return True

    # 2. Published check
    if article.status != ArticleStatusEnum.PUBLISHED.value:
        return False

    # 3. Org-specific check
    default_org = _get_default_org(db_session)
    default_org_id = default_org.id if default_org else None

    if default_org_id is not None and article.org_id != default_org_id:
        # Article belongs to a non-default org — user must be a member
        if user_id is None:
            return False
        membership_in_org = db_session.exec(
            select(UserOrganization).where(
                UserOrganization.user_id == user_id,
                UserOrganization.org_id == article.org_id,
            )
        ).first()
        if membership_in_org is None:
            return False

    # 4. Course reference bypass
    if course_uuid is not None:
        if _user_can_access_via_course(user_id, article, course_uuid, db_session):
            return True

    # 5. Effective access level check
    effective = get_effective_access(user_id, db_session)
    return article.access_level in effective


# ---------------------------------------------------------------------------
# Course reference bypass helper
# ---------------------------------------------------------------------------

def _user_can_access_via_course(
    user_id: Optional[int],
    article: Article,
    course_uuid: str,
    db_session: Session,
) -> bool:
    """
    Return True if:
    - The course exists with course_uuid
    - The article's article_uuid is listed in course.related_articles
    - The user has access to the course (public+published, or usergroup member, or resource author)
    """
    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()

    if course is None:
        return False

    # Check article is in course's related_articles
    related = course.related_articles or []
    if isinstance(related, dict):
        # Might be stored as {"items": [...]} — handle gracefully
        related = related.get("items", []) or related.get("articles", [])
    if article.article_uuid not in related:
        return False

    # Check user can access the course
    if course.public and course.published:
        return True

    if user_id is None:
        return False

    # Check usergroup access to course
    ug_access = db_session.exec(
        select(UserGroupResource)
        .join(UserGroupUser, UserGroupUser.usergroup_id == UserGroupResource.usergroup_id)
        .where(
            UserGroupUser.user_id == user_id,
            UserGroupResource.resource_uuid == course_uuid,
        )
    ).first()
    if ug_access is not None:
        return True

    # Check if user is a resource author for the course
    author_record = db_session.exec(
        select(ResourceAuthor).where(
            ResourceAuthor.resource_uuid == course_uuid,
            ResourceAuthor.user_id == user_id,
            ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
        )
    ).first()
    if author_record is not None:
        return True

    return False


# ---------------------------------------------------------------------------
# Batch filter
# ---------------------------------------------------------------------------

def filter_accessible_articles(
    articles: list[Article],
    user_id: Optional[int],
    db_session: Session,
    user_article_permissions: Optional[dict] = None,
) -> list[Article]:
    """
    Filter a list of articles to those accessible by the user.

    Computes effective access once and reuses it for the entire list.
    Admin bypass and course reference bypass are NOT applied here —
    this is a bulk list filter for anonymous/authenticated listing.
    """
    effective = get_effective_access(user_id, db_session)
    default_org = _get_default_org(db_session)
    default_org_id = default_org.id if default_org else None

    # Admin bypass: if user has edit/publish rights, skip access_level filter
    if user_article_permissions and (
        user_article_permissions.get("action_update")
        or user_article_permissions.get("action_publish")
    ):
        return list(articles)

    result = []
    for article in articles:
        # Must be published
        if article.status != ArticleStatusEnum.PUBLISHED.value:
            continue

        # Org-specific check
        if default_org_id is not None and article.org_id != default_org_id:
            if user_id is None:
                continue
            membership_in_org = db_session.exec(
                select(UserOrganization).where(
                    UserOrganization.user_id == user_id,
                    UserOrganization.org_id == article.org_id,
                )
            ).first()
            if membership_in_org is None:
                continue

        # Access level check
        if article.access_level in effective:
            result.append(article)

    return result


# ---------------------------------------------------------------------------
# Info helper
# ---------------------------------------------------------------------------

def get_article_access_info(
    user_id: Optional[int],
    article: Article,
    db_session: Session,
) -> dict:
    """
    Return a dict describing access state for the article.

    Returns:
        {
            "accessible": bool,
            "required_level": str,       # article.access_level
            "user_levels": list[str],    # sorted list of effective access levels
        }
    """
    effective = get_effective_access(user_id, db_session)
    accessible = can_user_access_article(user_id, article, db_session)
    return {
        "accessible": accessible,
        "required_level": article.access_level,
        "user_levels": sorted(effective),
    }
