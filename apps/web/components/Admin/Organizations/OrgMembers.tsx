'use client'
import React, { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import { Users, User, Trash, UserPlus, Warning, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { removeMemberFromOrg } from '@services/organizations/org-admin'
import AddMemberModal from './AddMemberModal'

interface OrgMembersProps {
  orgId: string | number
  accessToken: string
}

function getAvatarUrl(userUuid: string, avatarImage: string): string {
  if (avatarImage.startsWith('http')) return avatarImage
  return getUserAvatarMediaDirectory(userUuid, avatarImage)
}

export default function OrgMembers({ orgId, accessToken }: OrgMembersProps) {
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [removeError, setRemoveError] = useState('')

  const membersKey = accessToken
    ? `${getAPIUrl()}orgs/${orgId}/users?page=${page}&limit=20`
    : null

  const { data, isLoading } = useSWR(
    membersKey,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const handleRemove = async (userId: number) => {
    if (!window.confirm('Remove this member from the organization?')) return
    setRemovingId(userId)
    setRemoveError('')
    try {
      await removeMemberFromOrg(orgId, userId, accessToken)
      mutate(membersKey)
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-white/40" />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Members</h3>
          {total > 0 && (
            <span className="text-xs text-white/30 ml-1">({total})</span>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-xs rounded-lg transition-colors"
        >
          <UserPlus size={13} weight="bold" />
          Add Member
        </button>
      </div>

      {/* Error banner */}
      {removeError && (
        <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400">
          <Warning size={14} />
          {removeError}
        </div>
      )}

      {/* Table */}
      {isLoading && !data ? (
        <div className="px-6 py-10 text-center text-white/30 text-sm">Loading members...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <Users size={40} weight="fill" />
          <p className="mt-3 text-sm">No members yet</p>
        </div>
      ) : (
        <>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-6 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-xs font-medium text-white/30 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((member: any) => (
                <tr
                  key={member.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {member.avatar_image ? (
                        <img
                          src={getAvatarUrl(member.user_uuid, member.avatar_image)}
                          alt={member.username}
                          className="w-7 h-7 rounded-full object-cover bg-gray-700"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <User size={14} weight="fill" className="text-white/40" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white">{member.username}</p>
                        {(member.first_name || member.last_name) && (
                          <p className="text-xs text-white/30">
                            {[member.first_name, member.last_name].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-white/50">{member.email}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-white/60 capitalize">{member.role_name}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-white/40">
                      {member.creation_date
                        ? new Date(member.creation_date).toLocaleDateString()
                        : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                      className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove member"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-white/30">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-20"
                >
                  <CaretLeft size={13} weight="bold" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-20"
                >
                  <CaretRight size={13} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          orgId={orgId}
          accessToken={accessToken}
          onClose={() => setShowAddModal(false)}
          onAdded={() => mutate(membersKey)}
        />
      )}
    </div>
  )
}
