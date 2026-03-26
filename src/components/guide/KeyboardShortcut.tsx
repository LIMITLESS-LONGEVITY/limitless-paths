'use client'
import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'

export const KeyboardShortcut: React.FC<{
  keys: string[]
  mac?: string[]
  className?: string
}> = ({ keys, mac, className }) => {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac') || navigator.userAgent?.toLowerCase().includes('mac'))
  }, [])

  const displayKeys = isMac && mac ? mac : keys

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {displayKeys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground text-[10px] mx-0.5">+</span>}
          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-[11px] font-mono font-medium rounded border border-border bg-muted/50 text-foreground shadow-sm">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
