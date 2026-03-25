'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType; mobile?: boolean }> = ({ data, mobile }) => {
  const navItems = data?.navItems || []

  return (
    <nav
      aria-label="Main navigation"
      className={
        mobile
          ? 'flex flex-col gap-4'
          : 'flex gap-6 items-center'
      }
    >
      {navItems.map(({ link }, i) => {
        return (
          <CMSLink
            key={i}
            {...link}
            appearance="link"
            className="text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.15em] font-sans font-medium transition-colors"
          />
        )
      })}
      <Link href="/search" className="text-brand-silver hover:text-brand-gold transition-colors">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-4 h-4" />
      </Link>
    </nav>
  )
}
