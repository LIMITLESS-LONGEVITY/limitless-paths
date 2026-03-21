'use client'
import React from 'react'
import Link from 'next/link'
import { Lock, Clock, User } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'

// Pillar color palette — cycle through these for visual variety
const PILLAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function getPillarColor(pillarId: number | null | undefined): string {
  if (!pillarId) return 'bg-gray-100 text-gray-600'
  return PILLAR_COLORS[pillarId % PILLAR_COLORS.length]
}

function estimateReadTime(content: any): number {
  // Rough estimate: 200 words per minute
  try {
    const text =
      typeof content === 'string'
        ? content
        : JSON.stringify(content)
    const wordCount = text.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(wordCount / 200))
  } catch {
    return 1
  }
}

interface ArticleCardProps {
  article: {
    article_uuid: string
    title: string
    summary?: string | null
    content?: any
    is_locked?: boolean
    access_level?: string | null
    pillar?: { id: number; name: string; icon?: string | null } | null
    author?: { username?: string; full_name?: string } | null
    thumbnail_image?: string | null
    published_at?: string | null
  }
  orgslug: string
}

export default function ArticleCard({ article, orgslug }: ArticleCardProps) {
  const uuid = article.article_uuid.replace('article_', '')
  const href = getUriWithOrg(orgslug, `/article/${uuid}`)
  const readTime = estimateReadTime(article.content)
  const pillarColor = getPillarColor(article.pillar?.id)
  const authorName =
    article.author?.full_name || article.author?.username || 'Unknown'

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-xl nice-shadow hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
        {/* Thumbnail */}
        {article.thumbnail_image && (
          <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
            <img
              src={article.thumbnail_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Badges row */}
          <div className="flex items-center justify-between gap-2">
            {article.pillar ? (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${pillarColor}`}>
                {article.pillar.icon && <span>{article.pillar.icon}</span>}
                {article.pillar.name}
              </span>
            ) : (
              <span />
            )}

            {article.is_locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400 text-amber-900">
                <Lock className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}

          {/* Footer meta */}
          <div className="mt-auto pt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {authorName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readTime} min read
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
