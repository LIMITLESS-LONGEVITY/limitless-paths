"""
Unit tests for src/services/auth/validate.py

These tests use an in-memory SQLite DB via the db_session fixture
defined in src/tests/conftest.py and mock Redis calls so they run
without a live Redis instance.
"""

from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

# Import all DB models so SQLModel.metadata is fully populated before
# the db_session fixture calls create_all on a fresh in-memory engine.
from src.db.users import User  # noqa: F401
from src.db.organizations import Organization  # noqa: F401
from src.db.roles import Role  # noqa: F401
from src.db.user_organizations import UserOrganization  # noqa: F401
from src.db.membership_tiers import MembershipTier  # noqa: F401
from src.db.user_memberships import UserMembership  # noqa: F401

# ---------------------------------------------------------------------------
# Fixtures re-used from conftest: db_session, test_user, free_tier
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# get_user_validation_data — DB query tests
# ---------------------------------------------------------------------------


class TestGetUserValidationData:
    """Tests for the DB-query function (no Redis involved)."""

    def test_returns_default_free_tier_when_no_membership(self, db_session: Session, test_user):
        """Should return default free tier when the user has no active membership."""
        from src.services.auth.validate import get_user_validation_data

        data = get_user_validation_data(test_user, db_session)

        assert data["user_id"] == test_user.id
        assert data["user_uuid"] == str(test_user.user_uuid)
        assert data["email"] == test_user.email
        assert data["name"] == f"{test_user.first_name} {test_user.last_name}".strip()
        assert data["tier"]["slug"] == "free"
        assert data["tier"]["priority"] == 0
        assert data["tier"]["permissions"] == {}
        assert data["orgs"] == []

    def test_returns_tier_data_when_active_membership_exists(
        self, db_session: Session, test_user, free_tier
    ):
        """Should return the user's active membership tier."""
        from src.db.user_memberships import UserMembership
        from src.services.auth.validate import get_user_validation_data

        membership = UserMembership(
            user_id=test_user.id,
            tier_id=free_tier.id,
            status="active",
            source="manual",
        )
        db_session.add(membership)
        db_session.commit()

        data = get_user_validation_data(test_user, db_session)

        assert data["tier"]["slug"] == "free"
        assert data["tier"]["priority"] == 0
        assert isinstance(data["tier"]["permissions"], dict)

    def test_ignores_expired_membership(self, db_session: Session, test_user, free_tier):
        """Expired memberships should not be used — default free tier applies."""
        from src.db.user_memberships import UserMembership
        from src.services.auth.validate import get_user_validation_data

        membership = UserMembership(
            user_id=test_user.id,
            tier_id=free_tier.id,
            status="expired",
            source="manual",
        )
        db_session.add(membership)
        db_session.commit()

        data = get_user_validation_data(test_user, db_session)

        # Expired membership → should fall back to default
        assert data["tier"]["slug"] == "free"
        assert data["tier"]["priority"] == 0

    def test_name_strips_whitespace_when_last_name_missing(self, db_session: Session):
        """Name field should be stripped even if last_name is empty."""
        from src.db.users import User
        from src.services.auth.validate import get_user_validation_data

        user = User(
            username="noname",
            first_name="Solo",
            last_name="",
            email="solo@example.com",
            password="hashed",
            user_uuid="solo-uuid-5678",
            creation_date="2026-01-01",
            update_date="2026-01-01",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        data = get_user_validation_data(user, db_session)
        assert data["name"] == "Solo"

    def test_orgs_empty_when_user_has_no_org_memberships(
        self, db_session: Session, test_user
    ):
        """orgs list should be empty when user belongs to no organisations."""
        from src.services.auth.validate import get_user_validation_data

        data = get_user_validation_data(test_user, db_session)
        assert data["orgs"] == []


# ---------------------------------------------------------------------------
# Redis blacklist helpers — unit tests with mocked Redis
# ---------------------------------------------------------------------------


class TestBlacklist:
    """Tests for is_user_blacklisted / blacklist_user."""

    def test_is_user_blacklisted_returns_false_when_not_blacklisted(self):
        mock_redis = MagicMock()
        mock_redis.exists.return_value = 0

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import is_user_blacklisted

            assert is_user_blacklisted(42) is False
            mock_redis.exists.assert_called_once_with("blacklist:user:42")

    def test_is_user_blacklisted_returns_true_when_blacklisted(self):
        mock_redis = MagicMock()
        mock_redis.exists.return_value = 1

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import is_user_blacklisted

            assert is_user_blacklisted(42) is True

    def test_is_user_blacklisted_fails_open_on_redis_error(self):
        """Should return False (not block) when Redis is unavailable."""
        with patch(
            "src.services.auth.validate.get_redis_connection",
            side_effect=Exception("Redis down"),
        ):
            from src.services.auth.validate import is_user_blacklisted

            # Should NOT raise; should return False (fail open)
            assert is_user_blacklisted(99) is False

    def test_blacklist_user_calls_setex(self):
        mock_redis = MagicMock()

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import blacklist_user

            blacklist_user(7, ttl=3600)
            mock_redis.setex.assert_called_once_with("blacklist:user:7", 3600, "1")


# ---------------------------------------------------------------------------
# Redis cache helpers — unit tests with mocked Redis
# ---------------------------------------------------------------------------


class TestValidationCache:
    """Tests for get_cached_validation / cache_validation / invalidate_user_cache."""

    def test_get_cached_validation_returns_none_on_miss(self):
        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import get_cached_validation

            result = get_cached_validation(1, "abc123")
            assert result is None

    def test_get_cached_validation_returns_dict_on_hit(self):
        import json

        payload = {"user_id": 1, "tier": {"slug": "free"}}
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps(payload).encode()

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import get_cached_validation

            result = get_cached_validation(1, "abc123")
            assert result == payload

    def test_cache_validation_stores_json(self):
        import json

        mock_redis = MagicMock()

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import cache_validation, CACHE_TTL

            data = {"user_id": 5, "tier": {"slug": "pro"}}
            cache_validation(5, "xxxxxxxsignature", data)

            args = mock_redis.setex.call_args[0]
            # args: (key, ttl, value)
            assert args[1] == CACHE_TTL
            assert json.loads(args[2]) == data

    def test_invalidate_user_cache_scans_and_deletes(self):
        mock_redis = MagicMock()
        # Simulate scan returning one batch of keys then cursor=0
        mock_redis.scan.return_value = (0, [b"validate:3:aabbccdd", b"validate:3:eeff1122"])

        with patch(
            "src.services.auth.validate.get_redis_connection", return_value=mock_redis
        ):
            from src.services.auth.validate import invalidate_user_cache

            invalidate_user_cache(3)

            mock_redis.scan.assert_called_once_with(0, match="validate:3:*", count=100)
            mock_redis.delete.assert_called_once_with(
                b"validate:3:aabbccdd", b"validate:3:eeff1122"
            )
