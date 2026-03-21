"""
Stripe webhook event handlers.

All handlers are idempotent — they check for existing records before creating
new ones to safely handle Stripe's at-least-once delivery guarantee.
"""

import logging
from datetime import datetime

import stripe
from sqlmodel import Session, select

from src.db.billing import StripeSubscription
from src.db.membership_tiers import MembershipTier
from src.db.user_memberships import UserMembershipCreate
from src.services.membership_tiers.user_memberships import (
    assign_tier_to_user,
    auto_assign_free_tier,
)

logger = logging.getLogger(__name__)

# System user ID used when billing system modifies memberships
_SYSTEM_USER_ID = 0


# ---------------------------------------------------------------------------
# checkout.session.completed
# ---------------------------------------------------------------------------

def handle_checkout_completed(event: stripe.Event, db_session: Session) -> None:
    """
    On successful checkout:
    1. Create / update StripeSubscription record.
    2. Upgrade the user's membership tier.
    """
    session_obj = event.data.object  # type: ignore[attr-defined]

    stripe_subscription_id: str = session_obj.get("subscription")
    if not stripe_subscription_id:
        logger.warning("checkout.session.completed: no subscription id in event %s", event.id)
        return

    # Retrieve full subscription to get metadata and period dates
    stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
    metadata: dict = stripe_sub.get("metadata", {})

    user_id_str = metadata.get("user_id")
    tier_id_str = metadata.get("tier_id")
    billing_period: str = metadata.get("billing_period", "monthly")

    if not user_id_str or not tier_id_str:
        logger.error(
            "checkout.session.completed: missing metadata in subscription %s",
            stripe_subscription_id,
        )
        return

    user_id = int(user_id_str)
    tier_id = int(tier_id_str)

    # Idempotency: skip if subscription record already exists
    existing = db_session.exec(
        select(StripeSubscription).where(
            StripeSubscription.stripe_subscription_id == stripe_subscription_id
        )
    ).first()

    if not existing:
        current_period = stripe_sub.get("current_period_start"), stripe_sub.get("current_period_end")
        record = StripeSubscription(
            user_id=user_id,
            tier_id=tier_id,
            stripe_subscription_id=stripe_subscription_id,
            status=stripe_sub.get("status", "active"),
            billing_period=billing_period,
            current_period_start=str(datetime.fromtimestamp(current_period[0])) if current_period[0] else None,
            current_period_end=str(datetime.fromtimestamp(current_period[1])) if current_period[1] else None,
            cancel_at_period_end=bool(stripe_sub.get("cancel_at_period_end", False)),
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(record)
        db_session.commit()
        logger.info(
            "Created StripeSubscription for user_id=%s tier_id=%s sub=%s",
            user_id,
            tier_id,
            stripe_subscription_id,
        )
    else:
        logger.info(
            "StripeSubscription %s already exists — skipping create (idempotent)",
            stripe_subscription_id,
        )

    # Upgrade membership tier (assign_tier_to_user handles idempotency via status transitions)
    try:
        assign_tier_to_user(
            data=UserMembershipCreate(
                user_id=user_id,
                tier_id=tier_id,
                source="payment",
            ),
            assigned_by=_SYSTEM_USER_ID,
            db_session=db_session,
        )
        logger.info("Upgraded membership for user_id=%s to tier_id=%s", user_id, tier_id)
    except Exception as exc:
        logger.error("Failed to assign membership for user_id=%s: %s", user_id, exc)


# ---------------------------------------------------------------------------
# customer.subscription.deleted
# ---------------------------------------------------------------------------

def handle_subscription_deleted(event: stripe.Event, db_session: Session) -> None:
    """
    On subscription cancellation:
    1. Mark StripeSubscription as cancelled.
    2. Auto-assign the free tier.
    """
    stripe_sub = event.data.object  # type: ignore[attr-defined]
    stripe_subscription_id: str = stripe_sub.get("id", "")
    metadata: dict = stripe_sub.get("metadata", {})

    user_id_str = metadata.get("user_id")
    if not user_id_str:
        logger.error(
            "customer.subscription.deleted: no user_id in metadata for sub %s",
            stripe_subscription_id,
        )
        return

    user_id = int(user_id_str)

    record = db_session.exec(
        select(StripeSubscription).where(
            StripeSubscription.stripe_subscription_id == stripe_subscription_id
        )
    ).first()

    if record:
        record.status = "cancelled"
        record.update_date = str(datetime.now())
        db_session.add(record)
        db_session.commit()
        logger.info("Marked subscription %s as cancelled for user_id=%s", stripe_subscription_id, user_id)
    else:
        logger.warning(
            "customer.subscription.deleted: no local record found for sub %s",
            stripe_subscription_id,
        )

    # Downgrade to free tier
    try:
        auto_assign_free_tier(user_id, db_session)
        logger.info("Auto-assigned free tier for user_id=%s after subscription cancellation", user_id)
    except Exception as exc:
        logger.error("Failed to auto-assign free tier for user_id=%s: %s", user_id, exc)


# ---------------------------------------------------------------------------
# invoice.payment_failed
# ---------------------------------------------------------------------------

def handle_payment_failed(event: stripe.Event, db_session: Session) -> None:
    """
    On payment failure, mark the related subscription as past_due.
    """
    invoice = event.data.object  # type: ignore[attr-defined]
    stripe_subscription_id: str = invoice.get("subscription", "")

    if not stripe_subscription_id:
        logger.warning("invoice.payment_failed: no subscription id in event %s", event.id)
        return

    record = db_session.exec(
        select(StripeSubscription).where(
            StripeSubscription.stripe_subscription_id == stripe_subscription_id
        )
    ).first()

    if record:
        record.status = "past_due"
        record.update_date = str(datetime.now())
        db_session.add(record)
        db_session.commit()
        logger.info("Marked subscription %s as past_due", stripe_subscription_id)
    else:
        logger.warning(
            "invoice.payment_failed: no local record found for sub %s",
            stripe_subscription_id,
        )


# ---------------------------------------------------------------------------
# customer.subscription.updated
# ---------------------------------------------------------------------------

def handle_subscription_updated(event: stripe.Event, db_session: Session) -> None:
    """
    On subscription update, sync period dates and cancel_at_period_end flag.
    """
    stripe_sub = event.data.object  # type: ignore[attr-defined]
    stripe_subscription_id: str = stripe_sub.get("id", "")

    record = db_session.exec(
        select(StripeSubscription).where(
            StripeSubscription.stripe_subscription_id == stripe_subscription_id
        )
    ).first()

    if not record:
        logger.warning(
            "customer.subscription.updated: no local record found for sub %s",
            stripe_subscription_id,
        )
        return

    period_start = stripe_sub.get("current_period_start")
    period_end = stripe_sub.get("current_period_end")

    record.current_period_start = (
        str(datetime.fromtimestamp(period_start)) if period_start else record.current_period_start
    )
    record.current_period_end = (
        str(datetime.fromtimestamp(period_end)) if period_end else record.current_period_end
    )
    record.cancel_at_period_end = bool(stripe_sub.get("cancel_at_period_end", False))
    record.status = stripe_sub.get("status", record.status)
    record.update_date = str(datetime.now())

    db_session.add(record)
    db_session.commit()
    logger.info("Updated subscription record for %s", stripe_subscription_id)
