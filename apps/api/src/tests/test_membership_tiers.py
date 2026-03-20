import pytest
from sqlmodel import Session, select
from src.db.membership_tiers import MembershipTier, MembershipTierCreate


def test_create_membership_tier(db_session: Session):
    tier = MembershipTier(
        name="Free",
        slug="free",
        description="Basic free access",
        is_active=True,
        priority=0,
        permissions={"content_access": ["free"], "features": [], "max_courses": None},
    )
    db_session.add(tier)
    db_session.commit()
    db_session.refresh(tier)

    assert tier.id is not None
    assert tier.slug == "free"
    assert tier.permissions["content_access"] == ["free"]


def test_tier_slug_unique(db_session: Session):
    tier1 = MembershipTier(name="Free", slug="free", is_active=True, priority=0, permissions={})
    db_session.add(tier1)
    db_session.commit()

    tier2 = MembershipTier(name="Free 2", slug="free", is_active=True, priority=0, permissions={})
    db_session.add(tier2)
    with pytest.raises(Exception):  # IntegrityError
        db_session.commit()


def test_tier_create_schema():
    create = MembershipTierCreate(
        name="Premium",
        slug="premium",
        description="Full access",
        priority=10,
        permissions={"content_access": ["free", "premium"], "features": ["ai_tutor"], "max_courses": None},
    )
    assert create.slug == "premium"
    assert create.priority == 10
