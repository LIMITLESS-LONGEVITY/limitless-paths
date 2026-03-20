import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests'

/*
  Content Pillars service
  - GET    pillars/        — list all pillars (public)
  - POST   pillars/        — create pillar (superadmin)
  - PUT    pillars/{id}    — update pillar (superadmin)
  - DELETE pillars/{id}    — delete pillar (superadmin)
*/

export type ContentPillar = {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  org_id: number | null
  creation_date: string | null
  update_date: string | null
}

export type CreatePillarBody = {
  name: string
  slug: string
  description?: string
  icon?: string
  display_order?: number
  is_active?: boolean
  org_id?: number | null
}

export type UpdatePillarBody = Partial<CreatePillarBody>

export async function getPillars(access_token?: string): Promise<ContentPillar[]> {
  const result = await fetch(
    `${getAPIUrl()}pillars/`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res.data
}

export async function createPillar(body: CreatePillarBody, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}pillars/`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function updatePillar(
  pillarId: number | string,
  body: UpdatePillarBody,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}pillars/${pillarId}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function deletePillar(pillarId: number | string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}pillars/${pillarId}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}
