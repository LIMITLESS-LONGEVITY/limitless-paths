import sys
import os

# Ensure src/ is on the Python path for all tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Set testing environment variable to use SQLite
os.environ["TESTING"] = "true"

# Set a valid JWT secret key for tests (must be at least 32 characters)
os.environ["LEARNHOUSE_AUTH_JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests-32chars!"

import pytest
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.dialects.postgresql import JSONB


# ---------------------------------------------------------------------------
# SQLite compatibility: treat JSONB as JSON
# SQLite does not have a JSONB type; map it to plain JSON for unit tests.
# ---------------------------------------------------------------------------
def _visit_JSONB(self, type_, **kw):  # noqa: N802
    return "JSON"

SQLiteTypeCompiler.visit_JSONB = _visit_JSONB


def _create_partial_indexes(connection, **kwargs):
    """Create SQLite partial unique indexes that mirror PostgreSQL constraints."""
    connection.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_one_active_membership_per_user "
            "ON user_memberships (user_id) WHERE status = 'active'"
        )
    )


@pytest.fixture(name="db_session")
def db_session_fixture():
    """Provide an in-memory SQLite session for unit tests that need DB access."""
    engine = create_engine(
        "sqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Register listener to create partial indexes after tables are created
    event.listen(engine, "connect", lambda conn, rec: None)  # ensure event system active

    SQLModel.metadata.create_all(engine)

    # Create partial unique index on user_memberships for SQLite
    with engine.connect() as conn:
        # Only run if the table exists (it will if UserMembership model was imported)
        tables = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='user_memberships'")
        ).fetchall()
        if tables:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_one_active_membership_per_user "
                    "ON user_memberships (user_id) WHERE status = 'active'"
                )
            )
            conn.commit()

    # Create partial unique indexes on content_pillars for SQLite
    # (mirrors PostgreSQL partial indexes for platform-wide and org-scoped slug uniqueness)
    with engine.connect() as conn:
        tables = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='content_pillars'")
        ).fetchall()
        if tables:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_content_pillars_slug_platform "
                    "ON content_pillars (slug) WHERE org_id IS NULL"
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_content_pillars_slug_per_org "
                    "ON content_pillars (slug, org_id) WHERE org_id IS NOT NULL"
                )
            )
            conn.commit()

    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="test_user")
def test_user_fixture(db_session: Session):
    """Create a minimal User record for tests."""
    from src.db.users import User
    user = User(
        username="testuser",
        first_name="Test",
        last_name="User",
        email="testuser@example.com",
        password="hashed_password",
        user_uuid="test-uuid-1234",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="free_tier")
def free_tier_fixture(db_session: Session):
    """Create a free MembershipTier for tests."""
    from src.db.membership_tiers import MembershipTier
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
    return tier
