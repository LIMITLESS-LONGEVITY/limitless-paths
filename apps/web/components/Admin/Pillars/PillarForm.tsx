'use client'
import React, { useState } from 'react'
import { ContentPillar, CreatePillarBody } from '@services/content_pillars/pillars'

interface PillarFormProps {
  initialValues?: Partial<ContentPillar>
  onSubmit: (data: CreatePillarBody) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function PillarForm({ initialValues, onSubmit, onCancel, isEdit }: PillarFormProps) {
  const [form, setForm] = useState<CreatePillarBody>({
    name: initialValues?.name ?? '',
    slug: initialValues?.slug ?? '',
    description: initialValues?.description ?? '',
    icon: initialValues?.icon ?? '',
    display_order: initialValues?.display_order ?? 0,
    is_active: initialValues?.is_active ?? true,
    org_id: initialValues?.org_id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      // Auto-generate slug from name when creating
      ...(isEdit ? {} : { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err: any) {
      setError(err?.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
          placeholder="e.g. Nutrition"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Slug *</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-white/20"
          placeholder="e.g. nutrition"
        />
        <p className="text-[10px] text-white/25 mt-1">Lowercase letters, numbers, and hyphens only.</p>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Description</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 resize-none"
          placeholder="Optional description"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Icon</label>
        <input
          type="text"
          value={form.icon ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
          placeholder="e.g. 🥗 or icon-name"
        />
        <p className="text-[10px] text-white/25 mt-1">Emoji or icon identifier for this pillar.</p>
      </div>

      {/* Display Order */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Display Order</label>
        <input
          type="number"
          value={form.display_order ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
          placeholder="0"
        />
        <p className="text-[10px] text-white/25 mt-1">Lower numbers appear first.</p>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between py-2 border border-white/[0.08] rounded-lg px-3">
        <div>
          <p className="text-sm text-white/80">Active</p>
          <p className="text-xs text-white/30">Inactive pillars are hidden from users</p>
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            form.is_active ? 'bg-emerald-500' : 'bg-white/20'
          }`}
          aria-checked={form.is_active}
          role="switch"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              form.is_active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Pillar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
