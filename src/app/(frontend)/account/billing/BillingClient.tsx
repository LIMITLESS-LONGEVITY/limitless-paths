'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { useSearchParams } from 'next/navigation'
import { Check, CreditCard, AlertTriangle } from 'lucide-react'

type Subscription = {
  id: string
  status: string
  billingInterval: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  tierName: string
}

type Tier = {
  id: string
  name: string
  accessLevel: string
  monthlyPrice?: number | null
  yearlyPrice?: number | null
  features: string[]
}

export const BillingClient: React.FC<{
  subscription: Subscription | null
  currentTier: { name: string; accessLevel: string }
  tiers: Tier[]
  hasStripeCustomer: boolean
  successParam: boolean
  cancelledParam: boolean
}> = ({ subscription, currentTier, tiers, hasStripeCustomer }) => {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const cancelled = searchParams.get('cancelled') === 'true'
  const [loading, setLoading] = useState<string | null>(null)

  const handleManageSubscription = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {} finally { setLoading(null) }
  }

  const handleSubscribe = async (tierId: string, interval: 'monthly' | 'yearly') => {
    setLoading(`${tierId}-${interval}`)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, interval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {} finally { setLoading(null) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Billing</h2>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
          Subscription activated successfully!
        </div>
      )}
      {cancelled && (
        <div className="p-4 bg-brand-glass-bg rounded-lg text-sm text-brand-silver">
          Checkout was cancelled. No changes were made.
        </div>
      )}

      {/* Current subscription */}
      <div className="p-5 border border-brand-glass-border rounded-xl">
        <p className="text-sm text-brand-silver mb-1">Current plan</p>
        <p className="text-xl font-bold">{subscription ? subscription.tierName : currentTier.name}</p>

        {subscription && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-brand-silver">
              {subscription.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'} billing
              {subscription.currentPeriodEnd && (
                <> &middot; Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 text-brand-gold">
                <AlertTriangle className="w-4 h-4" />
                Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
            {subscription.status === 'past_due' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Payment failed. Please update your payment method.
              </div>
            )}
          </div>
        )}

        {subscription && (
          <button
            onClick={handleManageSubscription}
            disabled={loading === 'portal'}
            className={cn(
              'mt-4 flex items-center gap-2 px-4 py-2 bg-brand-glass-bg rounded-lg text-sm hover:bg-brand-glass-bg-hover transition-colors',
              loading === 'portal' && 'opacity-50 cursor-not-allowed',
            )}
          >
            <CreditCard className="w-4 h-4" />
            {loading === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Tier selection (only when no active subscription) */}
      {!subscription && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Choose a plan</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers
              .filter((t) => t.accessLevel !== 'free')
              .map((tier) => (
                <div key={tier.id} className="p-5 border border-brand-glass-border rounded-xl">
                  <h4 className="font-semibold mb-1">{tier.name}</h4>
                  <div className="text-sm text-brand-silver mb-3">
                    {tier.monthlyPrice != null && <span>${tier.monthlyPrice}/mo</span>}
                    {tier.monthlyPrice != null && tier.yearlyPrice != null && <span> &middot; </span>}
                    {tier.yearlyPrice != null && <span>${tier.yearlyPrice}/yr</span>}
                  </div>
                  {tier.features.length > 0 && (
                    <ul className="text-xs text-brand-silver space-y-1 mb-4">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-brand-gold mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    {tier.monthlyPrice != null && (
                      <button
                        onClick={() => handleSubscribe(tier.id, 'monthly')}
                        disabled={loading !== null}
                        className={cn(
                          'flex-1 px-3 py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-xs font-medium hover:bg-brand-gold/30 transition-colors',
                          loading !== null && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {loading === `${tier.id}-monthly` ? 'Redirecting...' : 'Monthly'}
                      </button>
                    )}
                    {tier.yearlyPrice != null && (
                      <button
                        onClick={() => handleSubscribe(tier.id, 'yearly')}
                        disabled={loading !== null}
                        className={cn(
                          'flex-1 px-3 py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-xs font-medium hover:bg-brand-gold/30 transition-colors',
                          loading !== null && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {loading === `${tier.id}-yearly` ? 'Redirecting...' : 'Yearly'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
