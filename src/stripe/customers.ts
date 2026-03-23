import { getStripe } from './client'
import type Stripe from 'stripe'

export async function getOrCreateCustomer(user: {
  id: string
  email: string
  firstName?: string
  lastName?: string
  stripeCustomerId?: string | null
}): Promise<Stripe.Customer> {
  const stripe = getStripe()

  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId)
      if (!existing.deleted) return existing as Stripe.Customer
    } catch {}
  }

  return stripe.customers.create({
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    metadata: { payloadUserId: user.id },
  })
}
