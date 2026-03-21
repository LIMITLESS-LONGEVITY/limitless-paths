'use client'
import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Search, X, FileText } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import PillarTabs from './PillarTabs'
import ArticleCard from './ArticleCard'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'

interface ArticleBrowseProps {
  orgslug: string
  org_id: number | string
}

export default function ArticleBrowse({ orgslug, org_id }: ArticleBrowseProps) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const [selectedPillarId, setSelectedPillarId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Build SWR key — includes pillar filter
  const swrKey = useMemo(() => {
    const params = new URLSearchParams()
    params.set('org_id', String(org_id))
    params.set('include_locked', 'true')
    if (selectedPillarId !== null) {
      params.set('pillar_id', String(selectedPillarId))
    }
    return `${getAPIUrl()}articles/?${params.toString()}`
  }, [org_id, selectedPillarId])

  const { data: articles, isLoading, error } = useSWR<any[]>(
    swrKey,
    (url: string) => swrFetcher(url, access_token),
    { revalidateOnFocus: false }
  )

  // Client-side title filter
  const filteredArticles = useMemo(() => {
    if (!articles) return []
    const arr = Array.isArray(articles) ? articles : (articles as any)?.items || []
    if (!searchQuery.trim()) return arr
    const q = searchQuery.toLowerCase()
    return arr.filter((a: any) =>
      a.title?.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q)
    )
  }, [articles, searchQuery])

  return (
    <GeneralWrapperStyled>
      <div className="flex flex-col gap-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Articles</h1>
          {org?.description && (
            <p className="text-gray-500 text-sm mt-1">{org.description}</p>
          )}
        </div>

        {/* Pillar tabs */}
        <PillarTabs
          onSelect={setSelectedPillarId}
          selectedPillarId={selectedPillarId}
        />

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
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl nice-shadow p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Failed to load articles. Please try again.</p>
          </div>
        )}

        {/* Article grid */}
        {!isLoading && !error && (
          <>
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredArticles.map((article: any) => (
                  <ArticleCard
                    key={article.article_uuid}
                    article={article}
                    orgslug={orgslug}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="p-4 bg-white rounded-full nice-shadow">
                  <FileText className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-600 mb-1">
                    {searchQuery ? 'No articles match your search' : 'No articles yet'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? 'Try a different search term or clear the filter.'
                      : 'Check back soon for new content.'}
                  </p>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </GeneralWrapperStyled>
  )
}
