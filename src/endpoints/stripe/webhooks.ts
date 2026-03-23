import type { Endpoint } from 'payload'
import { getStripe } from '../../stripe/client'
import {
  findTierByStripePrice,
  syncUserTier,
  downgradeToFree,
  matchPriceToInterval,
} from '../../hooks/syncUserTier'

export const stripeWebhookEndpoint: Endpoint = {
  path: '/stripe/webhooks',
  method: 'post',
  handler: async (req) => {
    const stripe = getStripe()

    // 1. Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
    }

    let event
    try {
      const rawBody = await req.text?.()
      if (!rawBody) {
        return Response.json({ error: 'Empty request body' }, { status: 400 })
      }
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', (err as Error).message)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 2. Idempotency check
    const existing = await req.payload.find({
      collection: 'stripe-events',
      where: { stripeEventId: { equals: event.id } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.totalDocs > 0) {
      return Response.json({ received: true, duplicate: true })
    }

    // 3. Process event
    let processed = true
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as any, req)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as any, req)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as any, req)
          break
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as any, req)
          break
        default:
          // Unhandled event type — ignore
          break
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error processing ${event.type}:`, (err as Error).message)
      processed = false
    }

    // 4. Log event for idempotency
    try {
      await req.payload.create({
        collection: 'stripe-events',
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          processed,
        },
        overrideAccess: true,
        req,
      })
    } catch (err) {
      console.error('[Stripe Webhook] Failed to log event:', (err as Error).message)
    }

    // Always return 200 to Stripe
    return Response.json({ received: true })
  },
}

/**
 * Handle checkout.session.completed
 * Creates subscription record and upgrades user tier.
 */
async function handleCheckoutCompleted(session: any, req: any): Promise<void> {
  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId

  if (!userId || !tierId) {
    console.error('[Stripe Webhook] checkout.session.completed missing metadata')
    return
  }

  const stripe = getStripe()

  // Fetch the Stripe subscription for billing details
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const priceId = stripeSubscription.items.data[0]?.price?.id
  const interval = stripeSubscription.items.data[0]?.plan?.interval

  // Find the tier to determine billing interval
  const tier = await req.payload.findByID({
    collection: 'membership-tiers',
    id: tierId,
    req,
    overrideAccess: true,
  })

  const billingInterval =
    matchPriceToInterval(tier, priceId ?? '') ?? (interval === 'year' ? 'yearly' : 'monthly')

  // Create subscription record
  await req.payload.create({
    collection: 'subscriptions',
    data: {
      user: userId,
      tier: tierId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: session.customer as string,
      status: 'active',
      billingInterval,
      currentPeriodStart: new Date(
        stripeSubscription.current_period_start * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    overrideAccess: true,
    req,
  })

  // Upgrade user tier
  await syncUserTier(req.payload, req, userId, tierId)

  // Update any pending enrollments for this user's courses to 'paid'
  const pendingEnrollments = await req.payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { user: { equals: userId } },
        { paymentStatus: { equals: 'pending' } },
      ],
    },
    overrideAccess: true,
    req,
  })

  for (const enrollment of pendingEnrollments.docs) {
    await req.payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { paymentStatus: 'paid' },
      overrideAccess: true,
      req,
    })
  }

  // Update stripeCustomerId on user if not set
  const user = await req.payload.findByID({
    collection: 'users',
    id: userId,
    req,
    overrideAccess: true,
  })

  if (!user.stripeCustomerId) {
    await req.payload.update({
      collection: 'users',
      id: userId,
      data: { stripeCustomerId: session.customer as string },
      req,
      overrideAccess: true,
    })
  }
}

/**
 * Handle customer.subscription.updated
 * Syncs subscription status and handles plan changes.
 */
async function handleSubscriptionUpdated(subscription: any, req: any): Promise<void> {
  // Find local subscription
  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscription.id } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  const localSub = localSubs.docs[0]

  // Map Stripe status to our status
  let status = localSub.status
  if (subscription.status === 'active') status = 'active'
  else if (subscription.status === 'past_due') status = 'past_due'
  else if (subscription.status === 'canceled') status = 'cancelled'

  // Sync subscription data
  await req.payload.update({
    collection: 'subscriptions',
    id: localSub.id,
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    overrideAccess: true,
    req,
  })

  // Check for plan change — if the price changed, update the user's tier
  const newPriceId = subscription.items?.data?.[0]?.price?.id
  if (newPriceId) {
    const newTier = await findTierByStripePrice(req.payload, req, newPriceId)
    if (newTier) {
      const currentTierId = typeof localSub.tier === 'string' ? localSub.tier : localSub.tier?.id
      if (newTier.id !== currentTierId) {
        // Plan changed — update subscription tier and user tier
        await req.payload.update({
          collection: 'subscriptions',
          id: localSub.id,
          data: { tier: newTier.id },
          overrideAccess: true,
          req,
        })
        const userId = typeof localSub.user === 'string' ? localSub.user : localSub.user?.id
        if (userId) {
          await syncUserTier(req.payload, req, userId, newTier.id)
        }
      }
    }
  }
}

/**
 * Handle customer.subscription.deleted
 * Downgrades user to free tier.
 */
async function handleSubscriptionDeleted(subscription: any, req: any): Promise<void> {
  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscription.id } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  const localSub = localSubs.docs[0]

  // Mark subscription as cancelled
  await req.payload.update({
    collection: 'subscriptions',
    id: localSub.id,
    data: { status: 'cancelled' },
    overrideAccess: true,
    req,
  })

  // Downgrade user to free tier
  const userId = typeof localSub.user === 'string' ? localSub.user : localSub.user?.id
  if (userId) {
    await downgradeToFree(req.payload, req, userId)
  }
}

/**
 * Handle invoice.payment_failed
 * Marks subscription as past_due.
 */
async function handlePaymentFailed(invoice: any, req: any): Promise<void> {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const localSubs = await req.payload.find({
    collection: 'subscriptions',
    where: { stripeSubscriptionId: { equals: subscriptionId } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (localSubs.totalDocs === 0) return

  await req.payload.update({
    collection: 'subscriptions',
    id: localSubs.docs[0].id,
    data: { status: 'past_due' },
    overrideAccess: true,
    req,
  })
}
