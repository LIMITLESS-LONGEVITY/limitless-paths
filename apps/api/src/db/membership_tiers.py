from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


class MembershipTierBase(SQLModel):
    name: str
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    priority: int = Field(default=0)
    permissions: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # Stripe integration fields
    stripe_product_id: Optional[str] = None
    stripe_price_monthly_id: Optional[str] = None
    stripe_price_yearly_id: Optional[str] = None
    price_monthly_display: Optional[str] = None
    price_yearly_display: Optional[str] = None


class MembershipTier(MembershipTierBase, table=True):
    __tablename__ = "membership_tiers"
    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class MembershipTierCreate(MembershipTierBase):
    pass


class MembershipTierRead(MembershipTierBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


class MembershipTierUpdate(SQLModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    permissions: Optional[dict] = None
    # Stripe integration fields
    stripe_product_id: Optional[str] = None
    stripe_price_monthly_id: Optional[str] = None
    stripe_price_yearly_id: Optional[str] = None
    price_monthly_display: Optional[str] = None
    price_yearly_display: Optional[str] = None
