'use client'
import React, { useEffect, useState } from 'react'
import { getPillars, ContentPillar } from '@services/content_pillars/pillars'

interface PillarTabsProps {
  onSelect: (pillarId: number | null) => void
  selectedPillarId: number | null
}

export default function PillarTabs({ onSelect, selectedPillarId }: PillarTabsProps) {
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPillars()
      .then((data) => setPillars(data || []))
      .catch(() => setPillars([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse shrink-0" />
        ))}
      </div>
    )
  }

  if (pillars.length === 0) return null

  const activePillars = pillars.filter((p) => p.is_active)

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* "All" tab */}
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          selectedPillarId === null
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>

      {activePillars.map((pillar) => (
        <button
          key={pillar.id}
          onClick={() => onSelect(pillar.id)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedPillarId === pillar.id
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {pillar.icon && <span className="mr-1">{pillar.icon}</span>}
          {pillar.name}
        </button>
      ))}
    </div>
  )
}
