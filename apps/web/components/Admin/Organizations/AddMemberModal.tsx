'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import useSWR from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { X, MagnifyingGlass, User, Check, Warning } from '@phosphor-icons/react'
import { searchUsers, addMemberToOrg, UserSearchResult } from '@services/organizations/org-admin'

interface AddMemberModalProps {
  orgId: string | number
  accessToken: string
  onClose: () => void
  onAdded: () => void
}

export default function AddMemberModal({ orgId, accessToken, onClose, onAdded }: AddMemberModalProps) {
  const [emailQuery, setEmailQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedRoleUuid, setSelectedRoleUuid] = useState('')
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch roles for this org
  const { data: rolesData } = useSWR(
    accessToken ? `${getAPIUrl()}roles/org/${orgId}` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )
  const roles: any[] = Array.isArray(rolesData) ? rolesData : rolesData?.items || []

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(emailQuery), 400)
    return () => clearTimeout(timer)
  }, [emailQuery])

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    searchUsers(debouncedQuery.trim(), accessToken)
      .then((results) => {
        if (!cancelled) setSearchResults(results)
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => { cancelled = true }
  }, [debouncedQuery, accessToken])

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAdd = async () => {
    if (!selectedUser || !selectedRoleUuid) return
    setAdding(true)
    setError('')
    try {
      await addMemberToOrg(orgId, selectedUser.id, selectedRoleUuid, accessToken)
      setSuccess(true)
      onAdded()
      setTimeout(onClose, 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0f1221] border border-white/[0.1] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">Add Member</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Email search */}
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Search by Email</label>
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                ref={inputRef}
                type="text"
                value={emailQuery}
                onChange={(e) => {
                  setEmailQuery(e.target.value)
                  setSelectedUser(null)
                  setError('')
                }}
                placeholder="Type email address..."
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Search results */}
          {emailQuery.length >= 2 && (
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              {searching ? (
                <div className="px-4 py-3 text-sm text-white/30">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-white/30">No users found</div>
              ) : (
                <div className="divide-y divide-white/[0.05] max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user)
                        setEmailQuery(user.email)
                        setSearchResults([])
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors ${
                        selectedUser?.id === user.id ? 'bg-white/[0.05]' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <User size={14} weight="fill" className="text-white/40" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{user.email}</p>
                        {(user.first_name || user.last_name) && (
                          <p className="text-xs text-white/40 truncate">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                      {selectedUser?.id === user.id && (
                        <Check size={14} weight="bold" className="text-emerald-400 shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected user badge */}
          {selectedUser && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg">
              <Check size={14} weight="bold" className="text-emerald-400 shrink-0" />
              <span className="text-sm text-emerald-300 truncate">{selectedUser.email}</span>
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Role</label>
            <select
              value={selectedRoleUuid}
              onChange={(e) => setSelectedRoleUuid(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none"
            >
              <option value="" className="bg-[#0f1221]">Select a role...</option>
              {roles.map((role: any) => (
                <option key={role.role_uuid || role.id} value={role.role_uuid || role.id} className="bg-[#0f1221]">
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <Warning size={14} />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <Check size={14} weight="bold" />
              Member added successfully
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedUser || !selectedRoleUuid || adding || success}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  )
}
