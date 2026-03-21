/**
 * Org Admin API service
 * Wraps superadmin-only endpoints for org stats, user search, and member management.
 */

import { getAPIUrl } from '@services/config/config'

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

// ─── Org Stats ───────────────────────────────────────────────────────────────

export interface OrgStats {
  member_count: number
  article_count: number
  course_count: number
  created: string
}

export async function getOrgStats(orgId: string | number, token: string): Promise<OrgStats> {
  const res = await fetch(`${getAPIUrl()}admin/orgs/${orgId}/stats`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch org stats (${res.status})`)
  }
  return res.json()
}

// ─── User Search ──────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: number
  email: string
  first_name: string
  last_name: string
}

export async function searchUsers(email: string, token: string): Promise<UserSearchResult[]> {
  const res = await fetch(
    `${getAPIUrl()}admin/users/search?email=${encodeURIComponent(email)}`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `User search failed (${res.status})`)
  }
  return res.json()
}

// ─── Org Members ──────────────────────────────────────────────────────────────

export async function getOrgMembers(orgId: string | number, token: string, page = 1, limit = 20) {
  const res = await fetch(
    `${getAPIUrl()}orgs/${orgId}/users?page=${page}&limit=${limit}`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch org members (${res.status})`)
  }
  return res.json()
}

export async function addMemberToOrg(
  orgId: string | number,
  userId: string | number,
  roleUuid: string,
  token: string
) {
  const res = await fetch(
    `${getAPIUrl()}orgs/${orgId}/users/${userId}/role/${roleUuid}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to add member (${res.status})`)
  }
  return res.json()
}

export async function removeMemberFromOrg(
  orgId: string | number,
  userId: string | number,
  token: string
) {
  const res = await fetch(
    `${getAPIUrl()}orgs/${orgId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to remove member (${res.status})`)
  }
  return res.json()
}
