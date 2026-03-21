import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests'

/*
  Billing service
  - POST  billing/checkout  — create Stripe checkout session
  - GET   billing/status    — get current billing status
  - POST  billing/cancel    — cancel subscription at period end
  - GET   billing/portal    — get Stripe customer portal URL
*/

export type BillingPeriod = 'monthly' | 'yearly'

export type BillingStatus = {
  status: 'free' | 'active' | 'cancelling' | 'past_due' | 'manual'
  tier_id?: number | null
  tier_name?: string | null
  billing_period?: BillingPeriod | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
}

export type CheckoutResponse = {
  checkout_url: string
}

export type PortalResponse = {
  portal_url: string
}

/**
 * Create a Stripe checkout session for a given tier and billing period.
 * Returns a checkout URL to redirect the user to.
 */
export async function createCheckout(
  tierId: number | string,
  billingPeriod: BillingPeriod,
  token: string
): Promise<CheckoutResponse> {
  const result = await fetch(
    `${getAPIUrl()}billing/checkout`,
    RequestBodyWithAuthHeader('POST', { tier_id: tierId, billing_period: billingPeriod }, null, token)
  )
  const res = await getResponseMetadata(result)
  if (!res.success) {
    const err: any = new Error(res.data?.detail || 'Checkout failed')
    err.status = res.status
    throw err
  }
  return res.data
}

/**
 * Get the current billing status for the authenticated user.
 * May throw with status 503 if Stripe is not configured.
 */
export async function getBillingStatus(token: string): Promise<BillingStatus> {
  const result = await fetch(
    `${getAPIUrl()}billing/status`,
    RequestBodyWithAuthHeader('GET', null, null, token)
  )
  const res = await getResponseMetadata(result)
  if (!res.success) {
    const err: any = new Error(res.data?.detail || 'Failed to get billing status')
    err.status = res.status
    throw err
  }
  return res.data
}

/**
 * Cancel the user's subscription at the end of the current billing period.
 */
export async function cancelSubscription(token: string): Promise<void> {
  const result = await fetch(
    `${getAPIUrl()}billing/cancel`,
    RequestBodyWithAuthHeader('POST', null, null, token)
  )
  const res = await getResponseMetadata(result)
  if (!res.success) {
    const err: any = new Error(res.data?.detail || 'Cancellation failed')
    err.status = res.status
    throw err
  }
}

/**
 * Get the Stripe customer portal URL for managing payment methods.
 */
export async function getPortalUrl(token: string): Promise<PortalResponse> {
  const result = await fetch(
    `${getAPIUrl()}billing/portal`,
    RequestBodyWithAuthHeader('GET', null, null, token)
  )
  const res = await getResponseMetadata(result)
  if (!res.success) {
    const err: any = new Error(res.data?.detail || 'Failed to get portal URL')
    err.status = res.status
    throw err
  }
  return res.data
}
