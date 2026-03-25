import { cn } from '@/utilities/ui'
import React from 'react'

interface Props {
  className?: string
}

export const Logo = (props: Props) => {
  const { className } = props

  return (
    <span
      className={cn(
        'inline-flex items-baseline font-display text-xl tracking-[0.25em] font-light select-none',
        className,
      )}
      aria-label="LIMITLESS"
    >
      <span className="text-current">L</span>
      <span className="text-brand-gold">I</span>
      <span className="text-current">M</span>
      <span className="text-current">I</span>
      <span className="text-current">T</span>
      <span className="text-current">L</span>
      <span className="text-current">E</span>
      <span className="text-current">S</span>
      <span className="text-current">S</span>
    </span>
  )
}
