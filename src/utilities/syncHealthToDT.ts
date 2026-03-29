/**
 * Dual-write HealthProfile data to the Digital Twin service.
 * Transforms PATHS HealthProfile format to DT API format and sends both
 * profile fields and biomarkers. Fails gracefully — never throws or blocks PATHS.
 */

interface HealthProfileDoc {
  id: string
  user: string | { id: string }
  conditions?: { condition: string }[]
  medications?: { medication: string }[]
  healthGoals?: { goal: string }[]
  pillarPriorities?: { pillar: string | { id: string; name?: string; slug?: string } }[]
  biomarkers?: {
    name: string
    value: number
    unit: string
    date: string
    normalRangeLow?: number | null
    normalRangeHigh?: number | null
    status: string
  }[]
}

export async function syncHealthToDT(doc: HealthProfileDoc): Promise<void> {
  const dtUrl = process.env.DT_SERVICE_URL
  const dtKey = process.env.DT_SERVICE_KEY

  if (!dtUrl || !dtKey) {
    console.error('[syncHealthToDT] Missing DT_SERVICE_URL or DT_SERVICE_KEY — skipping sync')
    return
  }

  const userId = typeof doc.user === 'object' ? doc.user.id : doc.user

  const headers = {
    'Content-Type': 'application/json',
    'x-service-key': dtKey,
  }

  // 1. Sync profile fields
  try {
    const pillarPriorities: Record<string, number> = {}
    if (doc.pillarPriorities) {
      doc.pillarPriorities.forEach((p, i) => {
        const key = typeof p.pillar === 'object'
          ? (p.pillar.slug || p.pillar.name || String(p.pillar.id))
          : String(p.pillar)
        pillarPriorities[key] = i + 1
      })
    }

    const profilePayload = {
      conditions: doc.conditions?.map((c) => c.condition) ?? [],
      medications: doc.medications?.map((m) => m.medication) ?? [],
      healthGoals: doc.healthGoals?.map((g) => g.goal) ?? [],
      pillarPriorities,
    }

    const profileRes = await fetch(`${dtUrl}/api/twin/${userId}/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(profilePayload),
    })

    if (!profileRes.ok) {
      console.error(
        `[syncHealthToDT] Profile sync failed for user ${userId}: ${profileRes.status} ${await profileRes.text().catch(() => '')}`,
      )
    }
  } catch (err) {
    console.error('[syncHealthToDT] Profile sync error:', (err as Error).message)
  }

  // 2. Sync biomarkers
  if (doc.biomarkers && doc.biomarkers.length > 0) {
    try {
      const biomarkers = doc.biomarkers.map((b) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        measuredAt: b.date,
        referenceMin: b.normalRangeLow ?? undefined,
        referenceMax: b.normalRangeHigh ?? undefined,
        status: b.status,
        category: 'user-entered',
        source: 'paths',
      }))

      const bioRes = await fetch(`${dtUrl}/api/twin/${userId}/biomarkers/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ biomarkers }),
      })

      if (!bioRes.ok) {
        console.error(
          `[syncHealthToDT] Biomarker sync failed for user ${userId}: ${bioRes.status} ${await bioRes.text().catch(() => '')}`,
        )
      }
    } catch (err) {
      console.error('[syncHealthToDT] Biomarker sync error:', (err as Error).message)
    }
  }
}
