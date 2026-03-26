/**
 * CI Migration Script
 *
 * Initializes Payload with prodMigrations to create all database tables.
 * Used in CI before running integration and E2E tests.
 */

import config from '../src/payload.config.js'
import { getPayload } from 'payload'

async function main() {
  console.log('Running database migrations via getPayload()...')
  await getPayload({ config })
  console.log('Migrations applied successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
