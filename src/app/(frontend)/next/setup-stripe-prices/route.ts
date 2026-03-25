import { getPayload } from 'payload'
import config from '@payload-config'
import { getStripe } from '@/stripe/client'

// TEMPORARY ENDPOINT — remove after Stripe prices are created
const SETUP_TOKEN = 'stripe-setup-2026-03-25-qR7xNp3K'

const TIER_PRICES: Record<string, { monthly: number; yearly: number }> = {
  Regular: { monthly: 999, yearly: 9999 },   // $9.99/mo, $99.99/yr (in cents)
  Premium: { monthly: 2999, yearly: 29999 },  // $29.99/mo, $299.99/yr
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)

  if (!body?.token || body.token !== SETUP_TOKEN) {
    return new Response('Forbidden.', { status: 403 })
  }

  const stripe = getStripe()
  const payload = await getPayload({ config })

  const results: Array<{ tier: string; status: string; productId?: string; monthlyPriceId?: string; yearlyPriceId?: string }> = []

  const { docs: tiers } = await payload.find({
    collection: 'membership-tiers',
    limit: 10,
    overrideAccess: true,
  })

  for (const tier of tiers) {
    const prices = TIER_PRICES[tier.name as string]
    if (!prices) {
      results.push({ tier: tier.name as string, status: 'skipped (no prices defined)' })
      continue
    }

    try {
      // Create or reuse Stripe product
      let productId = (tier as any).stripeProductId as string | undefined
      if (!productId) {
        const product = await stripe.products.create({
          name: `PATHS ${tier.name} Plan`,
          description: `${tier.name} membership tier for PATHS by LIMITLESS`,
        })
        productId = product.id
      }

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: prices.monthly,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { tier: tier.name as string, interval: 'monthly' },
      })

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: prices.yearly,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { tier: tier.name as string, interval: 'yearly' },
      })

      // Update tier record
      await payload.update({
        collection: 'membership-tiers',
        id: tier.id,
        data: {
          stripeProductId: productId,
          stripeMonthlyPriceId: monthlyPrice.id,
          stripeYearlyPriceId: yearlyPrice.id,
        },
        overrideAccess: true,
      })

      results.push({
        tier: tier.name as string,
        status: 'created',
        productId,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      })
    } catch (err: any) {
      results.push({ tier: tier.name as string, status: `error: ${err.message}` })
    }
  }

  return Response.json({ success: true, results })
}
