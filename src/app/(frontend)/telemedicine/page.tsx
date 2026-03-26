import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers'
import TelemedicineClient from './TelemedicineClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Telemedicine Consultations',
  description:
    'Connect with LIMITLESS longevity clinicians for personalized health guidance. Biomarker review, medication guidance, and health planning via telemedicine.',
  openGraph: {
    title: 'Telemedicine | PATHS by LIMITLESS',
    description: 'Connect with longevity clinicians for personalized health guidance.',
    type: 'website',
  },
}

export default async function TelemedicinePage() {
  const payload = await getPayload({ config: configPromise })
  const headersList = await getHeaders()

  let isAuthenticated = false
  try {
    const auth = await payload.auth({ headers: headersList })
    isAuthenticated = !!auth.user
  } catch {}

  return <TelemedicineClient isAuthenticated={isAuthenticated} />
}
