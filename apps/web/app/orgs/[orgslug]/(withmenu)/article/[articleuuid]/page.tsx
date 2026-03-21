import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getServerSession } from '@/lib/auth/server'
import { getAPIUrl } from '@services/config/config'
import { Metadata } from 'next'
import ArticleReader from '@components/Pages/Articles/ArticleReader'
import ArticleTeaser from '@components/Pages/Articles/ArticleTeaser'

type PageProps = {
  params: Promise<{ orgslug: string; articleuuid: string }>
}

async function fetchArticle(articleUuid: string, accessToken?: string) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${getAPIUrl()}articles/article_${articleUuid}`, {
    headers,
    cache: 'no-store',
  })

  if (res.ok) {
    return { data: await res.json(), accessible: true }
  }

  if (res.status === 403 || res.status === 401) {
    return { data: null, accessible: false }
  }

  throw new Error(`Failed to fetch article: ${res.status}`)
}

async function fetchArticlePreview(articleUuid: string, accessToken?: string) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(
    `${getAPIUrl()}articles/article_${articleUuid}?preview=true`,
    { headers, cache: 'no-store' }
  )

  if (res.ok) return res.json()
  return null
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const session = await getServerSession()
  const accessToken = session?.tokens?.access_token

  try {
    const { data, accessible } = await fetchArticle(params.articleuuid, accessToken)
    const article = accessible ? data : await fetchArticlePreview(params.articleuuid, accessToken)

    if (!article) return { title: 'Article' }

    return {
      title: article.title,
      description: article.summary || article.title,
      robots: { index: true, follow: true },
    }
  } catch {
    return { title: 'Article' }
  }
}

const ArticleReaderPage = async (props: PageProps) => {
  const params = await props.params
  const { orgslug, articleuuid } = params

  const session = await getServerSession()
  const accessToken = session?.tokens?.access_token

  let article: any = null
  let isAccessible = false

  try {
    const result = await fetchArticle(articleuuid, accessToken)
    if (result.accessible) {
      article = result.data
      isAccessible = true
    } else {
      // Try to get preview
      article = await fetchArticlePreview(articleuuid, accessToken)
      isAccessible = false
    }
  } catch (error) {
    console.error('Failed to fetch article:', error)
    // Try preview as fallback
    try {
      article = await fetchArticlePreview(articleuuid, accessToken)
      isAccessible = false
    } catch {
      article = null
    }
  }

  if (!article) {
    return (
      <div className="max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Article not found</h1>
        <p className="text-gray-500">This article may have been removed or is unavailable.</p>
      </div>
    )
  }

  if (isAccessible) {
    return <ArticleReader article={article} orgslug={orgslug} />
  }

  return <ArticleTeaser article={article} orgslug={orgslug} />
}

export default ArticleReaderPage
