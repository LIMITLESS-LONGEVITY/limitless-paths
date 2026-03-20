'use client'
import React, { useState } from 'react'
import { transitionArticle } from '@services/articles/articles'
import toast from 'react-hot-toast'
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react'

interface ArticleReviewPanelProps {
  article: any
  access_token: string | null | undefined
  onRefresh: () => void
}

export default function ArticleReviewPanel({ article, access_token, onRefresh }: ArticleReviewPanelProps) {
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (article?.status !== 'IN_REVIEW') return null

  const uuid = article?.article_uuid || article?.uuid

  async function handleApprove() {
    if (!access_token || !uuid) return
    setIsLoading(true)
    try {
      const res = await transitionArticle(uuid, 'approve', access_token)
      if (res.success) {
        toast.success('Article approved')
        onRefresh()
      } else {
        toast.error(res.data?.detail || 'Failed to approve article')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve article')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReject() {
    if (!access_token || !uuid) return
    if (!rejectNotes.trim()) {
      toast.error('Please provide rejection notes')
      return
    }
    setIsLoading(true)
    try {
      const res = await transitionArticle(uuid, 'reject', access_token, rejectNotes)
      if (res.success) {
        toast.success('Article rejected')
        setRejectNotes('')
        setShowRejectForm(false)
        onRefresh()
      } else {
        toast.error(res.data?.detail || 'Failed to reject article')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject article')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border-t border-amber-200 bg-amber-50 px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Review Required</h3>
            <p className="text-xs text-amber-700 mb-3">
              This article has been submitted for review.
              {article?.submitted_by_username && (
                <> Submitted by <strong>{article.submitted_by_username}</strong>.</>
              )}
            </p>

            {/* Review notes from previous rejection */}
            {article?.review_notes && (
              <div className="mb-3 p-3 bg-white rounded-lg border border-amber-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Previous review notes:</p>
                <p className="text-xs text-gray-700">{article.review_notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>

              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>

            {/* Reject form */}
            {showRejectForm && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Provide feedback for the author (required)..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={isLoading || !rejectNotes.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectNotes('') }}
                    className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
