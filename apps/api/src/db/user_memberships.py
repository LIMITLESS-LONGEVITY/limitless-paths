from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


ALLOWED_SOURCES = ["manual", "payment", "promotion", "system"]
ALLOWED_STATUSES = ["active", "expired", "cancelled"]


class UserMembershipBase(SQLModel):
    user_id: int = Field(foreign_key="user.id", index=True)
    tier_id: int = Field(foreign_key="membership_tiers.id")
    status: str = Field(default="active")  # active | expired | cancelled
    source: str = Field(default="manual")  # manual | payment | promotion | system
    started_at: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    expires_at: Optional[str] = None
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")


class UserMembership(UserMembershipBase, table=True):
    __tablename__ = "user_memberships"
    # NOTE: Partial unique index (one active per user) is defined in Alembic migration only.
    # SQLModel/SQLAlchemy UniqueConstraint does not support PostgreSQL WHERE clauses.
    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class UserMembershipCreate(SQLModel):
    user_id: int
    tier_id: int
    source: str = "manual"
    expires_at: Optional[str] = None


class UserMembershipRead(UserMembershipBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class UserMembershipUpdate(SQLModel):
    status: Optional[str] = None
    tier_id: Optional[int] = None
    expires_at: Optional[str] = None
    updated_by: Optional[int] = None
