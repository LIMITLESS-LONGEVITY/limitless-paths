import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  errorHandling,
  getResponseMetadata,
} from '@services/utils/ts/requests'

/*
 * Article API service
 * Follows patterns from services/courses/courses.ts
 */

export interface ArticleFilters {
  pillar_id?: number
  status?: string
  author_id?: number
  page?: number
  limit?: number
}

export async function getArticles(
  orgId: number | string,
  access_token: string | null | undefined,
  filters?: ArticleFilters
) {
  const params = new URLSearchParams()
  params.set('org_id', String(orgId))
  if (filters?.pillar_id) params.set('pillar_id', String(filters.pillar_id))
  if (filters?.status) params.set('status', filters.status)
  if (filters?.author_id) params.set('author_id', String(filters.author_id))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))

  const query = `?${params.toString()}`
  const result: any = await fetch(
    `${getAPIUrl()}articles/${query}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token || undefined)
  )
  const res = await errorHandling(result)
  return res
}

export async function createArticle(
  orgId: number | string,
  data: { title?: string; pillar_id?: number },
  access_token: string | null | undefined
) {
  const body = {
    title: data.title || 'Untitled Article',
    ...(data.pillar_id ? { pillar_id: data.pillar_id } : {}),
  }
  const result: any = await fetch(
    `${getAPIUrl()}articles/?org_id=${orgId}`,
    RequestBodyWithAuthHeader('POST', body, null, access_token || undefined)
  )
  if (!result.ok) {
    const detail = await result.text()
    throw new Error(detail || 'Failed to create article')
  }
  const res = await result.json()
  return res
}

export async function getArticle(
  articleUuid: string,
  access_token: string | null | undefined
) {
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token || undefined)
  )
  const res = await errorHandling(result)
  return res
}

export async function updateArticle(
  articleUuid: string,
  data: any,
  access_token: string | null | undefined,
  autoSave?: boolean
) {
  const query = autoSave !== undefined ? `?auto_save=${autoSave}` : ''
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}${query}`,
    RequestBodyWithAuthHeader('PUT', data, null, access_token || undefined)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function deleteArticle(
  articleUuid: string,
  access_token: string | null | undefined
) {
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token || undefined)
  )
  const res = await errorHandling(result)
  return res
}

export async function transitionArticle(
  articleUuid: string,
  action: 'submit' | 'approve' | 'reject' | 'publish' | 'revise' | 'archive' | 'reopen',
  access_token: string | null | undefined,
  reviewNotes?: string
) {
  const body = reviewNotes ? { review_notes: reviewNotes } : null
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}/${action}`,
    RequestBodyWithAuthHeader('POST', body, null, access_token || undefined)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getArticleVersions(
  articleUuid: string,
  access_token: string | null | undefined
) {
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}/versions`,
    RequestBodyWithAuthHeader('GET', null, null, access_token || undefined)
  )
  const res = await errorHandling(result)
  return res
}

export async function restoreArticleVersion(
  articleUuid: string,
  versionNumber: number,
  access_token: string | null | undefined
) {
  const result: any = await fetch(
    `${getAPIUrl()}articles/${articleUuid}/versions/${versionNumber}/restore`,
    RequestBodyWithAuthHeader('POST', null, null, access_token || undefined)
  )
  const res = await getResponseMetadata(result)
  return res
}
