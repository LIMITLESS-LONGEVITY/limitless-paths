'use client'
import React, { useState } from 'react'
import useSWR from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { MembershipTier } from '@services/membership_tiers/tiers'
import { assignTier, UserMembership as UserMembershipType } from '@services/membership_tiers/user_memberships'
import { Crown, ClockCounterClockwise, CaretDown } from '@phosphor-icons/react'

interface UserMembershipProps {
  userId: number
}

export default function UserMembership({ userId }: UserMembershipProps) {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token

  // Fetch available tiers
  const { data: tiers } = useSWR<MembershipTier[]>(
    accessToken ? `${getAPIUrl()}tiers/` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )

  // Fetch active membership
  const {
    data: activeMembership,
    isLoading: loadingActive,
    mutate: revalidateActive,
  } = useSWR<UserMembershipType | null>(
    accessToken ? `${getAPIUrl()}memberships/user/${userId}/active` : null,
    async (url: string) => {
      try {
        return await swrFetcher(url, accessToken)
      } catch (err: any) {
        if (err?.status === 404) return null
        throw err
      }
    },
    { revalidateOnFocus: false }
  )

  // Fetch membership history
  const { data: history, mutate: revalidateHistory } = useSWR<UserMembershipType[]>(
    accessToken ? `${getAPIUrl()}memberships/user/${userId}/history` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )

  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeTiers = tiers?.filter((t) => t.is_active) ?? []
  const currentTierId = activeMembership?.tier_id ?? null

  const handleAssign = async (tierId: number) => {
    if (tierId === currentTierId) return
    setAssigning(true)
    setError('')
    setSuccess('')
    try {
      await assignTier(userId, tierId, 'admin', accessToken)
      await revalidateActive()
      await revalidateHistory()
      setSuccess('Tier updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to assign tier')
    } finally {
      setAssigning(false)
    }
  }

  if (loadingActive) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current tier section */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown size={16} weight="fill" className="text-amber-400/80" />
          <h3 className="text-sm font-medium text-white/60">Membership Tier</h3>
        </div>

        {/* Current tier display */}
        <div className="mb-4">
          {activeMembership ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{activeMembership.tier_name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400">
                Active
              </span>
              {activeMembership.source && (
                <span className="text-xs text-white/30 font-mono">via {activeMembership.source}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-white/30">No active tier</span>
          )}
          {activeMembership?.started_at && (
            <p className="text-xs text-white/25 mt-1">
              Since {new Date(activeMembership.started_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Tier selector */}
        {activeTiers.length > 0 && (
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Change tier</label>
            <div className="relative w-56">
              <select
                value={currentTierId ?? ''}
                onChange={(e) => handleAssign(Number(e.target.value))}
                disabled={assigning}
                className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50 cursor-pointer"
                aria-label="Select membership tier"
              >
                <option value="" disabled className="bg-[#1a1a1b]">
                  — select a tier —
                </option>
                {activeTiers
                  .sort((a, b) => b.priority - a.priority)
                  .map((tier) => (
                    <option key={tier.id} value={tier.id} className="bg-[#1a1a1b]">
                      {tier.name}
                    </option>
                  ))}
              </select>
              <CaretDown
                size={12}
                weight="bold"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
              />
            </div>
          </div>
        )}

        {assigning && (
          <p className="text-xs text-white/40 mt-2">Assigning tier...</p>
        )}
        {success && (
          <p className="text-xs text-emerald-400 mt-2">{success}</p>
        )}
        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>

      {/* History section */}
      {history && history.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClockCounterClockwise size={14} weight="fill" className="text-white/30" />
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Membership History</h3>
          </div>
          <div className="space-y-2">
            {history.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">{m.tier_name}</span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      m.status === 'active'
                        ? 'bg-emerald-400/10 text-emerald-400'
                        : 'bg-white/[0.06] text-white/30'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/30">
                    {new Date(m.started_at).toLocaleDateString()}
                    {m.ended_at ? ` – ${new Date(m.ended_at).toLocaleDateString()}` : ' – present'}
                  </p>
                  {m.source && (
                    <p className="text-[10px] text-white/20 font-mono">{m.source}</p>
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
