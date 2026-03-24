import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import { BillingClient } from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null // Layout handles redirect

  // Fetch user's active subscription
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { in: ['active', 'past_due'] } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const subscription = subscriptions.docs[0] as any | undefined

  // Fetch current tier
  const currentTier = typeof user.tier === 'object' ? user.tier : null

  // Fetch all active tiers for tier selection
  const tiers = await payload.find({
    collection: 'membership-tiers',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 10,
  })

  return (
    <BillingClient
      subscription={subscription ? {
        id: subscription.id,
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        tierName: typeof subscription.tier === 'object' ? subscription.tier.name : '',
      } : null}
      currentTier={currentTier ? {
        name: currentTier.name,
        accessLevel: currentTier.accessLevel,
      } : { name: 'Free', accessLevel: 'free' }}
      tiers={tiers.docs.map((t: any) => ({
        id: t.id,
        name: t.name,
        accessLevel: t.accessLevel,
        monthlyPrice: t.monthlyPrice,
        yearlyPrice: t.yearlyPrice,
        features: t.features?.map((f: any) => f.feature) || [],
      }))}
      hasStripeCustomer={!!(user as any).stripeCustomerId}
      successParam={false}
      cancelledParam={false}
    />
  )
}
