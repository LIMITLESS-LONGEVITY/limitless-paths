import type { Payload, PayloadRequest } from 'payload'

export function matchPriceToInterval(
  tier: { stripeMonthlyPriceId?: string | null; stripeYearlyPriceId?: string | null },
  priceId: string,
): 'monthly' | 'yearly' | null {
  if (tier.stripeMonthlyPriceId === priceId) return 'monthly'
  if (tier.stripeYearlyPriceId === priceId) return 'yearly'
  return null
}

export async function findTierByStripePrice(
  payload: Payload,
  req: PayloadRequest,
  priceId: string,
): Promise<any | null> {
  const monthlyMatch = await payload.find({
    collection: 'membership-tiers',
    where: { stripeMonthlyPriceId: { equals: priceId } },
    limit: 1,
    req,
  })
  if (monthlyMatch.totalDocs > 0) return monthlyMatch.docs[0]

  const yearlyMatch = await payload.find({
    collection: 'membership-tiers',
    where: { stripeYearlyPriceId: { equals: priceId } },
    limit: 1,
    req,
  })
  if (yearlyMatch.totalDocs > 0) return yearlyMatch.docs[0]

  return null
}

export async function syncUserTier(
  payload: Payload,
  req: PayloadRequest,
  userId: string,
  tierId: string,
): Promise<void> {
  await payload.update({
    collection: 'users',
    id: userId,
    data: { tier: tierId },
    req,
  })
}

export async function downgradeToFree(
  payload: Payload,
  req: PayloadRequest,
  userId: string,
): Promise<void> {
  const freeTier = await payload.find({
    collection: 'membership-tiers',
    where: { accessLevel: { equals: 'free' } },
    limit: 1,
    req,
  })

  if (freeTier.totalDocs > 0) {
    await payload.update({
      collection: 'users',
      id: userId,
      data: { tier: freeTier.docs[0].id },
      req,
    })
  }
}
