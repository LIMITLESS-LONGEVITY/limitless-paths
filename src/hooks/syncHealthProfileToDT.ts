import type { CollectionAfterChangeHook } from 'payload'
import { syncHealthToDT } from '../utilities/syncHealthToDT'

/**
 * Fire-and-forget dual-write of HealthProfile data to the Digital Twin service.
 * Runs as afterChange hook on the HealthProfiles collection.
 */
export const syncHealthProfileToDT: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const { payload } = req

  // Fetch with depth to resolve pillar relationships for slug/name
  try {
    const full = await payload.findByID({
      collection: 'health-profiles',
      id: doc.id,
      depth: 1,
      overrideAccess: true,
      req,
    })

    // Fire-and-forget — don't await in a way that blocks the response
    syncHealthToDT(full as any).catch((err) => {
      payload.logger.error({ err, message: `[syncHealthProfileToDT] Failed for profile ${doc.id}` })
    })
  } catch (err: any) {
    payload.logger.error({ err, message: `[syncHealthProfileToDT] Failed to fetch profile ${doc.id}` })
  }

  return doc
}
