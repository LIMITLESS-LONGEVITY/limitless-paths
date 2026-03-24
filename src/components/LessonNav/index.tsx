'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'

export const LessonNav: React.FC<{
  prevHref?: string | null
  nextHref?: string | null
  lessonProgressId?: string | null
  enrollmentId: string
  lessonId: string
  isCompleted: boolean
}> = ({ prevHref, nextHref, lessonProgressId, enrollmentId, lessonId, isCompleted }) => {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)

  const handleMarkComplete = async () => {
    setLoading(true)
    try {
      if (lessonProgressId) {
        // Update existing progress
        await fetch(`/api/lesson-progress/${lessonProgressId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      } else {
        // Create new progress record
        await fetch('/api/lesson-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: '', // Will be set by access control
            lesson: lessonId,
            enrollment: enrollmentId,
            status: 'completed',
          }),
        })
      }
      setCompleted(true)
      if (nextHref) window.location.href = nextHref
      else window.location.reload()
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-between items-center pt-6 mt-8 border-t border-border">
      {prevHref ? (
        <Link href={prevHref} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Previous
        </Link>
      ) : (
        <div />
      )}
      {!completed ? (
        <button
          onClick={handleMarkComplete}
          disabled={loading}
          className={cn(
            'px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          {loading ? 'Saving...' : `Mark Complete${nextHref ? ' & Next \u2192' : ''}`}
        </button>
      ) : nextHref ? (
        <Link href={nextHref} className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors">
          Next &rarr;
        </Link>
      ) : (
        <span className="text-sm text-green-500 font-medium">Lesson Complete</span>
      )}
    </div>
  )
}
