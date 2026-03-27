/**
 * CI Staging Migration Script
 *
 * Runs Payload migrations against the staging database on Render.
 * Uses explicit SSL config because Render's external PostgreSQL
 * requires SSL and the pg driver needs ssl: { rejectUnauthorized: false }
 * passed directly to the pool (NODE_TLS_REJECT_UNAUTHORIZED doesn't work).
 *
 * Unlike ci-migrate.ts (which uses push: true for schema creation),
 * this uses push: false and runs actual migrations — matching production.
 */

import { getPayload } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import configPromise from '../src/payload.config.js'

async function main() {
  console.log('Running migrations against staging DB...')

  const config = await configPromise

  config.db = postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    },
    push: false,
    prodMigrations: (await import('../src/migrations/index.js')).migrations,
  })

  await getPayload({ config })
  console.log('Staging migrations complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Staging migration failed:', err)
  process.exit(1)
})
