import type { Payload, PayloadRequest } from 'payload'

/**
 * Fetch a user's health profile. Returns null if no profile exists.
 * Used by AI endpoints for personalization with graceful degradation.
 */
export async function getHealthProfile(
  userId: string,
  payload: Payload,
  req: PayloadRequest,
): Promise<any | null> {
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
