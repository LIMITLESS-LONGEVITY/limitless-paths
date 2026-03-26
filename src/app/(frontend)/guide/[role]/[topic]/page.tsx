import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRoleBySlug, getTopicBySlug } from '../../../../../../content/guide/manifest'
import { getGuideContent } from '@/utilities/mdx'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { TopicContent } from './TopicContent'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ role: string; topic: string }>
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { role: roleSlug, topic: topicSlug } = await params
  const topic = getTopicBySlug(roleSlug, topicSlug)
  const role = getRoleBySlug(roleSlug)
  if (!topic || !role) return {}
  return {
    title: `${topic.title} — ${role.label}`,
    description: topic.description,
  }
}

export default async function TopicPage({ params }: Args) {
  const { role: roleSlug, topic: topicSlug } = await params
  const role = getRoleBySlug(roleSlug)
  const topic = getTopicBySlug(roleSlug, topicSlug)

  if (!role || !topic) {
    notFound()
  }

  const guideContent = await getGuideContent(roleSlug, topicSlug)

  // Find prev/next topics for navigation
  const topicIndex = role.topics.findIndex((t) => t.slug === topicSlug)
  const prevTopic = topicIndex > 0 ? role.topics[topicIndex - 1] : null
  const nextTopic = topicIndex < role.topics.length - 1 ? role.topics[topicIndex + 1] : null

  return (
    <div className="pb-16 px-6 lg:px-12 pt-8">
      <div>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/guide" className="hover:text-foreground transition-colors">
            Guide
          </Link>
          <span>/</span>
          <Link href={`/guide/${role.slug}`} className="hover:text-foreground transition-colors">
            {role.label}
          </Link>
          <span>/</span>
          <span className="text-foreground">{topic.title}</span>
        </nav>

        {/* Content */}
        {guideContent ? (
          <TopicContent>
            <article className="min-w-0">
              {guideContent.content}
            </article>
          </TopicContent>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-2">This guide page is coming soon.</p>
            <p className="text-sm text-muted-foreground/60">
              We're working on documenting {topic.title.toLowerCase()} for {role.label.toLowerCase()}s.
            </p>
          </div>
        )}

        {/* Prev/Next navigation */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4">
          {prevTopic ? (
            <Link
              href={`/guide/${role.slug}/${prevTopic.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{prevTopic.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {nextTopic ? (
            <Link
              href={`/guide/${role.slug}/${nextTopic.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{nextTopic.title}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}
