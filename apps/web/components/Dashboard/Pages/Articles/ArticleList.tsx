'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, X, Plus, Trash2, ChevronDown } from 'lucide-react'
import { Breadcrumbs } from '@components/Objects/Breadcrumbs/Breadcrumbs'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { createArticle, deleteArticle, transitionArticle } from '@services/articles/articles'
import useSWR from 'swr'
import toast from 'react-hot-toast'

// ---- Status helpers ----
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',      className: 'bg-gray-100 text-gray-600' },
  IN_REVIEW: { label: 'In Review',  className: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { label: 'Approved',   className: 'bg-blue-100 text-blue-700' },
  PUBLISHED: { label: 'Published',  className: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'Archived',   className: 'bg-red-100 text-red-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function PillarBadge({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: color ? `${color}20` : '#e5e7eb', color: color || '#6b7280' }}
    >
      {name}
    </span>
  )
}

function relativeDate(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

// ---- Main component ----
interface ArticleListProps {
  orgslug: string
  org_id: string | number
}

export default function ArticleList({ orgslug, org_id }: ArticleListProps) {
  const router = useRouter()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // SWR for articles
  const { data: articles = [], mutate: mutateArticles, isLoading: articlesLoading } = useSWR(
    access_token && org_id ? `${getAPIUrl()}articles/?org_id=${org_id}` : null,
    (url) => swrFetcher(url, access_token),
    { revalidateOnFocus: true }
  )

  // SWR for pillars
  const { data: pillars = [] } = useSWR(
    access_token ? `${getAPIUrl()}pillars/` : null,
    (url) => swrFetcher(url, access_token),
    { revalidateOnFocus: false }
  )

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPillarId, setSelectedPillarId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Article list is an array (or an object with items/data field)
  const articleArray = useMemo(() => {
    if (Array.isArray(articles)) return articles
    if (articles?.items) return articles.items
    if (articles?.data) return articles.data
    return []
  }, [articles])

  const pillarArray = useMemo(() => {
    if (Array.isArray(pillars)) return pillars
    if (pillars?.items) return pillars.items
    if (pillars?.data) return pillars.data
    return []
  }, [pillars])

  // Filtered articles
  const filtered = useMemo(() => {
    let list = articleArray
    if (selectedPillarId) {
      list = list.filter((a: any) => String(a.pillar_id) === selectedPillarId)
    }
    if (selectedStatus) {
      list = list.filter((a: any) => a.status === selectedStatus)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a: any) => a.title?.toLowerCase().includes(q))
    }
    return list
  }, [articleArray, selectedPillarId, selectedStatus, searchQuery])

  // Build pillar map for display
  const pillarMap = useMemo(() => {
    const map: Record<number, any> = {}
    pillarArray.forEach((p: any) => { map[p.id] = p })
    return map
  }, [pillarArray])

  // Create new article
  async function handleCreate() {
    if (!access_token) return
    const toastId = toast.loading('Creating article...')
    try {
      const res = await createArticle(org_id, { title: 'Untitled Article' }, access_token)
      const article = res?.data ?? res // handle both wrapped {success, data} and raw response
      if (article && article.article_uuid) {
        toast.dismiss(toastId)
        const uuid = article.article_uuid
        if (uuid) {
          router.push(`/dash/articles/${uuid.replace('article_', '')}/edit`)
        } else {
          toast.success('Article created')
          mutateArticles()
        }
      } else {
        toast.error('Failed to create article', { id: toastId })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create article', { id: toastId })
    }
  }

  // Delete article
  async function handleDelete(uuid: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!access_token) return
    if (!confirm('Delete this article? This cannot be undone.')) return
    try {
      await deleteArticle(uuid, access_token)
      toast.success('Article deleted')
      mutateArticles()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete article')
    }
  }

  // Navigate to editor
  function handleRowClick(uuid: string) {
    const clean = uuid.replace('article_', '')
    router.push(`/dash/articles/${clean}/edit`)
  }

  // Quick transition
  async function handleTransition(
    articleUuid: string,
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'revise' | 'archive' | 'reopen',
    e: React.MouseEvent
  ) {
    e.stopPropagation()
    if (!access_token) return
    try {
      await transitionArticle(articleUuid, action, access_token)
      toast.success(`Article ${action}ed`)
      mutateArticles()
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} article`)
    }
  }

  return (
    <div className="h-full w-full bg-[#f8f8f8] pl-10 pr-10">
      {/* Header */}
      <div className="mb-6 pt-6">
        <Breadcrumbs items={[
          { label: 'Articles', href: '/dash/articles', icon: <FileText size={14} /> }
        ]} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Articles</h1>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-black transition-all duration-100 ease-linear antialiased p-2 px-5 my-auto font text-xs font-bold text-white nice-shadow flex space-x-2 items-center hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-10 py-2.5 bg-white nice-shadow rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 border-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pillar filter */}
        <div className="relative">
          <select
            value={selectedPillarId}
            onChange={(e) => setSelectedPillarId(e.target.value)}
            className="pl-3 pr-8 py-2.5 bg-white nice-shadow rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black border-0 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Pillars</option>
            {pillarArray.map((p: any) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pl-3 pr-8 py-2.5 bg-white nice-shadow rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black border-0 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl nice-shadow overflow-hidden">
        {articlesLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading articles...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              {articleArray.length === 0 ? 'No articles yet' : 'No matching articles'}
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              {articleArray.length === 0
                ? 'Create your first article to get started'
                : 'Try adjusting your filters'}
            </p>
            {articleArray.length === 0 && (
              <button
                onClick={handleCreate}
                className="rounded-lg bg-black p-2 px-5 text-xs font-bold text-white nice-shadow flex space-x-2 items-center hover:scale-105 transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>New Article</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pillar</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Author</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((article: any) => {
                const uuid = article.article_uuid || article.uuid
                const pillar = pillarMap[article.pillar_id]
                return (
                  <tr
                    key={uuid}
                    onClick={() => handleRowClick(uuid)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {/* Title */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 line-clamp-1">
                        {article.title || 'Untitled'}
                      </span>
                      {article.summary && (
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{article.summary}</p>
                      )}
                    </td>

                    {/* Pillar */}
                    <td className="px-4 py-4">
                      {pillar ? (
                        <PillarBadge name={pillar.name} color={pillar.color} />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={article.status} />
                    </td>

                    {/* Author */}
                    <td className="px-4 py-4 text-gray-600">
                      {article.author_username || article.author?.username || '—'}
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {relativeDate(article.updated_at || article.update_date || '')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {/* Quick transitions based on status */}
                        {article.status === 'DRAFT' && (
                          <button
                            onClick={(e) => handleTransition(uuid, 'submit', e)}
                            className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                          >
                            Submit
                          </button>
                        )}
                        {article.status === 'IN_REVIEW' && (
                          <>
                            <button
                              onClick={(e) => handleTransition(uuid, 'approve', e)}
                              className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => handleTransition(uuid, 'reject', e)}
                              className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {article.status === 'APPROVED' && (
                          <button
                            onClick={(e) => handleTransition(uuid, 'publish', e)}
                            className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        {article.status === 'PUBLISHED' && (
                          <button
                            onClick={(e) => handleTransition(uuid, 'archive', e)}
                            className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Archive
                          </button>
                        )}
                        {article.status === 'ARCHIVED' && (
                          <button
                            onClick={(e) => handleTransition(uuid, 'reopen', e)}
                            className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(uuid, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          title="Delete article"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Showing {filtered.length} of {articleArray.length} article{articleArray.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
