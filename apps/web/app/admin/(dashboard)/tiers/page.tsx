import React from 'react'
import type { Metadata } from 'next'
import TierList from '@components/Admin/Tiers/TierList'

export const metadata: Metadata = {
  title: 'Tiers',
}

export default function AdminTiersPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Membership Tiers</h1>
        <p className="text-white/40 mt-1">
          Manage membership tiers and their permissions
        </p>
      </div>
      <TierList />
    </div>
  )
}
