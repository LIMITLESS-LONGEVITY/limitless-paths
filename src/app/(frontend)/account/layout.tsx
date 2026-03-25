import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import { AccountNav } from './AccountNav'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let user: any
  try {
    const auth = await payload.auth({ headers: headersList })
    user = auth.user
  } catch {}

  if (!user) return redirect('/login')

  return (
    <div className="pt-24 pb-24">
      <div className="container">
        <h1 className="text-2xl font-bold mb-8">Account</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <AccountNav />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
