import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import type { Footer } from '@/payload-types'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  const footerData: Footer = await (await getCachedGlobal('footer', 1))()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto bg-brand-dark text-white relative">
      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

      <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="flex flex-col gap-3">
          <Link href="/">
            <Logo className="text-brand-light" />
          </Link>
          <p className="text-brand-silver text-xs font-sans">
            &copy; {new Date().getFullYear()} Limitless Longevity Consultancy. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col-reverse items-start md:flex-row gap-4 md:items-center">
          <ThemeSelector />
          <nav aria-label="Footer navigation" className="flex flex-col md:flex-row gap-4">
            {navItems.map(({ link }, i) => {
              return (
                <CMSLink
                  className="text-brand-silver hover:text-brand-gold text-xs uppercase tracking-[0.1em] font-sans transition-colors"
                  key={i}
                  {...link}
                />
              )
            })}
          </nav>
        </div>
      </div>
    </footer>
  )
}
