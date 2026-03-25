import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create Account | PATHS by LIMITLESS',
  description: 'Create your PATHS account to begin your longevity education journey.',
}

export default function RegisterPage() {
  return <RegisterForm />
}
