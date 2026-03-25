import { getPayload } from 'payload'
import config from '@payload-config'

// TEMPORARY ENDPOINT — remove after QA password reset
// Protected by PAYLOAD_SECRET, not user auth (since admin is locked out)
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)

  if (!body?.secret || body.secret !== process.env.PAYLOAD_SECRET) {
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
