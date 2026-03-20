'use client'
import React, { useState, useEffect } from 'react'
import { updateArticle } from '@services/articles/articles'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { ChevronDown, Save } from 'lucide-react'

interface ArticleMetaSidebarProps {
  article: any
  access_token: string | null | undefined
  onUpdate: (updated: any) => void
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function ArticleMetaSidebar({ article, access_token, onUpdate }: ArticleMetaSidebarProps) {
  const [title, setTitle] = useState(article?.title || '')
  const [slug, setSlug] = useState(article?.slug || '')
  const [summary, setSummary] = useState(article?.summary || '')
  const [featuredImage, setFeaturedImage] = useState(article?.featured_image_url || '')
  const [pillarId, setPillarId] = useState<string>(article?.pillar_id ? String(article.pillar_id) : '')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state when article changes from outside
  useEffect(() => {
    setTitle(article?.title || '')
    setSlug(article?.slug || '')
    setSummary(article?.summary || '')
    setFeaturedImage(article?.featured_image_url || '')
    setPillarId(article?.pillar_id ? String(article.pillar_id) : '')
    setIsDirty(false)
  }, [article?.article_uuid || article?.uuid])

  // SWR for pillars
  const { data: pillars = [] } = useSWR(
    access_token ? `${getAPIUrl()}pillars/` : null,
    (url) => swrFetcher(url, access_token || undefined),
    { revalidateOnFocus: false }
  )

  const pillarArray = Array.isArray(pillars) ? pillars : (pillars?.items || pillars?.data || [])

  function handleTitleChange(val: string) {
    setTitle(val)
    // Auto-generate slug if slug hasn't been manually edited
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(val))
    }
    setIsDirty(true)
  }

  async function handleSave() {
    if (!access_token) return
    const uuid = article?.article_uuid || article?.uuid
    if (!uuid) return
    setIsSaving(true)
    try {
      const res = await updateArticle(
        uuid,
        {
          title: title || 'Untitled Article',
          slug: slug || undefined,
          summary: summary || undefined,
          featured_image_url: featuredImage || undefined,
          pillar_id: pillarId ? Number(pillarId) : undefined,
        },
        access_token,
        false
      )
      if (res.success) {
        toast.success('Metadata saved')
        setIsDirty(false)
        onUpdate(res.data)
      } else {
        toast.error(res.data?.detail || 'Failed to save metadata')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save metadata')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Article Settings</h3>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 flex-1">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Article title"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setIsDirty(true) }}
            placeholder="article-url-slug"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => { setSummary(e.target.value); setIsDirty(true) }}
            placeholder="Brief summary of the article..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
          />
        </div>

        {/* Featured Image */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Featured Image URL</label>
          <input
            type="url"
            value={featuredImage}
            onChange={(e) => { setFeaturedImage(e.target.value); setIsDirty(true) }}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          {featuredImage && (
            <img
              src={featuredImage}
              alt="Featured"
              className="mt-2 w-full h-28 object-cover rounded-lg"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>

        {/* Pillar */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Content Pillar</label>
          <div className="relative">
            <select
              value={pillarId}
              onChange={(e) => { setPillarId(e.target.value); setIsDirty(true) }}
              className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black appearance-none cursor-pointer"
            >
              <option value="">No pillar</option>
              {pillarArray.map((p: any) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Save button at bottom if dirty */}
      {isDirty && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
