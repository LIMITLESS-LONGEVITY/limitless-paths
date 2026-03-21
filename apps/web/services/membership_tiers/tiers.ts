import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests'

/*
  Membership Tiers service
  - GET    tiers/          — list all tiers
  - POST   tiers/          — create tier
  - GET    tiers/{id}      — get tier by id
  - PUT    tiers/{id}      — update tier
  - GET    tiers/{id}/count — user count for tier
*/

export type TierPermissions = Record<string, boolean | number | string>

export type CreateTierBody = {
  name: string
  slug: string
  description?: string
  priority?: number
  is_active?: boolean
  permissions?: TierPermissions
  stripe_product_id?: string
  stripe_price_monthly_id?: string
  stripe_price_yearly_id?: string
  price_monthly_display?: string
  price_yearly_display?: string
}

export type UpdateTierBody = Partial<CreateTierBody>

export type MembershipTier = {
  id: number
  name: string
  slug: string
  description: string | null
  priority: number
  is_active: boolean
  permissions: TierPermissions
  creation_date: string
  update_date: string
  stripe_product_id?: string | null
  stripe_price_monthly_id?: string | null
  stripe_price_yearly_id?: string | null
  price_monthly_display?: string | null
  price_yearly_display?: string | null
}

export async function getTiers(access_token?: string): Promise<MembershipTier[]> {
  const result = await fetch(
    `${getAPIUrl()}tiers/`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res.data
}

export async function getTier(tierId: number | string, access_token?: string): Promise<MembershipTier> {
  const result = await fetch(
    `${getAPIUrl()}tiers/${tierId}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res.data
}

export async function createTier(body: CreateTierBody, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}tiers/`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function updateTier(tierId: number | string, body: UpdateTierBody, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}tiers/${tierId}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getTierUserCount(tierId: number | string, access_token?: string): Promise<number> {
  const result = await fetch(
    `${getAPIUrl()}tiers/${tierId}/count`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  // API returns { count: number } or just a number
  return typeof res.data === 'number' ? res.data : (res.data?.count ?? 0)
}
