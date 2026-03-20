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
from sqlalchemy.pool import StaticPool


@pytest.fixture(name="db_session")
def db_session_fixture():
    """Provide an in-memory SQLite session for unit tests that need DB access."""
    engine = create_engine(
        "sqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)
