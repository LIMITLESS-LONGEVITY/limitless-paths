from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, Integer, ForeignKey, UniqueConstraint


class ArticleStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class ArticleBase(SQLModel):
    title: str
    slug: str
    summary: Optional[str] = None
    content: Optional[dict] = Field(default_factory=dict, sa_column=Column(JSON))
    featured_image: Optional[str] = None
    status: str = Field(default=ArticleStatusEnum.DRAFT.value)
    access_level: str = Field(default="free")
    pillar_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("content_pillars.id"), nullable=True),
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id"), nullable=False)
    )
    author_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id"), nullable=False)
    )
    reviewer_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id"), nullable=True),
    )
    review_date: Optional[str] = None
    review_notes: Optional[str] = None
    published_at: Optional[str] = None
    related_courses: Optional[dict] = Field(
        default_factory=list, sa_column=Column(JSON)
    )


class Article(ArticleBase, table=True):
    __tablename__ = "articles"
    __table_args__ = (
        UniqueConstraint("slug", "org_id", name="uq_article_slug_per_org"),
    )
    id: Optional[int] = Field(default=None, primary_key=True)
    article_uuid: str = Field(unique=True, index=True)
    creation_date: Optional[str] = Field(
        default_factory=lambda: str(datetime.now())
    )
    update_date: Optional[str] = Field(
        default_factory=lambda: str(datetime.now())
    )


class ArticleCreate(SQLModel):
    """Input schema — article_uuid is server-generated, status defaults to DRAFT."""

    title: str
    slug: Optional[str] = None  # Auto-generated from title if not provided
    summary: Optional[str] = None
    content: Optional[dict] = None
    featured_image: Optional[str] = None
    pillar_id: Optional[int] = None
    related_courses: Optional[list] = None


class ArticleRead(SQLModel):
    """Output schema — includes all fields."""

    id: int
    article_uuid: str
    title: str
    slug: str
    summary: Optional[str] = None
    content: Optional[dict] = None
    featured_image: Optional[str] = None
    status: str
    access_level: str = "free"
    pillar_id: Optional[int] = None
    org_id: int
    author_id: int
    reviewer_id: Optional[int] = None
    review_date: Optional[str] = None
    review_notes: Optional[str] = None
    published_at: Optional[str] = None
    related_courses: Optional[list] = None
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class ArticleListItem(ArticleRead):
    """ArticleRead extended with a lock flag for list endpoints."""

    locked: bool = False


class ArticleUpdate(SQLModel):
    """Partial update — status NOT updatable here (use workflow endpoints)."""

    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[dict] = None
    featured_image: Optional[str] = None
    pillar_id: Optional[int] = None
    related_courses: Optional[list] = None
    access_level: Optional[str] = None
