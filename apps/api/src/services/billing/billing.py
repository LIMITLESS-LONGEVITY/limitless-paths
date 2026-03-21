"""
Billing service — Stripe checkout, portal, subscription management.

All functions raise HTTPException(503) when Stripe is not configured so that
callers receive a clear error rather than a crash.
"""

import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import HTTPException, status
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.billing import (
    StripeCustomer,
    StripeCustomerRead,
    StripeSubscription,
    StripeSubscriptionRead,
)
from src.db.membership_tiers import MembershipTier
from src.db.users import PublicUser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_stripe_key() -> str:
    """Return the Stripe secret key or raise 503 if not configured."""
    config = get_learnhouse_config()
    key = config.payments_config.stripe.stripe_secret_key
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe not configured",
        )
    return key


def _configure_stripe() -> None:
    """Set stripe.api_key from config."""
    stripe.api_key = _get_stripe_key()


# ---------------------------------------------------------------------------
# Customer management
# ---------------------------------------------------------------------------

def get_or_create_stripe_customer(
    user: PublicUser,
    db_session: Session,
) -> StripeCustomer:
    """
    Return the existing StripeCustomer record for a user, or create one in
    Stripe and persist locally.
    """
    _configure_stripe()

    existing = db_session.exec(
        select(StripeCustomer).where(StripeCustomer.user_id == user.id)
    ).first()

    if existing:
        return existing

    # Create in Stripe
    stripe_customer = stripe.Customer.create(
        email=user.email,
        name=getattr(user, "first_name", None) or user.username,
        metadata={"user_id": str(user.id)},
    )

    record = StripeCustomer(
        user_id=user.id,
        stripe_customer_id=stripe_customer.id,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)

    logger.info(
        "Created Stripe customer %s for user_id=%s",
        stripe_customer.id,
        user.id,
    )
    return record


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

def create_checkout_session(
    user: PublicUser,
    tier: MembershipTier,
    billing_period: str,  # "monthly" | "yearly"
    success_url: str,
    cancel_url: str,
    db_session: Session,
) -> str:
    """
    Create a Stripe Checkout session and return its URL.

    Raises HTTPException(400) when the tier has no Stripe price configured for
    the requested billing period.
    """
    _configure_stripe()

    # Resolve the correct price ID
    if billing_period == "yearly":
        price_id = tier.stripe_price_yearly_id
    else:
        price_id = tier.stripe_price_monthly_id

    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tier '{tier.slug}' has no Stripe price configured for '{billing_period}' billing",
        )

    customer_record = get_or_create_stripe_customer(user, db_session)

    session = stripe.checkout.Session.create(
        customer=customer_record.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        subscription_data={
            "metadata": {
                "tier_id": str(tier.id),
                "user_id": str(user.id),
                "billing_period": billing_period,
            }
        },
    )

    logger.info(
        "Created checkout session %s for user_id=%s tier=%s period=%s",
        session.id,
        user.id,
        tier.slug,
        billing_period,
    )
    return session.url  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Billing status
# ---------------------------------------------------------------------------

def get_billing_status(user_id: int, db_session: Session) -> dict:
    """
    Return the current billing state for a user.

    Returns a dict with keys: has_subscription, subscription, tier.
    """
    subscription = db_session.exec(
        select(StripeSubscription)
        .where(StripeSubscription.user_id == user_id)
        .where(StripeSubscription.status.in_(["active", "past_due"]))  # type: ignore[union-attr]
    ).first()

    if not subscription:
        return {"has_subscription": False, "subscription": None, "tier": None}

    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == subscription.tier_id)
    ).first()

    return {
        "has_subscription": True,
        "subscription": StripeSubscriptionRead.model_validate(subscription),
        "tier": tier,
    }


# ---------------------------------------------------------------------------
# Cancel subscription
# ---------------------------------------------------------------------------

def cancel_subscription(user_id: int, db_session: Session) -> StripeSubscriptionRead:
    """
    Cancel the user's active subscription at period end.

    Raises HTTPException(404) if no active subscription is found.
    """
    _configure_stripe()

    subscription = db_session.exec(
        select(StripeSubscription)
        .where(StripeSubscription.user_id == user_id)
        .where(StripeSubscription.status.in_(["active", "past_due"]))  # type: ignore[union-attr]
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    stripe.Subscription.modify(
        subscription.stripe_subscription_id,
        cancel_at_period_end=True,
    )

    subscription.cancel_at_period_end = True
    subscription.update_date = str(datetime.now())
    db_session.add(subscription)
    db_session.commit()
    db_session.refresh(subscription)

    logger.info(
        "Marked subscription %s cancel_at_period_end for user_id=%s",
        subscription.stripe_subscription_id,
        user_id,
    )
    return StripeSubscriptionRead.model_validate(subscription)


# ---------------------------------------------------------------------------
# Billing portal
# ---------------------------------------------------------------------------

def create_portal_session(user_id: int, return_url: str, db_session: Session) -> str:
    """
    Create a Stripe Billing Portal session and return its URL.

    Raises HTTPException(404) if the user has no Stripe customer record.
    """
    _configure_stripe()

    customer = db_session.exec(
        select(StripeCustomer).where(StripeCustomer.user_id == user_id)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Stripe customer record found for this user",
        )

    portal_session = stripe.billing_portal.Session.create(
        customer=customer.stripe_customer_id,
        return_url=return_url,
    )

    return portal_session.url  # type: ignore[return-value]
