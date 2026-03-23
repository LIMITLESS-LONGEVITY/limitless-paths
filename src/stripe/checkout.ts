import { getStripe } from './client'
import type Stripe from 'stripe'

export interface CheckoutOptions {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata: { userId: string; tierId: string }
}

export async function createCheckoutSession(options: CheckoutOptions): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: 'subscription',
    line_items: [{ price: options.priceId, quantity: 1 }],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
    subscription_data: { metadata: options.metadata },
  })
}
