'use client'
import React from 'react'
import useSWR from 'swr'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { Users, BookOpen, Article, CalendarBlank } from '@phosphor-icons/react'

interface OrgStatsProps {
  orgId: string | number
  accessToken: string
}

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: string
}

function StatCard({ label, value, icon, color = 'text-white/60' }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 flex items-center gap-4">
      <div className={`${color} opacity-60`}>{icon}</div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  )
}

export default function OrgStats({ orgId, accessToken }: OrgStatsProps) {
  const { data, isLoading, error } = useSWR(
    accessToken ? `${getAPIUrl()}admin/orgs/${orgId}/stats` : null,
    (url: string) => swrFetcher(url, accessToken),
    { revalidateOnFocus: false }
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-xl h-24" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const createdDate = data.created
    ? new Date(data.created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Members"
        value={data.member_count ?? 0}
        icon={<Users size={28} weight="fill" />}
        color="text-blue-400"
      />
      <StatCard
        label="Articles"
        value={data.article_count ?? 0}
        icon={<Article size={28} weight="fill" />}
        color="text-emerald-400"
      />
      <StatCard
        label="Courses"
        value={data.course_count ?? 0}
        icon={<BookOpen size={28} weight="fill" />}
        color="text-purple-400"
      />
      <StatCard
        label="Created"
        value={createdDate}
        icon={<CalendarBlank size={28} weight="fill" />}
        color="text-amber-400"
      />
    </div>
  )
}
