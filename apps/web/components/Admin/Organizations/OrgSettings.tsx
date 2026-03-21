'use client'
import React, { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'

interface OrgSettingsProps {
  orgId: string | number
  org: any
  accessToken: string
}

const ORG_TYPE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'medical', label: 'Medical' },
  { value: 'non_medical', label: 'Non-Medical' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'wellness', label: 'Wellness' },
]

const CONTENT_ACCESS_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'regular', label: 'Regular' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
]

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs text-white/40 block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0f1221] text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-white/25 mt-1">{hint}</p>}
    </div>
  )
}

export default function OrgSettings({ orgId, org, accessToken }: OrgSettingsProps) {
  const [orgType, setOrgType] = useState<string>(org?.org_type || '')
  const [contentAccess, setContentAccess] = useState<string>(org?.content_access_level || 'free')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Keep local state in sync if org prop changes
  useEffect(() => {
    setOrgType(org?.org_type || '')
    setContentAccess(org?.content_access_level || 'free')
  }, [org?.org_type, org?.content_access_level])

  const hasChanges =
    orgType !== (org?.org_type || '') ||
    contentAccess !== (org?.content_access_level || 'free')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch(`${getAPIUrl()}ee/superadmin/organizations/${orgId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          org_type: orgType || null,
          content_access_level: contentAccess,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || `Failed to save (${res.status})`)
        return
      }
      setSaved(true)
      mutate(`${getAPIUrl()}ee/superadmin/organizations/${orgId}`)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
        Org Configuration
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Org Type"
          value={orgType}
          onChange={setOrgType}
          options={ORG_TYPE_OPTIONS}
        />
        <SelectField
          label="Content Access Level"
          value={contentAccess}
          onChange={setContentAccess}
          options={CONTENT_ACCESS_OPTIONS}
        />
      </div>

      {/* Read-only managed_by */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Managed By</label>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/40 font-mono">
          {org?.managed_by || 'limitless'}
        </div>
        <p className="text-[10px] text-white/25 mt-1">Read-only — set at org creation</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Configuration saved</p>}

      {hasChanges && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => {
              setOrgType(org?.org_type || '')
              setContentAccess(org?.content_access_level || 'free')
              setError('')
            }}
            className="px-4 py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
