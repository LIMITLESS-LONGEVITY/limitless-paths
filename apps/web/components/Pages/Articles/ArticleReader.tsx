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

// Same mark normalizer as ArticleEditor
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

// Pillar color palette
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

interface ArticleReaderProps {
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
    related_courses?: string[]
  }
  orgslug: string
}

function ArticleEditorContent({ content }: { content: any }) {
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

export default function ArticleReader({ article, orgslug }: ArticleReaderProps) {
  const authorName =
    article.author?.full_name || article.author?.username || 'Unknown'
  const readTime = estimateReadTime(article.content)
  const pillarColor = getPillarColor(article.pillar?.id)
  const featuredImage = article.featured_image || article.thumbnail_image

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
          {/* Pillar badge */}
          {article.pillar && (
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                {article.pillar.icon && <span>{article.pillar.icon}</span>}
                {article.pillar.name}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
            {article.title}
          </h1>

          {/* Summary */}
          {article.summary && (
            <p className="text-lg text-gray-500 leading-relaxed mb-4">
              {article.summary}
            </p>
          )}

          {/* Meta row */}
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

        {/* TipTap content */}
        {article.content && (
          <div className="mb-12">
            <ArticleEditorContent content={article.content} />
          </div>
        )}

        {/* Related courses */}
        {article.related_courses && article.related_courses.length > 0 && (
          <div className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Courses</h2>
            <div className="flex flex-col gap-2">
              {article.related_courses.map((courseUuid: string) => (
                <Link
                  key={courseUuid}
                  href={getUriWithOrg(orgslug, `/course/${courseUuid.replace('course_', '')}`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors w-fit"
                >
                  View course →
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
