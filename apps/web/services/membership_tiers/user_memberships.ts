import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader, getResponseMetadata } from '@services/utils/ts/requests'

/*
  User Memberships service
  - POST   memberships/assign              — assign tier to user
  - GET    memberships/user/{id}/active    — get user's active membership
  - GET    memberships/user/{id}/history   — get user's membership history
*/

export type AssignTierBody = {
  user_id: number
  tier_id: number
  source?: string
}

export type UserMembership = {
  id: number
  user_id: number
  tier_id: number
  tier_name: string
  tier_slug: string
  status: string
  source: string
  started_at: string
  ended_at: string | null
  creation_date: string
  update_date: string
}

export async function assignTier(
  userId: number,
  tierId: number,
  source: string = 'admin',
  access_token: string
) {
  const body: AssignTierBody = { user_id: userId, tier_id: tierId, source }
  const result = await fetch(
    `${getAPIUrl()}memberships/assign`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getUserActiveMembership(
  userId: number | string,
  access_token?: string
): Promise<UserMembership | null> {
  const result = await fetch(
    `${getAPIUrl()}memberships/user/${userId}/active`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  // 404 means no active membership — return null
  if (result.status === 404) return null
  const res = await getResponseMetadata(result)
  return res.data ?? res
}

export async function getUserMembershipHistory(
  userId: number | string,
  access_token?: string
): Promise<UserMembership[]> {
  const result = await fetch(
    `${getAPIUrl()}memberships/user/${userId}/history`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []
}
