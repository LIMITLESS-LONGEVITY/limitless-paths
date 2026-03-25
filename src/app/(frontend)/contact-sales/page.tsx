import type { Metadata } from 'next'
import ContactSalesForm from './ContactSalesForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact Sales',
  description:
    'Get in touch with our team to learn about enterprise longevity education for your organization.',
  openGraph: {
    title: 'Contact Sales | PATHS by LIMITLESS',
    description:
      'Get in touch with our team to learn about enterprise longevity education for your organization.',
    type: 'website',
  },
}

export default function ContactSalesPage() {
  return <ContactSalesForm />
}
