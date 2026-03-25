import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Forgot Password | PATHS by LIMITLESS',
  description: 'Reset your PATHS account password.',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
