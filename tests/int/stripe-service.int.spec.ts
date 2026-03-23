// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStripe, clearStripeClient } from '@/stripe/client'

describe('Stripe client', () => {
  beforeEach(() => {
    clearStripeClient()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key_for_testing')
  })

  describe('getStripe', () => {
    it('returns a Stripe instance', () => {
      const stripe = getStripe()
      expect(stripe).toBeDefined()
      expect(typeof stripe.customers).toBe('object')
    })

    it('returns the same instance on subsequent calls', () => {
      const a = getStripe()
      const b = getStripe()
      expect(a).toBe(b)
    })

    it('throws if STRIPE_SECRET_KEY is not set', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not configured')
    })
  })
})
