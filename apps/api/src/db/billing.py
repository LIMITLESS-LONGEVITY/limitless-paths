"""
Billing database models for Stripe integration.

Tables:
- StripeCustomer: maps LearnHouse users to Stripe customer IDs
- StripeSubscription: tracks active subscription state
- StripePayment: records payment intents / one-off charges
"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# StripeCustomer
# ---------------------------------------------------------------------------

class StripeCustomerBase(SQLModel):
    user_id: int = Field(unique=True, index=True, foreign_key="user.id")
    stripe_customer_id: str = Field(unique=True, index=True)


class StripeCustomer(StripeCustomerBase, table=True):
    __tablename__ = "stripe_customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class StripeCustomerRead(StripeCustomerBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


# ---------------------------------------------------------------------------
# StripeSubscription
# ---------------------------------------------------------------------------

class StripeSubscriptionBase(SQLModel):
    user_id: int = Field(index=True, foreign_key="user.id")
    tier_id: int = Field(foreign_key="membership_tiers.id")
    stripe_subscription_id: str = Field(unique=True, index=True)
    status: str = Field(default="active")          # active | cancelled | past_due | incomplete
    billing_period: str = Field(default="monthly")  # monthly | yearly
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = Field(default=False)


class StripeSubscription(StripeSubscriptionBase, table=True):
    __tablename__ = "stripe_subscriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class StripeSubscriptionRead(StripeSubscriptionBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None


# ---------------------------------------------------------------------------
# StripePayment
# ---------------------------------------------------------------------------

class StripePaymentBase(SQLModel):
    user_id: int = Field(index=True, foreign_key="user.id")
    stripe_payment_intent_id: str = Field(unique=True, index=True)
    product_type: str                # e.g. "subscription", "one_time"
    product_reference: Optional[str] = None   # e.g. subscription ID or tier slug
    amount_cents: int
    currency: str = Field(default="usd")
    status: str = Field(default="pending")    # pending | succeeded | failed


class StripePayment(StripePaymentBase, table=True):
    __tablename__ = "stripe_payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    creation_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))
    update_date: Optional[str] = Field(default_factory=lambda: str(datetime.now()))


class StripePaymentRead(StripePaymentBase):
    id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None
