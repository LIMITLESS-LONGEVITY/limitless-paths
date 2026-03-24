import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'
import { CheckCircle2, Clock, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyCoursesPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  const enrollments = await payload.find({
    collection: 'enrollments',
    where: { user: { equals: user.id } },
    sort: '-enrolledAt',
    depth: 1,
    limit: 50,
    overrideAccess: true,
  })

  if (enrollments.docs.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">You haven&apos;t enrolled in any courses yet.</p>
        <Link
          href="/courses"
          className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
        >
          Browse Courses
        </Link>
      </div>
    )
  }

  const STATUS_STYLES: Record<string, string> = {
    active: 'text-amber-500 bg-amber-500/10',
    completed: 'text-green-500 bg-green-500/10',
    cancelled: 'text-muted-foreground bg-muted',
    expired: 'text-muted-foreground bg-muted',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">My Courses</h2>
      {enrollments.docs.map((enrollment: any) => {
        const course = typeof enrollment.course === 'object' ? enrollment.course : null
        if (!course) return null

        return (
          <div key={enrollment.id} className="flex gap-4 p-4 rounded-lg border border-border items-center">
            {course.featuredImage && typeof course.featuredImage !== 'string' && (
              <div className="flex-shrink-0 w-[120px] h-[80px] rounded-lg overflow-hidden bg-muted hidden sm:block">
                <Media resource={course.featuredImage} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/courses/${course.slug}`} className="text-sm font-semibold hover:text-amber-500 transition-colors truncate">
                  {course.title}
                </Link>
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLES[enrollment.status] || ''}`}>
                  {enrollment.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                {enrollment.status === 'completed' && enrollment.completedAt && (
                  <> &middot; Completed {new Date(enrollment.completedAt).toLocaleDateString()}</>
                )}
              </p>
              {enrollment.status === 'active' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[200px]">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${enrollment.completionPercentage ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{enrollment.completionPercentage ?? 0}%</span>
                </div>
              )}
            </div>
            <Link
              href={`/courses/${course.slug}`}
              className="px-3 py-1.5 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {enrollment.status === 'completed' ? 'Revisit' : 'Continue'}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
