"""
Billing router — Stripe checkout, status, cancellation, portal, and webhooks.

Authenticated endpoints require a valid user session.
The /webhook endpoint uses Stripe signature verification instead of JWT auth.
"""

import logging
from typing import Union

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.core.events.database import get_db_session
from src.db.billing import StripeSubscriptionRead
from src.db.membership_tiers import MembershipTier
from src.db.users import AnonymousUser, APITokenUser, PublicUser
from src.security.auth import get_authenticated_user
from src.services.billing.billing import (
    cancel_subscription,
    create_checkout_session,
    create_portal_session,
    get_billing_status,
)
from src.services.billing.webhooks import (
    handle_checkout_completed,
    handle_payment_failed,
    handle_subscription_deleted,
    handle_subscription_updated,
)
from src.services.security.rate_limiting import check_rate_limit, get_redis_connection

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    tier_id: int
    billing_period: str = "monthly"  # "monthly" | "yearly"
    success_url: str = ""
    cancel_url: str = ""


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


# ---------------------------------------------------------------------------
# Rate-limit helper
# ---------------------------------------------------------------------------

def _check_checkout_rate_limit(user_id: int) -> None:
    """5 checkout requests per minute per user."""
    try:
        r = get_redis_connection()
        is_allowed, _count, retry_after = check_rate_limit(
            key=f"billing_checkout:{user_id}",
            max_attempts=5,
            window_seconds=60,
            r=r,
        )
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many checkout requests. Please wait before trying again.",
                headers={"Retry-After": str(retry_after)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable — allow the request through rather than blocking users
        logger.warning("Rate limit check failed (Redis unavailable?): %s", exc)


# ---------------------------------------------------------------------------
# POST /billing/checkout
# ---------------------------------------------------------------------------

@router.post("/checkout", response_model=CheckoutResponse, status_code=200)
async def api_create_checkout(
    body: CheckoutRequest,
    current_user: Union[PublicUser, APITokenUser] = Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout session for the requested tier and billing period.
    Returns a checkout_url to redirect the user to.
    """
    _check_checkout_rate_limit(current_user.id)  # type: ignore[union-attr]

    tier = db_session.exec(
        select(MembershipTier).where(MembershipTier.id == body.tier_id)
    ).first()

    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership tier not found",
        )

    config = get_learnhouse_config()
    frontend_domain = config.hosting_config.frontend_domain
    success_url = body.success_url or f"https://{frontend_domain}/billing/success"
    cancel_url = body.cancel_url or f"https://{frontend_domain}/billing/cancel"

    checkout_url = create_checkout_session(
        user=current_user,  # type: ignore[arg-type]
        tier=tier,
        billing_period=body.billing_period,
        success_url=success_url,
        cancel_url=cancel_url,
        db_session=db_session,
    )

    return CheckoutResponse(checkout_url=checkout_url)


# ---------------------------------------------------------------------------
# GET /billing/status
# ---------------------------------------------------------------------------

@router.get("/status", status_code=200)
async def api_get_billing_status(
    current_user: Union[PublicUser, APITokenUser] = Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """Return the current billing / subscription state for the authenticated user."""
    return get_billing_status(current_user.id, db_session)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# POST /billing/cancel
# ---------------------------------------------------------------------------

@router.post("/cancel", response_model=StripeSubscriptionRead, status_code=200)
async def api_cancel_subscription(
    current_user: Union[PublicUser, APITokenUser] = Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> StripeSubscriptionRead:
    """Cancel the authenticated user's subscription at period end."""
    return cancel_subscription(current_user.id, db_session)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# GET /billing/portal
# ---------------------------------------------------------------------------

@router.get("/portal", response_model=PortalResponse, status_code=200)
async def api_get_portal(
    current_user: Union[PublicUser, APITokenUser] = Depends(get_authenticated_user),
    db_session: Session = Depends(get_db_session),
) -> PortalResponse:
    """Create and return a Stripe Billing Portal session URL."""
    config = get_learnhouse_config()
    frontend_domain = config.hosting_config.frontend_domain
    return_url = f"https://{frontend_domain}/account/billing"

    portal_url = create_portal_session(
        user_id=current_user.id,  # type: ignore[union-attr]
        return_url=return_url,
        db_session=db_session,
    )
    return PortalResponse(portal_url=portal_url)


# ---------------------------------------------------------------------------
# POST /billing/webhook  — no JWT auth, uses Stripe signature verification
# ---------------------------------------------------------------------------

@router.post("/webhook", status_code=200)
async def stripe_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    Receive Stripe webhook events and dispatch to appropriate handlers.

    Uses Stripe signature verification — no JWT auth required.
    """
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    config = get_learnhouse_config()
    secret = config.payments_config.stripe.stripe_webhook_standard_secret

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook secret not configured",
        )

    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload",
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    handlers = {
        "checkout.session.completed": handle_checkout_completed,
        "customer.subscription.deleted": handle_subscription_deleted,
        "invoice.payment_failed": handle_payment_failed,
        "customer.subscription.updated": handle_subscription_updated,
    }

    handler = handlers.get(event.type)  # type: ignore[attr-defined]
    if handler:
        try:
            handler(event, db_session)
        except Exception as exc:
            logger.error("Webhook handler error for event %s: %s", event.type, exc)  # type: ignore[attr-defined]
            # Return 200 to prevent Stripe from retrying unrecoverable errors
            return {"status": "error", "detail": str(exc)}

    return {"status": "ok"}
