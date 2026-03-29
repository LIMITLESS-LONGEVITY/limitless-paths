/**
 * One-time backfill script: sync all existing HealthProfiles to the Digital Twin service.
 *
 * The syncHealthProfileToDT afterChange hook only fires on new writes, so existing
 * profiles need this one-time backfill. Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/backfill-dt-profiles.ts
 * Requires: DATABASE_URL, PAYLOAD_SECRET, DT_SERVICE_URL, DT_SERVICE_KEY
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.js'
import { syncHealthToDT } from '../src/utilities/syncHealthToDT'

async function backfill() {
  console.log('Starting HealthProfile → Digital Twin backfill...')
  const payload = await getPayload({ config: await config })

  const profiles = await payload.find({
    collection: 'health-profiles',
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  console.log(`Found ${profiles.docs.length} health profiles to sync`)

  let synced = 0
  let failed = 0

  for (const profile of profiles.docs) {
    try {
      await syncHealthToDT(profile as any)
      synced++
      console.log(`  ✓ Synced profile ${profile.id} (user: ${typeof profile.user === 'object' ? profile.user.id : profile.user})`)
    } catch (err) {
      failed++
      console.error(`  ✗ Failed profile ${profile.id}:`, (err as Error).message)
    }
  }

  console.log(`\nBackfill complete: ${synced} synced, ${failed} failed out of ${profiles.docs.length} total`)
  process.exit(0)
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
