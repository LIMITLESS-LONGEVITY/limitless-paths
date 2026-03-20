'use client'
import React from 'react'
import useSWR from 'swr'
import { getAPIUrl } from '@services/config/config'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import { swrFetcher } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import UserMembership from '@components/Admin/Users/UserMembership'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Buildings,
  ShieldStar,
  EnvelopeSimple,
  CalendarBlank,
} from '@phosphor-icons/react'

function getAvatarUrl(userUuid: string, avatarImage: string): string {
  if (avatarImage.startsWith('http')) return avatarImage
  return getUserAvatarMediaDirectory(userUuid, avatarImage)
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-sm text-white/80 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.userId as string
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token

  const { data: user, isLoading } = useSWR(
    accessToken ? `${getAPIUrl()}ee/superadmin/users/${userId}` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )

  if (isLoading) return <PageLoading />

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <User size={48} weight="fill" />
        <p className="mt-4 text-lg">User not found</p>
      </div>
    )
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <div className="p-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} weight="bold" />
        Back to Users
      </Link>

      {/* User header */}
      <div className="flex items-center gap-4 mb-8">
        {user.avatar_image ? (
          <img
            src={getAvatarUrl(user.user_uuid, user.avatar_image)}
            alt={user.username}
            className="h-14 w-14 rounded-full object-cover bg-white/[0.05]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-white/[0.08] flex items-center justify-center">
            <User size={28} weight="fill" className="text-white/30" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
            {user.is_superadmin && (
              <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-400">
                <ShieldStar size={12} weight="fill" />
                Superadmin
              </span>
            )}
          </div>
          {fullName && <p className="text-white/40 mt-0.5">{fullName}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <EnvelopeSimple size={12} weight="bold" className="text-white/20" />
            <span className="text-sm text-white/50">{user.email}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white/60 mb-3">Account Details</h2>
          <div className="space-y-0">
            <InfoRow label="User ID" value={String(user.id)} />
            <InfoRow label="UUID" value={user.user_uuid} mono />
            <InfoRow
              label="Created"
              value={user.creation_date ? new Date(user.creation_date).toLocaleDateString() : '—'}
            />
            <InfoRow
              label="Updated"
              value={user.update_date ? new Date(user.update_date).toLocaleDateString() : '—'}
            />
          </div>

          {/* Organizations */}
          {user.orgs && user.orgs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Organizations ({user.orgs.length})
              </h3>
              <div className="space-y-1.5">
                {user.orgs.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Buildings size={12} weight="fill" className="text-white/30 shrink-0" />
                      <span className="text-xs text-white/70">{org.name}</span>
                    </div>
                    <span className="text-[10px] text-white/30">{org.role_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Membership card */}
        <div>
          <UserMembership userId={user.id} />
        </div>
      </div>
    </div>
  )
}
