import React from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'

const BillingSuccessPage = async (props: { params: Promise<{ orgslug: string }> }) => {
  const params = await props.params
  const { orgslug } = params

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md">
        <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Payment successful!</h1>
          <p className="text-gray-500">
            Your membership has been upgraded. You now have access to all premium content.
          </p>
        </div>

        <Link
          href={getUriWithOrg(orgslug, '/articles')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold rounded-lg transition-colors"
        >
          Browse Articles
        </Link>
      </div>
    </div>
  )
}

export default BillingSuccessPage
