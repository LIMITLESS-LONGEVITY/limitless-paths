import { cn } from '@/utilities/ui'
import React from 'react'

const TIER_STYLES: Record<string, string> = {
  free: 'text-muted-foreground',
  regular: 'text-muted-foreground bg-muted',
  premium: 'text-amber-500 bg-amber-500/10',
  enterprise: 'text-amber-500 bg-amber-500/15',
}

export const TierBadge: React.FC<{
  tier: string
  className?: string
}> = ({ tier, className }) => {
  if (tier === 'free') return null

  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
        TIER_STYLES[tier] ?? TIER_STYLES.regular,
        className,
      )}
    >
      {tier}
    </span>
  )
}
