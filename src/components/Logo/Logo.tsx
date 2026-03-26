import { cn } from '@/utilities/ui'
import React from 'react'

interface Props {
  className?: string
  iconOnly?: boolean
}

/** Inline SVG icon — three converging paths + destination point */
const PathsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn('w-6 h-6', className)}
    aria-hidden="true"
  >
    <path
      d="M3 5 C8 5 12 8 18 12"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M3 12 L18 12"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M3 19 C8 19 12 16 18 12"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="20.5" cy="12" r="2.2" fill="currentColor" />
  </svg>
)

export const Logo = (props: Props) => {
  const { className, iconOnly } = props

  if (iconOnly) {
    return <PathsIcon className={className} />
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 select-none',
        className,
      )}
      aria-label="PATHS by LIMITLESS"
    >
      <PathsIcon />
      <span className="font-display text-xl tracking-[0.25em] font-light">
        PATHS
      </span>
    </span>
  )
}
