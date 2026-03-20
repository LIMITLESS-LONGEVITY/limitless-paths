'use client'
import React from 'react'
import { transitionArticle } from '@services/articles/articles'
import toast from 'react-hot-toast'

interface ArticleStatusBarProps {
  article: any
  access_token: string | null | undefined
  onRefresh: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',      className: 'bg-gray-100 text-gray-600' },
  IN_REVIEW: { label: 'In Review',  className: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { label: 'Approved',   className: 'bg-blue-100 text-blue-700' },
  PUBLISHED: { label: 'Published',  className: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'Archived',   className: 'bg-red-100 text-red-600' },
}

type TransitionAction = 'submit' | 'approve' | 'reject' | 'publish' | 'revise' | 'archive' | 'reopen'

interface TransitionButton {
  action: TransitionAction
  label: string
  className: string
}

function getTransitions(status: string): TransitionButton[] {
  switch (status) {
    case 'DRAFT':
      return [{ action: 'submit', label: 'Submit for Review', className: 'bg-yellow-600 hover:bg-yellow-700 text-white' }]
    case 'IN_REVIEW':
      return [
        { action: 'approve', label: 'Approve', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
        { action: 'reject',  label: 'Reject',  className: 'bg-red-600 hover:bg-red-700 text-white' },
      ]
    case 'APPROVED':
      return [
        { action: 'publish', label: 'Publish',   className: 'bg-green-600 hover:bg-green-700 text-white' },
        { action: 'revise',  label: 'Send Back', className: 'bg-gray-600 hover:bg-gray-700 text-white' },
      ]
    case 'PUBLISHED':
      return [{ action: 'archive', label: 'Archive', className: 'bg-gray-600 hover:bg-gray-700 text-white' }]
    case 'ARCHIVED':
      return [{ action: 'reopen', label: 'Reopen as Draft', className: 'bg-gray-600 hover:bg-gray-700 text-white' }]
    default:
      return []
  }
}

export default function ArticleStatusBar({ article, access_token, onRefresh }: ArticleStatusBarProps) {
  const status = article?.status || 'DRAFT'
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  const transitions = getTransitions(status)

  async function handleTransition(action: TransitionAction) {
    if (!access_token) return
    const uuid = article?.article_uuid || article?.uuid
    if (!uuid) return
    try {
      const res = await transitionArticle(uuid, action, access_token)
      if (res.success) {
        toast.success(`Article ${action}ed`)
        onRefresh()
      } else {
        toast.error(res.data?.detail || `Failed to ${action} article`)
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} article`)
    }
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
      {/* Status badge */}
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </span>

      {/* Transition buttons */}
      <div className="flex items-center gap-2">
        {transitions.map((t) => (
          <button
            key={t.action}
            onClick={() => handleTransition(t.action)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${t.className}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Article title (read-only display) */}
      <div className="ml-auto text-sm text-gray-500 truncate max-w-xs">
        {article?.title || 'Untitled Article'}
      </div>
    </div>
  )
}
