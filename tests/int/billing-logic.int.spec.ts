import { describe, it, expect } from 'vitest'
import { matchPriceToInterval } from '@/hooks/syncUserTier'

describe('Billing logic', () => {
  describe('matchPriceToInterval', () => {
    it('returns monthly when price matches monthly ID', () => {
      const tier = { stripeMonthlyPriceId: 'price_monthly_123', stripeYearlyPriceId: 'price_yearly_456' }
      expect(matchPriceToInterval(tier, 'price_monthly_123')).toBe('monthly')
    })

    it('returns yearly when price matches yearly ID', () => {
      const tier = { stripeMonthlyPriceId: 'price_monthly_123', stripeYearlyPriceId: 'price_yearly_456' }
      expect(matchPriceToInterval(tier, 'price_yearly_456')).toBe('yearly')
    })

    it('returns null when price matches neither', () => {
      const tier = { stripeMonthlyPriceId: 'price_monthly_123', stripeYearlyPriceId: 'price_yearly_456' }
      expect(matchPriceToInterval(tier, 'price_unknown')).toBeNull()
    })

    it('handles missing price IDs', () => {
      expect(matchPriceToInterval({}, 'price_123')).toBeNull()
    })
  })
})
