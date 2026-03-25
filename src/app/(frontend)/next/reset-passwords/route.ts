import { getPayload } from 'payload'
import config from '@payload-config'

// TEMPORARY ENDPOINT — remove immediately after QA password reset
// One-time use, protected by hardcoded token (admin is locked out, no access to PAYLOAD_SECRET)
const RESET_TOKEN = 'qa-reset-2026-03-25-xK9mP2vL'

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)

  if (!body?.token || body.token !== RESET_TOKEN) {
    return new Response('Forbidden.', { status: 403 })
  }

  const newPassword = body.password || 'TestUser2026!'

  const payload = await getPayload({ config })

  try {
    // Find all users
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 100,
      overrideAccess: true,
    })

    const results: Array<{ email: string; status: string }> = []

    for (const user of users) {
      try {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            password: newPassword,
            lockUntil: null as unknown as string,
            loginAttempts: 0,
          },
          overrideAccess: true,
        })
        results.push({ email: user.email, status: 'reset' })
      } catch (err) {
        results.push({ email: user.email, status: `error: ${err}` })
      }
    }

    return Response.json({ success: true, results })
  } catch (e) {
    payload.logger.error({ err: e, message: 'Error resetting passwords' })
    return new Response('Error resetting passwords.', { status: 500 })
  }
}
