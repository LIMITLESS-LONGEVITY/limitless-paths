import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: Request): Promise<Response> {
  // One-time use: check for secret token
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (token !== 'limitless-reset-2026') {
    return Response.json({ error: 'Invalid token' }, { status: 403 })
  }

  const payload = await getPayload({ config })

  // Find all users
  const users = await payload.find({
    collection: 'users',
    overrideAccess: true,
    limit: 10,
  })

  const userList = users.docs.map((u: any) => ({
    id: u.id,
    email: u.email,
    role: u.role,
  }))

  // Reset first admin user's password
  const admin = users.docs.find((u: any) => u.role === 'admin')
  if (admin) {
    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { password: 'LimitlessAdmin2026!' } as any,
      overrideAccess: true,
    })
    return Response.json({
      message: 'Password reset successful',
      email: (admin as any).email,
      newPassword: 'LimitlessAdmin2026!',
      users: userList,
    })
  }

  return Response.json({ message: 'No admin user found', users: userList })
}
