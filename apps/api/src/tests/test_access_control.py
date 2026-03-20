"""
Comprehensive tests for the Access Control Service.

Covers all 12 scenarios specified in the task:
 1.  Anonymous user sees free article
 2.  Anonymous user blocked from premium article
 3.  Free tier user sees free, blocked from premium
 4.  Premium tier user sees both free and premium
 5.  Org-specific content hidden from non-member
 6.  Org member sees org-specific content
 7.  Highest wins: free tier + premium org → can see premium
 8.  Admin bypass with action_update
 9.  Non-published article denied
10.  Course reference bypass (valid course link)
11.  filter_accessible_articles works correctly
12.  get_article_access_info returns correct data
"""

import pytest
from datetime import datetime, timedelta
from sqlmodel import Session, select

from src.db.articles import Article, ArticleStatusEnum
from src.db.organizations import Organization
from src.db.users import User  # noqa: F401 — ensures 'user' table in metadata
from src.db.content_pillars import ContentPillar  # noqa: F401
from src.db.membership_tiers import MembershipTier
from src.db.user_memberships import UserMembership
from src.db.user_organizations import UserOrganization
from src.db.courses.courses import Course
from src.db.usergroup_resources import UserGroupResource
from src.db.usergroups import UserGroup
from src.db.usergroup_user import UserGroupUser
from src.db.resource_authors import ResourceAuthor, ResourceAuthorshipEnum, ResourceAuthorshipStatusEnum
from src.db.roles import Role

from src.services.access_control.access_control import (
    get_effective_access,
    can_user_access_article,
    filter_accessible_articles,
    get_article_access_info,
    _clear_default_org_cache,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_article(
    db_session: Session,
    org_id: int,
    author_id: int,
    slug: str,
    access_level: str = "free",
    status: str = ArticleStatusEnum.PUBLISHED.value,
) -> Article:
    article = Article(
        article_uuid=f"article_{slug}",
        title=slug.replace("-", " ").title(),
        slug=slug,
        status=status,
        access_level=access_level,
        org_id=org_id,
        author_id=author_id,
    )
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)
    return article


