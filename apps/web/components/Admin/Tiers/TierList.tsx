'use client'
import React, { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { MembershipTier, createTier, updateTier, CreateTierBody } from '@services/membership_tiers/tiers'
import TierForm from './TierForm'
import { Plus, PencilSimple, Users, CheckCircle, XCircle } from '@phosphor-icons/react'

// ---------------------------------------------------------------------------
// Inline edit/create modal (minimal, no dependency on shadcn Dialog)
// ---------------------------------------------------------------------------
function TierModal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1a1a1b] border border-white/[0.12] rounded-xl shadow-2xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// User count badge — fetches count per tier
// ---------------------------------------------------------------------------
function UserCountBadge({ tierId, accessToken }: { tierId: number; accessToken: string }) {
  const { data } = useSWR<number | { count: number }>(
    accessToken ? `${getAPIUrl()}tiers/${tierId}/count` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )
  const count = data === undefined ? '—' : typeof data === 'number' ? data : (data as any)?.count ?? '—'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-white/50">
      <Users size={12} weight="fill" className="text-white/30" />
      {count}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main TierList component
// ---------------------------------------------------------------------------
export default function TierList() {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token

  const {
    data: tiers,
    isLoading,
    mutate: revalidate,
  } = useSWR<MembershipTier[]>(
    accessToken ? `${getAPIUrl()}tiers/` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: true }
  )

  const [showCreate, setShowCreate] = useState(false)
  const [editTier, setEditTier] = useState<MembershipTier | null>(null)

  const handleCreate = async (data: CreateTierBody) => {
    await createTier(data, accessToken)
    await revalidate()
    setShowCreate(false)
  }

  const handleUpdate = async (data: CreateTierBody) => {
    if (!editTier) return
    await updateTier(editTier.id, data, accessToken)
    await revalidate()
    setEditTier(null)
  }

  const handleToggleActive = async (tier: MembershipTier) => {
    await updateTier(tier.id, { is_active: !tier.is_active }, accessToken)
    await revalidate()
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-white/40">
          {tiers ? `${tiers.length} tier${tiers.length !== 1 ? 's' : ''}` : ''}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={14} weight="bold" />
          New Tier
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : !tiers || tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Users size={48} weight="fill" />
          <p className="mt-4 text-lg">No tiers found</p>
          <p className="text-sm text-white/25 mt-1">Create your first membership tier to get started</p>
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Slug</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Users</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers
              .sort((a, b) => b.priority - a.priority)
              .map((tier) => (
                <tr
                  key={tier.id}
                  className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{tier.name}</p>
                      {tier.description && (
                        <p className="text-xs text-white/30 truncate max-w-[200px]">{tier.description}</p>
                      )}
                    </div>
                  </td>

                  {/* Slug */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-white/50">{tier.slug}</span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-white/60 tabular-nums">{tier.priority}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(tier)}
                      title={tier.is_active ? 'Click to deactivate' : 'Click to activate'}
                      className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                    >
                      {tier.is_active ? (
                        <>
                          <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                          <span className="text-emerald-400">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} weight="fill" className="text-white/30" />
                          <span className="text-white/40">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* User count */}
                  <td className="px-4 py-3">
                    <UserCountBadge tierId={tier.id} accessToken={accessToken} />
                  </td>

                  {/* Edit button */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditTier(tier)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all text-xs"
                      aria-label={`Edit ${tier.name}`}
                    >
                      <PencilSimple size={13} weight="bold" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* Create modal */}
      {showCreate && (
        <TierModal title="Create Tier" onClose={() => setShowCreate(false)}>
          <TierForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </TierModal>
      )}

      {/* Edit modal */}
      {editTier && (
        <TierModal title={`Edit: ${editTier.name}`} onClose={() => setEditTier(null)}>
          <TierForm
            initialValues={editTier}
            onSubmit={handleUpdate}
            onCancel={() => setEditTier(null)}
            isEdit
          />
        </TierModal>
      )}
    </div>
  )
}
