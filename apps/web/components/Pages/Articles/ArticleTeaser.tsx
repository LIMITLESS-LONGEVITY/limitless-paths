'use client'
import React, { useMemo } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { getLinkExtension } from '@components/Objects/Editor/EditorConf'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Youtube from '@tiptap/extension-youtube'
import { common, createLowlight } from 'lowlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import InfoCallout from '@components/Objects/Editor/Extensions/Callout/Info/InfoCallout'
import WarningCallout from '@components/Objects/Editor/Extensions/Callout/Warning/WarningCallout'
import { ArrowLeft, Clock, User, Calendar, Lock } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'

const lowlight = createLowlight(common)

function normalizeMarkTypes(content: any): any {
  if (!content || typeof content !== 'object') return content
  if (Array.isArray(content)) return content.map(normalizeMarkTypes)
  const normalized: any = { ...content }
  if (normalized.marks && Array.isArray(normalized.marks)) {
    normalized.marks = normalized.marks.map((mark: any) => {
      if (mark.type === 'strong') return { ...mark, type: 'bold' }
      if (mark.type === 'em') return { ...mark, type: 'italic' }
      return mark
    })
  }
  if (normalized.content && Array.isArray(normalized.content)) {
    normalized.content = normalizeMarkTypes(normalized.content)
  }
  return normalized
}

function estimateReadTime(content: any): number {
  try {
    const text =
      typeof content === 'string' ? content : JSON.stringify(content)
    const wordCount = text.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(wordCount / 200))
  } catch {
    return 1
  }
}

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

interface ArticleTeaserProps {
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
    featured_image?: string | null
    published_at?: string | null
  }
  orgslug: string
}

function PreviewContent({ content }: { content: any }) {
  const parsedContent = useMemo(() => {
    try {
      const parsed =
        typeof content === 'string' ? JSON.parse(content) : content
      return normalizeMarkTypes(parsed)
    } catch {
      return content
    }
  }, [content])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        bulletList: { HTMLAttributes: { class: 'bullet-list' } },
        orderedList: { HTMLAttributes: { class: 'ordered-list' } },
      }),
      InfoCallout.configure({ editable: false }),
      WarningCallout.configure({ editable: false }),
      Youtube.configure({ controls: true, modestBranding: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      getLinkExtension(),
    ],
    content: parsedContent,
    editable: false,
    immediatelyRender: false,
  })

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm sm:prose max-w-none focus:outline-none"
    />
  )
}

export default function ArticleTeaser({ article, orgslug }: ArticleTeaserProps) {
  const authorName =
    article.author?.full_name || article.author?.username || 'Unknown'
  const readTime = estimateReadTime(article.content)
  const pillarColor = getPillarColor(article.pillar?.id)
  const featuredImage = article.featured_image || article.thumbnail_image
  const accessLevel = article.access_level || 'premium'

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href={getUriWithOrg(orgslug, '/articles')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Articles
      </Link>

      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          {article.pillar && (
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                {article.pillar.icon && <span>{article.pillar.icon}</span>}
                {article.pillar.name}
              </span>
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
            {article.title}
          </h1>

          {article.summary && (
            <p className="text-lg text-gray-500 leading-relaxed mb-4">
              {article.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {authorName}
            </span>
            {publishedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {publishedDate}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {readTime} min read
            </span>
          </div>
        </header>

        {/* Featured image */}
        {featuredImage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={featuredImage}
              alt={article.title}
              className="w-full object-cover max-h-96"
              loading="lazy"
            />
          </div>
        )}

        {/* Preview content with fade overlay */}
        {article.content && (
          <div className="relative mb-0 overflow-hidden" style={{ maxHeight: '320px' }}>
            <PreviewContent content={article.content} />
            {/* Gradient fade */}
            <div
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, white)',
              }}
            />
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="mt-0 pt-8 pb-10 text-center border-t-0">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-full text-amber-700">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium capitalize">
                This article requires a {accessLevel} membership
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              Unlock this article and all premium content by upgrading your membership.
            </p>
            <Link
              href={getUriWithOrg(orgslug, '/account/billing')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold rounded-lg transition-colors"
            >
              Upgrade Membership
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