def _make_org(
    db_session: Session,
    slug: str,
    content_access_level: str = "free",
) -> Organization:
    org = Organization(
        name=slug,
        slug=slug,
        email=f"{slug}@example.com",
        org_uuid=f"org_{slug}",
        creation_date="2026-01-01",
        update_date="2026-01-01",
        content_access_level=content_access_level,
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


def _make_user(db_session: Session, username: str) -> User:
    from src.db.users import User as UserModel
    user = UserModel(
        username=username,
        first_name="Test",
        last_name="User",
        email=f"{username}@example.com",
        password="hashed",
        user_uuid=f"uuid-{username}",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_tier(
    db_session: Session,
    slug: str,
    content_access: list,
) -> MembershipTier:
    tier = MembershipTier(
        name=slug.title(),
        slug=slug,
        is_active=True,
        priority=0,
        permissions={"content_access": content_access},
    )
    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)
    return tier


def _enroll_user(
    db_session: Session,
    user_id: int,
    tier_id: int,
    expires_at: str | None = None,
) -> UserMembership:
    membership = UserMembership(
        user_id=user_id,
        tier_id=tier_id,
        status="active",
        source="manual",
        expires_at=expires_at,
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(membership)
    return membership


def _join_org(db_session: Session, user_id: int, org_id: int, role_id: int) -> UserOrganization:
    uo = UserOrganization(
        user_id=user_id,
        org_id=org_id,
        role_id=role_id,
        creation_date="2026-01-01",
    )
    db_session.add(uo)
    db_session.commit()
    return uo


def _make_role(db_session: Session, name: str, rights: dict | None = None) -> Role:
    role = Role(
        name=name,
        description=name,
        rights=rights or {},
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_org_cache():
    """Clear the default org cache before each test to avoid cross-test pollution."""
    _clear_default_org_cache()
    yield
    _clear_default_org_cache()


@pytest.fixture(name="default_org")
def default_org_fixture(db_session: Session) -> Organization:
    """Create the default org (slug='default')."""
    return _make_org(db_session, slug="default", content_access_level="free")


@pytest.fixture(name="second_org")
def second_org_fixture(db_session: Session) -> Organization:
    """Create a second org for org-specific content tests."""
    return _make_org(db_session, slug="premium-clinic", content_access_level="free")


@pytest.fixture(name="premium_org")
def premium_org_fixture(db_session: Session) -> Organization:
    """Create an org whose content_access_level is premium."""
    return _make_org(db_session, slug="premium-org", content_access_level="premium")


@pytest.fixture(name="base_role")
def base_role_fixture(db_session: Session) -> Role:
    """Create a minimal role with no special permissions."""
    return _make_role(db_session, name="member", rights={})


@pytest.fixture(name="admin_role")
def admin_role_fixture(db_session: Session) -> Role:
    """Create an admin role with action_update and action_publish."""
    rights = {
        "articles": {
            "action_create": True,
            "action_read": True,
            "action_update": True,
            "action_delete": True,
            "action_submit_review": True,
            "action_review": True,
            "action_publish": True,
        }
    }
    return _make_role(db_session, name="admin", rights=rights)


@pytest.fixture(name="free_user")
def free_user_fixture(db_session: Session, default_org: Organization, base_role: Role) -> User:
    """A user with a free membership tier."""
    user = _make_user(db_session, "freeuser")
    tier = _make_tier(db_session, slug="free-tier", content_access=["free"])
    _enroll_user(db_session, user.id, tier.id)
    _join_org(db_session, user.id, default_org.id, base_role.id)
    return user


@pytest.fixture(name="premium_user")
def premium_user_fixture(db_session: Session, default_org: Organization, base_role: Role) -> User:
    """A user with a premium membership tier."""
    user = _make_user(db_session, "premiumuser")
    tier = _make_tier(db_session, slug="premium-tier", content_access=["free", "regular", "premium"])
    _enroll_user(db_session, user.id, tier.id)
    _join_org(db_session, user.id, default_org.id, base_role.id)
    return user


@pytest.fixture(name="org_member_user")
def org_member_user_fixture(db_session: Session, second_org: Organization, base_role: Role) -> User:
    """A user who is a member of second_org (no special tier)."""
    user = _make_user(db_session, "orgmember")
    _join_org(db_session, user.id, second_org.id, base_role.id)
    return user


# ---------------------------------------------------------------------------
# 1. Anonymous user sees free article
# ---------------------------------------------------------------------------

def test_anonymous_sees_free_article(db_session: Session, default_org: Organization, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "free-intro")
    assert can_user_access_article(None, article, db_session) is True


# ---------------------------------------------------------------------------
# 2. Anonymous user blocked from premium article
# ---------------------------------------------------------------------------

def test_anonymous_blocked_from_premium_article(db_session: Session, default_org: Organization, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "premium-deep-dive", access_level="premium")
    assert can_user_access_article(None, article, db_session) is False


# ---------------------------------------------------------------------------
# 3. Free tier user sees free, blocked from premium
# ---------------------------------------------------------------------------

def test_free_user_sees_free_article(db_session: Session, default_org: Organization, free_user: User, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "free-basics")
    assert can_user_access_article(free_user.id, article, db_session) is True


def test_free_user_blocked_from_premium(db_session: Session, default_org: Organization, free_user: User, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "premium-secrets", access_level="premium")
    assert can_user_access_article(free_user.id, article, db_session) is False


# ---------------------------------------------------------------------------
# 4. Premium tier user sees both free and premium
# ---------------------------------------------------------------------------

def test_premium_user_sees_free_article(db_session: Session, default_org: Organization, premium_user: User, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "free-guide")
    assert can_user_access_article(premium_user.id, article, db_session) is True


def test_premium_user_sees_premium_article(db_session: Session, default_org: Organization, premium_user: User, test_user):
    article = _make_article(db_session, default_org.id, test_user.id, "premium-guide", access_level="premium")
    assert can_user_access_article(premium_user.id, article, db_session) is True


# ---------------------------------------------------------------------------
# 5. Org-specific content hidden from non-member
# ---------------------------------------------------------------------------

def test_org_specific_hidden_from_non_member(
    db_session: Session, default_org: Organization, second_org: Organization,
    free_user: User, test_user
):
    # Article belongs to second_org, not the default org
    article = _make_article(db_session, second_org.id, test_user.id, "second-org-article")
    # free_user is only a member of default_org, NOT second_org
    assert can_user_access_article(free_user.id, article, db_session) is False


def test_org_specific_hidden_from_anonymous(
    db_session: Session, default_org: Organization, second_org: Organization, test_user
):
    article = _make_article(db_session, second_org.id, test_user.id, "second-org-anon")
    assert can_user_access_article(None, article, db_session) is False


# ---------------------------------------------------------------------------
# 6. Org member sees org-specific content
# ---------------------------------------------------------------------------

def test_org_member_sees_org_article(
    db_session: Session, default_org: Organization, second_org: Organization,
    org_member_user: User, test_user
):
    article = _make_article(db_session, second_org.id, test_user.id, "clinic-exclusive")
    # org_member_user is in second_org and article is free-level
    assert can_user_access_article(org_member_user.id, article, db_session) is True


# ---------------------------------------------------------------------------
# 7. Highest wins: free tier user in premium org → can see premium
# ---------------------------------------------------------------------------

def test_org_level_elevates_access(
    db_session: Session, default_org: Organization, premium_org: Organization,
    base_role: Role, test_user
):
    # User has only free-tier membership but belongs to an org with premium content_access_level
    user = _make_user(db_session, "orgpremiumuser")
    free_tier = _make_tier(db_session, slug="free-only", content_access=["free"])
    _enroll_user(db_session, user.id, free_tier.id)
    _join_org(db_session, user.id, default_org.id, base_role.id)
    _join_org(db_session, user.id, premium_org.id, base_role.id)

    effective = get_effective_access(user.id, db_session)
    assert "premium" in effective

    # Now user can see a premium article in the default org
    article = _make_article(db_session, default_org.id, test_user.id, "org-elevated-premium", access_level="premium")
    assert can_user_access_article(user.id, article, db_session) is True


# ---------------------------------------------------------------------------
# 8. Admin bypass with action_update
# ---------------------------------------------------------------------------

def test_admin_bypass_with_action_update(db_session: Session, default_org: Organization, test_user):
    # Draft article — normally inaccessible
    article = _make_article(
        db_session, default_org.id, test_user.id, "admin-draft",
        access_level="enterprise",
        status=ArticleStatusEnum.DRAFT.value,
    )
    admin_perms = {"action_update": True, "action_publish": False}
    assert can_user_access_article(test_user.id, article, db_session, user_article_permissions=admin_perms) is True


def test_admin_bypass_with_action_publish(db_session: Session, default_org: Organization, test_user):
    article = _make_article(
        db_session, default_org.id, test_user.id, "admin-enterprise",
        access_level="enterprise",
        status=ArticleStatusEnum.IN_REVIEW.value,
    )
    admin_perms = {"action_update": False, "action_publish": True}
    assert can_user_access_article(test_user.id, article, db_session, user_article_permissions=admin_perms) is True


# ---------------------------------------------------------------------------
# 9. Non-published article denied
# ---------------------------------------------------------------------------

def test_draft_article_denied_for_regular_user(db_session: Session, default_org: Organization, free_user: User, test_user):
    article = _make_article(
        db_session, default_org.id, test_user.id, "still-draft",
        access_level="free",
        status=ArticleStatusEnum.DRAFT.value,
    )
    assert can_user_access_article(free_user.id, article, db_session) is False


def test_in_review_article_denied(db_session: Session, default_org: Organization, free_user: User, test_user):
    article = _make_article(
        db_session, default_org.id, test_user.id, "in-review-article",
        access_level="free",
        status=ArticleStatusEnum.IN_REVIEW.value,
    )
    assert can_user_access_article(free_user.id, article, db_session) is False


def test_archived_article_denied(db_session: Session, default_org: Organization, free_user: User, test_user):
    article = _make_article(
        db_session, default_org.id, test_user.id, "archived-article",
        access_level="free",
        status=ArticleStatusEnum.ARCHIVED.value,
    )
    assert can_user_access_article(free_user.id, article, db_session) is False


# ---------------------------------------------------------------------------
# 10. Course reference bypass (with valid course link)
# ---------------------------------------------------------------------------

@pytest.fixture(name="course_with_article")
def course_with_article_fixture(db_session: Session, default_org: Organization, test_user):
    """Create a published, public course that references a premium article."""
    article = _make_article(
        db_session, default_org.id, test_user.id, "course-premium-article",
        access_level="premium",
    )
    course = Course(
        name="Longevity Masterclass",
        description="A course",
        public=True,
        published=True,
        open_to_contributors=False,
        course_uuid="course_masterclass",
        org_id=default_org.id,
        creation_date="2026-01-01",
        update_date="2026-01-01",
        related_articles=[article.article_uuid],
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)
    return {"article": article, "course": course}


def test_course_bypass_anon_public_course(db_session: Session, course_with_article):
    article = course_with_article["article"]
    course = course_with_article["course"]
    # Anonymous user accessing premium article via public course → should be allowed
    assert can_user_access_article(
        None, article, db_session, course_uuid=course.course_uuid
    ) is True


def test_course_bypass_wrong_course_uuid(db_session: Session, default_org: Organization, test_user):
    # Premium article, no course link provided
    article = _make_article(
        db_session, default_org.id, test_user.id, "premium-no-course", access_level="premium"
    )
    assert can_user_access_article(
        None, article, db_session, course_uuid="course_nonexistent"
    ) is False


def test_course_bypass_article_not_in_course(db_session: Session, default_org: Organization, test_user):
    """Article not referenced in the course's related_articles."""
    other_article = _make_article(
        db_session, default_org.id, test_user.id, "unrelated-premium", access_level="premium"
    )
    course = Course(
        name="Different Course",
        description="No relation",
        public=True,
        published=True,
        open_to_contributors=False,
        course_uuid="course_different",
        org_id=default_org.id,
        creation_date="2026-01-01",
        update_date="2026-01-01",
        related_articles=["article_something-else"],  # does NOT include other_article
    )
    db_session.add(course)
    db_session.commit()

    assert can_user_access_article(
        None, other_article, db_session, course_uuid="course_different"
    ) is False


def test_course_bypass_private_course_non_member(
    db_session: Session, default_org: Organization, free_user: User, test_user
):
    """Private unpublished course — bypass should NOT apply for non-member."""
    article = _make_article(
        db_session, default_org.id, test_user.id, "private-course-article", access_level="premium"
    )
    course = Course(
        name="Private Course",
        description="Members only",
        public=False,
        published=False,
        open_to_contributors=False,
        course_uuid="course_private",
        org_id=default_org.id,
        creation_date="2026-01-01",
        update_date="2026-01-01",
        related_articles=[article.article_uuid],
    )
    db_session.add(course)
    db_session.commit()

    # free_user is not enrolled in the course via usergroup or authorship
    assert can_user_access_article(
        free_user.id, article, db_session, course_uuid="course_private"
    ) is False


def test_course_bypass_via_resource_author(
    db_session: Session, default_org: Organization, free_user: User, test_user
):
    """User is a resource author for the course → bypass applies."""
    article = _make_article(
        db_session, default_org.id, test_user.id, "author-bypass-article", access_level="premium"
    )
    course = Course(
        name="Author Course",
        description="For authors",
        public=False,
        published=False,
        open_to_contributors=True,
        course_uuid="course_author",
        org_id=default_org.id,
        creation_date="2026-01-01",
        update_date="2026-01-01",
        related_articles=[article.article_uuid],
    )
    db_session.add(course)
    db_session.commit()

    author = ResourceAuthor(
        resource_uuid="course_author",
        user_id=free_user.id,
        authorship=ResourceAuthorshipEnum.CREATOR,
        authorship_status=ResourceAuthorshipStatusEnum.ACTIVE,
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(author)
    db_session.commit()

    assert can_user_access_article(
        free_user.id, article, db_session, course_uuid="course_author"
    ) is True


# ---------------------------------------------------------------------------
# 11. filter_accessible_articles works correctly
# ---------------------------------------------------------------------------

def test_filter_accessible_articles(
    db_session: Session, default_org: Organization, free_user: User, test_user
):
    free_article = _make_article(db_session, default_org.id, test_user.id, "fa-free")
    premium_article = _make_article(
        db_session, default_org.id, test_user.id, "fa-premium", access_level="premium"
    )
    draft_article = _make_article(
        db_session, default_org.id, test_user.id, "fa-draft",
        status=ArticleStatusEnum.DRAFT.value,
    )

    articles = [free_article, premium_article, draft_article]
    accessible = filter_accessible_articles(articles, free_user.id, db_session)

    assert free_article in accessible
    assert premium_article not in accessible
    assert draft_article not in accessible


def test_filter_accessible_articles_admin_bypass(
    db_session: Session, default_org: Organization, test_user
):
    articles = [
        _make_article(db_session, default_org.id, test_user.id, "fa-admin-free"),
        _make_article(db_session, default_org.id, test_user.id, "fa-admin-premium", access_level="premium"),
        _make_article(
            db_session, default_org.id, test_user.id, "fa-admin-draft",
            status=ArticleStatusEnum.DRAFT.value,
        ),
    ]
    admin_perms = {"action_update": True, "action_publish": False}
    accessible = filter_accessible_articles(
        articles, test_user.id, db_session, user_article_permissions=admin_perms
    )
    # Admin bypass returns ALL articles without filtering
    assert len(accessible) == 3


def test_filter_accessible_articles_anonymous(
    db_session: Session, default_org: Organization, test_user
):
    free_art = _make_article(db_session, default_org.id, test_user.id, "fa-anon-free")
    reg_art = _make_article(
        db_session, default_org.id, test_user.id, "fa-anon-regular", access_level="regular"
    )
    accessible = filter_accessible_articles([free_art, reg_art], None, db_session)
    assert free_art in accessible
    assert reg_art not in accessible


# ---------------------------------------------------------------------------
# 12. get_article_access_info returns correct data
# ---------------------------------------------------------------------------

def test_get_article_access_info_accessible(
    db_session: Session, default_org: Organization, premium_user: User, test_user
):
    article = _make_article(
        db_session, default_org.id, test_user.id, "info-premium", access_level="premium"
    )
    info = get_article_access_info(premium_user.id, article, db_session)
    assert info["accessible"] is True
    assert info["required_level"] == "premium"
    assert "premium" in info["user_levels"]
    assert "free" in info["user_levels"]


def test_get_article_access_info_blocked(
    db_session: Session, default_org: Organization, free_user: User, test_user
):
    article = _make_article(
        db_session, default_org.id, test_user.id, "info-blocked", access_level="enterprise"
    )
    info = get_article_access_info(free_user.id, article, db_session)
    assert info["accessible"] is False
    assert info["required_level"] == "enterprise"
    assert "enterprise" not in info["user_levels"]


def test_get_article_access_info_anonymous(
    db_session: Session, default_org: Organization, test_user
):
    article = _make_article(db_session, default_org.id, test_user.id, "info-anon-free")
    info = get_article_access_info(None, article, db_session)
    assert info["accessible"] is True
    assert info["required_level"] == "free"
    assert info["user_levels"] == ["free"]


# ---------------------------------------------------------------------------
# Bonus: get_effective_access edge cases
# ---------------------------------------------------------------------------

def test_effective_access_expired_membership(
    db_session: Session, default_org: Organization, base_role: Role
):
    """Expired membership should NOT grant premium access."""
    user = _make_user(db_session, "expireduser")
    tier = _make_tier(db_session, slug="premium-expired", content_access=["free", "premium"])
    # Expired yesterday
    expired_at = (datetime.now() - timedelta(days=1)).isoformat()
    _enroll_user(db_session, user.id, tier.id, expires_at=expired_at)
    _join_org(db_session, user.id, default_org.id, base_role.id)

    effective = get_effective_access(user.id, db_session)
    assert "premium" not in effective
    assert "free" in effective  # baseline always present


def test_effective_access_future_expiry(
    db_session: Session, default_org: Organization, base_role: Role
):
    """Membership expiring in the future is still valid."""
    user = _make_user(db_session, "futureuser")
    tier = _make_tier(db_session, slug="premium-future", content_access=["free", "premium"])
    future_at = (datetime.now() + timedelta(days=30)).isoformat()
    _enroll_user(db_session, user.id, tier.id, expires_at=future_at)
    _join_org(db_session, user.id, default_org.id, base_role.id)

    effective = get_effective_access(user.id, db_session)
    assert "premium" in effective


def test_effective_access_cancelled_membership(
    db_session: Session, default_org: Organization, base_role: Role
):
    """Cancelled membership should not grant access."""
    user = _make_user(db_session, "cancelleduser")
    tier = _make_tier(db_session, slug="cancelled-tier", content_access=["free", "premium"])
    membership = UserMembership(
        user_id=user.id,
        tier_id=tier.id,
        status="cancelled",
        source="manual",
    )
    db_session.add(membership)
    db_session.commit()
    _join_org(db_session, user.id, default_org.id, base_role.id)

    effective = get_effective_access(user.id, db_session)
    assert "premium" not in effective
