'use client'
import React, { useState } from 'react'
import useSWR from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  ContentPillar,
  CreatePillarBody,
  createPillar,
  updatePillar,
  deletePillar,
} from '@services/content_pillars/pillars'
import PillarForm from './PillarForm'
import { Plus, PencilSimple, Trash, CheckCircle, XCircle, Rows } from '@phosphor-icons/react'

// ---------------------------------------------------------------------------
// Modal wrapper (mirrors TierList pattern)
// ---------------------------------------------------------------------------
function PillarModal({
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
// Delete confirmation dialog
// ---------------------------------------------------------------------------
function DeleteConfirm({
  pillar,
  onConfirm,
  onCancel,
}: {
  pillar: ContentPillar
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete pillar')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70">
        Are you sure you want to delete <span className="text-white font-medium">{pillar.name}</span>?
        This action cannot be undone. If content is linked to this pillar, deletion will be blocked.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={deleting}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main PillarList component
// ---------------------------------------------------------------------------
export default function PillarList() {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token

  const {
    data: pillars,
    isLoading,
    mutate: revalidate,
  } = useSWR<ContentPillar[]>(
    accessToken ? `${getAPIUrl()}pillars/` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: true }
  )

  const [showCreate, setShowCreate] = useState(false)
  const [editPillar, setEditPillar] = useState<ContentPillar | null>(null)
  const [deletePillarItem, setDeletePillarItem] = useState<ContentPillar | null>(null)

  const handleCreate = async (data: CreatePillarBody) => {
    await createPillar(data, accessToken)
    await revalidate()
    setShowCreate(false)
  }

  const handleUpdate = async (data: CreatePillarBody) => {
    if (!editPillar) return
    await updatePillar(editPillar.id, data, accessToken)
    await revalidate()
    setEditPillar(null)
  }

  const handleToggleActive = async (pillar: ContentPillar) => {
    await updatePillar(pillar.id, { is_active: !pillar.is_active }, accessToken)
    await revalidate()
  }

  const handleDelete = async () => {
    if (!deletePillarItem) return
    await deletePillar(deletePillarItem.id, accessToken)
    await revalidate()
    setDeletePillarItem(null)
  }

  const sorted = pillars ? [...pillars].sort((a, b) => a.display_order - b.display_order) : []

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-white/40">
          {pillars ? `${pillars.length} pillar${pillars.length !== 1 ? 's' : ''}` : ''}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={14} weight="bold" />
          New Pillar
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : !pillars || pillars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Rows size={48} weight="fill" />
          <p className="mt-4 text-lg">No pillars found</p>
          <p className="text-sm text-white/25 mt-1">Create your first content pillar to get started</p>
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Slug</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Icon</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pillar) => (
              <tr
                key={pillar.id}
                className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
              >
                {/* Display Order */}
                <td className="px-4 py-3">
                  <span className="text-sm text-white/40 tabular-nums">{pillar.display_order}</span>
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{pillar.name}</p>
                    {pillar.description && (
                      <p className="text-xs text-white/30 truncate max-w-[200px]">{pillar.description}</p>
                    )}
                  </div>
                </td>

                {/* Slug */}
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-white/50">{pillar.slug}</span>
                </td>

                {/* Icon */}
                <td className="px-4 py-3">
                  <span className="text-base">{pillar.icon ?? '—'}</span>
                </td>

                {/* Status toggle */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(pillar)}
                    title={pillar.is_active ? 'Click to deactivate' : 'Click to activate'}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                  >
                    {pillar.is_active ? (
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

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditPillar(pillar)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all text-xs"
                      aria-label={`Edit ${pillar.name}`}
                    >
                      <PencilSimple size={13} weight="bold" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletePillarItem(pillar)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] transition-all text-xs"
                      aria-label={`Delete ${pillar.name}`}
                    >
                      <Trash size={13} weight="bold" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create modal */}
      {showCreate && (
        <PillarModal title="Create Pillar" onClose={() => setShowCreate(false)}>
          <PillarForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </PillarModal>
      )}

      {/* Edit modal */}
      {editPillar && (
        <PillarModal title={`Edit: ${editPillar.name}`} onClose={() => setEditPillar(null)}>
          <PillarForm
            initialValues={editPillar}
            onSubmit={handleUpdate}
            onCancel={() => setEditPillar(null)}
            isEdit
          />
        </PillarModal>
      )}

      {/* Delete confirmation modal */}
      {deletePillarItem && (
        <PillarModal title="Delete Pillar" onClose={() => setDeletePillarItem(null)}>
          <DeleteConfirm
            pillar={deletePillarItem}
            onConfirm={handleDelete}
            onCancel={() => setDeletePillarItem(null)}
          />
        </PillarModal>
      )}
    </div>
  )
}
