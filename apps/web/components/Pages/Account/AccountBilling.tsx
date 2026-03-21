'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getTiers, MembershipTier } from '@services/membership_tiers/tiers'
import {
  getBillingStatus,
  createCheckout,
  cancelSubscription,
  getPortalUrl,
  BillingStatus,
  BillingPeriod,
} from '@services/billing/billing'
import { CreditCard, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface AccountBillingProps {
  orgslug: string
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function AccountBilling({ orgslug }: AccountBillingProps) {
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token as string | undefined

  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [paidTiers, setPaidTiers] = useState<MembershipTier[]>([])
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [billingUnavailable, setBillingUnavailable] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setBillingUnavailable(false)
    setActionError('')
    try {
      const [status, allTiers] = await Promise.all([
        getBillingStatus(token),
        getTiers(token),
      ])
      setBillingStatus(status)
      // Only show tiers that have a monthly Stripe price configured
      setPaidTiers(allTiers.filter((t) => t.stripe_price_monthly_id && t.is_active))
    } catch (err: any) {
      if (err?.status === 503) {
        setBillingUnavailable(true)
      } else {
        setActionError(err?.message || 'Failed to load billing information.')
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpgrade = async (tier: MembershipTier) => {
    if (!token) return
    setActionLoading(true)
    setActionError('')
    try {
      const period: BillingPeriod =
        billingPeriod === 'yearly' && tier.stripe_price_yearly_id ? 'yearly' : 'monthly'
      const { checkout_url } = await createCheckout(tier.id, period, token)
      window.location.href = checkout_url
    } catch (err: any) {
      if (err?.status === 503) {
        setBillingUnavailable(true)
      } else {
        setActionError(err?.message || 'Failed to start checkout.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!token) return
    setActionLoading(true)
    setActionError('')
    try {
      await cancelSubscription(token)
      setConfirmCancel(false)
      await fetchData()
    } catch (err: any) {
      if (err?.status === 503) {
        setBillingUnavailable(true)
      } else {
        setActionError(err?.message || 'Failed to cancel subscription.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleManagePayment = async () => {
    if (!token) return
    setActionLoading(true)
    setActionError('')
    try {
      const { portal_url } = await getPortalUrl(token)
      window.location.href = portal_url
    } catch (err: any) {
      if (err?.status === 503) {
        setBillingUnavailable(true)
      } else {
        setActionError(err?.message || 'Failed to open billing portal.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // --- Render states ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading billing information...</span>
      </div>
    )
  }

  if (billingUnavailable) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Billing is not currently available</p>
          <p className="text-sm text-amber-600 mt-1">
            Payment processing is not configured for this organisation. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  const status = billingStatus?.status ?? 'free'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Billing &amp; Membership</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your membership plan and payment details.</p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {/* FREE — no active subscription */}
      {status === 'free' && (
        <div className="space-y-4">
          {/* Billing period toggle */}
          {paidTiers.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yearly
              </button>
            </div>
          )}

          {/* Tier cards */}
          {paidTiers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
              No paid membership plans are available at this time.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {paidTiers.map((tier) => {
                const displayPrice =
                  billingPeriod === 'yearly' && tier.price_yearly_display
                    ? tier.price_yearly_display
                    : tier.price_monthly_display || ''
                return (
                  <div
                    key={tier.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{tier.name}</p>
                      {tier.description && (
                        <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                      )}
                      {displayPrice && (
                        <p className="text-2xl font-bold text-gray-900 mt-2">{displayPrice}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUpgrade(tier)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-amber-900 font-semibold rounded-lg transition-colors text-sm"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      Upgrade to {tier.name}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE subscription */}
      {status === 'active' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Active membership</span>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-900">Plan:</span>{' '}
              {billingStatus?.tier_name || 'Paid'}
            </p>
            {billingStatus?.billing_period && (
              <p>
                <span className="font-medium text-gray-900">Billing:</span>{' '}
                {billingStatus.billing_period === 'monthly' ? 'Monthly' : 'Yearly'}
              </p>
            )}
            {billingStatus?.current_period_end && (
              <p>
                <span className="font-medium text-gray-900">Renews:</span>{' '}
                {formatDate(billingStatus.current_period_end)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleManagePayment}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition-colors text-sm"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Manage Payment Method
            </button>
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 font-medium rounded-lg transition-colors text-sm"
              >
                Cancel Subscription
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Are you sure?</span>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Keep Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANCELLING — subscription ends soon */}
      {status === 'cancelling' && (
        <div className="bg-white border border-amber-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Subscription cancelling</span>
          </div>
          <p className="text-sm text-gray-600">
            Your <span className="font-medium">{billingStatus?.tier_name || 'paid'}</span> membership
            is active until{' '}
            <span className="font-medium">{formatDate(billingStatus?.current_period_end)}</span>.
            You will retain access until that date.
          </p>
          <button
            onClick={handleManagePayment}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition-colors text-sm"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Manage in Billing Portal
          </button>
        </div>
      )}

      {/* PAST DUE */}
      {status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Payment past due</span>
          </div>
          <p className="text-sm text-gray-600">
            There was an issue with your recent payment. Please update your payment method to keep
            your <span className="font-medium">{billingStatus?.tier_name || 'paid'}</span> membership active.
          </p>
          <button
            onClick={handleManagePayment}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Update Payment Method
          </button>
        </div>
      )}

      {/* MANUAL — admin-assigned tier, no Stripe subscription */}
      {status === 'manual' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="w-5 h-5 text-gray-400" />
            <span className="font-medium">Membership active</span>
          </div>
          <p className="text-sm text-gray-500">
            You have a <span className="font-medium text-gray-700">{billingStatus?.tier_name || 'paid'}</span> membership
            managed by your organisation. No billing changes are available through this portal.
          </p>
        </div>
      )}
    </div>
  )
}
