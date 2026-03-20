import pytest
from sqlmodel import Session, select
from src.db.user_memberships import UserMembership
from src.db.membership_tiers import MembershipTier
from src.db.users import User


def test_create_user_membership(db_session: Session, test_user: User, free_tier: MembershipTier):
    membership = UserMembership(
        user_id=test_user.id,
        tier_id=free_tier.id,
        status="active",
        source="manual",
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(membership)

    assert membership.id is not None
    assert membership.status == "active"
    assert membership.source == "manual"


def test_only_one_active_membership_per_user(
    db_session: Session, test_user: User, free_tier: MembershipTier
):
    m1 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add(m1)
    db_session.commit()

    m2 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add(m2)
    with pytest.raises(Exception):  # IntegrityError from partial unique index
        db_session.commit()


def test_expired_memberships_allowed(
    db_session: Session, test_user: User, free_tier: MembershipTier
):
    m1 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="expired", source="manual")
    m2 = UserMembership(user_id=test_user.id, tier_id=free_tier.id, status="active", source="manual")
    db_session.add_all([m1, m2])
    db_session.commit()

    results = db_session.exec(
        select(UserMembership).where(UserMembership.user_id == test_user.id)
    ).all()
    assert len(results) == 2
    active = [m for m in results if m.status == "active"]
    assert len(active) == 1
