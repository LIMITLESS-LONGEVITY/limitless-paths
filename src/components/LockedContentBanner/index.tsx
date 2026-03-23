import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export const LockedContentBanner: React.FC<{
  tierRequired: string
}> = ({ tierRequired }) => {
  const tierLabel = tierRequired.charAt(0).toUpperCase() + tierRequired.slice(1)

  return (
    <div className="relative">
      {/* Fade gradient overlay */}
      <div className="h-20 bg-gradient-to-b from-transparent to-background" />

      {/* Inline upgrade banner */}
      <div className="flex items-center gap-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            This is {tierLabel} content
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade your plan to continue reading this and all {tierLabel.toLowerCase()} content.
          </p>
        </div>
        <Link
          href="/account/billing"
          className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors whitespace-nowrap"
        >
          Upgrade
        </Link>
      </div>
    </div>
  )
}
