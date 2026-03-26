import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import React from 'react'
import HealthProfileClient from './HealthProfileClient'

export const dynamic = 'force-dynamic'

export default async function HealthProfilePage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) return null

  // Fetch existing health profile
  const profileResult = await payload.find({
    collection: 'health-profiles',
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  // Fetch content pillars for priorities
  const pillarsResult = await payload.find({
    collection: 'content-pillars',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 20,
  })

  const existingProfile = profileResult.docs[0] || null
  const pillars = pillarsResult.docs.map((p: any) => ({
    id: p.id,
    name: p.name,
  }))

  return (
    <HealthProfileClient
      existingProfile={existingProfile}
      pillars={pillars}
      userId={user.id as string}
    />
  )
}
