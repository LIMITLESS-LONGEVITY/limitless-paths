import { getStripe } from './client'
import type Stripe from 'stripe'

export async function createPortalSession(options: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()
  return stripe.billingPortal.sessions.create({
    customer: options.customerId,
    return_url: options.returnUrl,
  })
}
