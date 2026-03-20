from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, Integer, ForeignKey


class ArticleVersion(SQLModel, table=True):
    __tablename__ = "article_versions"
    id: Optional[int] = Field(default=None, primary_key=True)
    article_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("articles.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    version_number: int
    content: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_by_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id"), nullable=False)
    )
    created_at: Optional[str] = Field(
        default_factory=lambda: str(datetime.now())
    )
    notes: Optional[str] = None


class ArticleVersionRead(SQLModel):
    id: int
    article_id: int
    version_number: int
    content: Optional[dict] = None
    created_by_id: int
    created_at: Optional[str] = None
    notes: Optional[str] = None
