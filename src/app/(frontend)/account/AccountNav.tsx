'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { User, CreditCard, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/billing', label: 'Billing', icon: CreditCard },
  { href: '/account/courses', label: 'My Courses', icon: BookOpen },
]

export const AccountNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav className="lg:w-[200px] flex-shrink-0">
      {/* Desktop: vertical nav */}
      <div className="hidden lg:flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-amber-500/10 text-amber-500 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="flex lg:hidden gap-1 border-b border-border pb-4 mb-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-amber-500/10 text-amber-500 font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
