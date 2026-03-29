import type { Payload, PayloadRequest } from 'payload'

/**
 * Fetch a user's health profile from the Digital Twin API.
 * Falls back to local Payload query if DT is unreachable.
 * Used by AI endpoints for personalization with graceful degradation.
 */
export async function getHealthProfile(
  userId: string,
  payload: Payload,
  req: PayloadRequest,
): Promise<any | null> {
  const dtUrl = process.env.DT_SERVICE_URL
  const dtKey = process.env.DT_SERVICE_KEY

  if (dtUrl && dtKey) {
    try {
      const headers = { 'x-service-key': dtKey }

      const [profileRes, biomarkersRes] = await Promise.all([
        fetch(`${dtUrl}/api/twin/${userId}/profile`, { headers }),
        fetch(`${dtUrl}/api/twin/${userId}/biomarkers?limit=50`, { headers }),
      ])

      if (profileRes.ok) {
        const profile = await profileRes.json()
        const bioData = biomarkersRes.ok ? await biomarkersRes.json() : null

        return transformDTResponse(profile, bioData?.biomarkers ?? [])
      }

      // DT returned non-OK — fall through to Payload
      console.warn(`[getHealthProfile] DT profile fetch returned ${profileRes.status} for user ${userId}, falling back to Payload`)
    } catch (err) {
      console.warn(`[getHealthProfile] DT unreachable for user ${userId}, falling back to Payload:`, (err as Error).message)
    }
  }

  // Fallback: local Payload query
  try {
    const result = await payload.find({
      collection: 'health-profiles',
      where: { user: { equals: userId } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      req,
    })
    return result.docs[0] ?? null
  } catch {
    return null
  }
}

/**
 * Transform DT API response to match the Payload HealthProfile shape
 * that AI endpoints and the health page expect.
 */
function transformDTResponse(
  profile: {
    conditions?: string[]
    medications?: string[]
    healthGoals?: string[]
    pillarPriorities?: Record<string, number>
  },
  biomarkers: {
    name: string
    value: number
    unit: string
    measuredAt: string
    referenceMin?: number | null
    referenceMax?: number | null
    status: string
  }[],
): any {
  return {
    conditions: (profile.conditions ?? []).map((c) => ({ condition: c })),
    medications: (profile.medications ?? []).map((m) => ({ medication: m })),
    healthGoals: (profile.healthGoals ?? []).map((g) => ({ goal: g })),
    pillarPriorities: Object.entries(profile.pillarPriorities ?? {})
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => ({ pillar: { name: key } })),
    biomarkers: biomarkers.map((b) => ({
      name: b.name,
      value: b.value,
      unit: b.unit,
      date: b.measuredAt,
      normalRangeLow: b.referenceMin ?? undefined,
      normalRangeHigh: b.referenceMax ?? undefined,
      status: b.status,
    })),
  }
}
