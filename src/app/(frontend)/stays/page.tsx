import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import StaysClient from './StaysClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Longevity Stay Packages',
  description:
    'Immersive longevity stays at El Fuerte Marbella. 3-day, 5-day, and 7-day programs combining luxury hospitality with hospital-grade diagnostics and personalized coaching.',
  openGraph: {
    title: 'Longevity Stays | PATHS by LIMITLESS',
    description: 'Immersive longevity stays at El Fuerte Marbella with hospital-grade diagnostics.',
    type: 'website',
  },
}

export default async function StaysPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let isAuthenticated = false
  try {
    const auth = await payload.auth({ headers: headersList })
    isAuthenticated = !!auth.user
  } catch {}

  return <StaysClient isAuthenticated={isAuthenticated} />
}
