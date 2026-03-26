'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useDebounce } from '@/utilities/useDebounce'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ContentListItem, type ContentListItemData } from '@/components/ContentListItem'
import { useSearchParams } from 'next/navigation'

type SearchResult = {
  title: string
  slug: string
  collection: string
  accessLevel: string
  locked: boolean
  snippet: string
  relevanceScore: number
}

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), limit: 12 }),
      })

      if (!res.ok) {
        setResults([])
        return
      }

      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  // Update URL without navigation
  useEffect(() => {
    const url = debouncedQuery ? `/search?q=${encodeURIComponent(debouncedQuery)}` : '/search'
    window.history.replaceState(null, '', url)
  }, [debouncedQuery])

  /** Map a search result to ContentListItem props */
  const toListItem = (result: SearchResult): ContentListItemData => ({
    slug: result.slug || '',
    title: result.title,
    excerpt: result.snippet,
    accessLevel: result.accessLevel,
  })

  /** Build the href for a search result */
  const toHref = (result: SearchResult): string => {
    // Articles link to /articles/[slug], lessons to /lessons/[slug], etc.
    const slug = result.slug || result.title.toLowerCase().replace(/\s+/g, '-')
    return `/${result.collection}/${slug}`
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <form onSubmit={(e) => e.preventDefault()}>
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <Input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search with natural language..."
              />
              <button type="submit" className="sr-only">
                submit
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container">
        {loading && (
          <p className="text-center text-brand-silver">Searching...</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-center text-brand-silver">No results found.</p>
        )}

        {results.length > 0 && (
          <div className="max-w-[50rem] mx-auto flex flex-col gap-2">
            {results.map((result, i) => (
              <ContentListItem
                key={`${result.collection}-${result.title}-${i}`}
                item={toListItem(result)}
                href={toHref(result)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageClient
