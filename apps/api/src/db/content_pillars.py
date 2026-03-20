from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Integer, ForeignKey


class ContentPillarBase(SQLModel):
    name: str
    slug: str = Field(index=True)
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    org_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("organization.id"), nullable=True),
    )


class ContentPillar(ContentPillarBase, table=True):
    __tablename__ = "content_pillars"
    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class ContentPillarCreate(ContentPillarBase):
    pass


class ContentPillarRead(ContentPillarBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class ContentPillarUpdate(SQLModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
