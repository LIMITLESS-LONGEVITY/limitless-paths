'use client'
import React from 'react'
import PillarList from '@components/Admin/Pillars/PillarList'

export default function PillarsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-2">Content Pillars</h1>
      <p className="text-white/50 mb-6">Manage content categories for articles and courses</p>
      <PillarList />
    </div>
  )
}
