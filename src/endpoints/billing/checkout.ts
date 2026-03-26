import type { Endpoint } from 'payload'
import { getOrCreateCustomer } from '../../stripe/customers'
import { createCheckoutSession } from '../../stripe/checkout'
import { getServerSideURL } from '../../utilities/getURL'
import type { User } from '../../payload-types'

export const billingCheckoutEndpoint: Endpoint = {
  path: '/billing/checkout',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json?.() as {
      tierId?: string
      interval?: 'monthly' | 'yearly'
      successUrl?: string
      cancelUrl?: string
    } | undefined

    if (!body?.tierId || !body?.interval) {
      return Response.json({ error: 'Missing required fields: tierId, interval' }, { status: 400 })
    }

    if (body.interval !== 'monthly' && body.interval !== 'yearly') {
      return Response.json({ error: 'Invalid interval. Must be "monthly" or "yearly".' }, { status: 400 })
    }

    // 3. Fetch the membership tier
    let tier: any
    try {
      tier = await req.payload.findByID({
        collection: 'membership-tiers',
        id: body.tierId,
        req,
        overrideAccess: true,
      })
    } catch {
      return Response.json({ error: 'Tier not found' }, { status: 404 })
    }

    if (!tier.isActive) {
      return Response.json({ error: 'Tier not found' }, { status: 404 })
    }

    // 4. Get the Stripe price ID
    const priceId = body.interval === 'monthly'
      ? tier.stripeMonthlyPriceId
      : tier.stripeYearlyPriceId

    if (!priceId) {
      return Response.json({ error: 'Tier has no Stripe price configured for this interval' }, { status: 400 })
    }

    // 5. Check for existing active subscription
    const existingSubs = await req.payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { status: { in: ['active', 'past_due'] } },
        ],
      },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existingSubs.totalDocs > 0) {
      return Response.json({
        error: 'You already have an active subscription. Use the Customer Portal to manage your plan.',
      }, { status: 409 })
    }

    // 6. Get or create Stripe customer
    let customer
    try {
      const user = req.user as User
      customer = await getOrCreateCustomer({
        id: String(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        stripeCustomerId: user.stripeCustomerId ?? undefined,
      })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Failed to get or create Stripe customer' })
      return Response.json(
        { error: 'Failed to initialize billing. Please try again later.' },
        { status: 502 },
      )
    }

    // Save stripeCustomerId if new
    if (!(req.user as User).stripeCustomerId) {
      await req.payload.update({
        collection: 'users',
        id: req.user.id,
        data: { stripeCustomerId: customer.id },
        req,
        overrideAccess: true,
      })
    }

    // 7. Create Checkout Session
    try {
      const baseUrl = getServerSideURL()
      const session = await createCheckoutSession({
        customerId: customer.id,
        priceId,
        successUrl: body.successUrl ?? `${baseUrl}/account/billing?success=true`,
        cancelUrl: body.cancelUrl ?? `${baseUrl}/account/billing?cancelled=true`,
        metadata: {
          userId: req.user.id as string,
          tierId: body.tierId,
        },
      })

      return Response.json({ url: session.url })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Stripe checkout session creation failed' })
      return Response.json(
        { error: err?.message || 'Failed to create checkout session' },
        { status: 502 },
      )
    }
  },
}
