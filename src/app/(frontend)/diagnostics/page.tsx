import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import DiagnosticsClient from './DiagnosticsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Diagnostic Packages',
  description:
    'Comprehensive health assessments at Hospital Recoletas Salud Marbella. Hospital-grade diagnostics with AI-powered analysis and personalized longevity recommendations.',
  openGraph: {
    title: 'Diagnostic Packages | PATHS by LIMITLESS',
    description:
      'Comprehensive health assessments at Hospital Recoletas Salud Marbella. Hospital-grade diagnostics with AI-powered analysis.',
    type: 'website',
  },
}

export default async function DiagnosticsPage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let isAuthenticated = false
  try {
    const auth = await payload.auth({ headers: headersList })
    isAuthenticated = !!auth.user
  } catch {}

  return <DiagnosticsClient isAuthenticated={isAuthenticated} />
}
