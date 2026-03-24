import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'
import { Media } from '@/components/Media'
import { TierBadge } from '@/components/TierBadge'

export type ContentListItemData = {
  slug: string
  title: string
  excerpt?: string | null
  accessLevel: string
  pillarName?: string
  authorName?: string
  featuredImage?: any
  readTime?: string
  meta?: string
}

export const ContentListItem: React.FC<{
  item: ContentListItemData
  href: string
  className?: string
}> = ({ item, href, className }) => {
  return (
    <Link
      href={href}
      className={cn(
        'flex gap-4 p-4 rounded-lg border border-border hover:bg-card/50 transition-colors items-center',
        className,
      )}
    >
      {item.featuredImage && (
        <div className="hidden sm:block flex-shrink-0 w-[140px] h-[90px] rounded-lg overflow-hidden bg-muted">
          {typeof item.featuredImage !== 'string' && (
            <Media resource={item.featuredImage} className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center text-[10px] mb-1">
          {item.pillarName && (
            <span className="text-amber-500 font-semibold uppercase">{item.pillarName}</span>
          )}
          <TierBadge tier={item.accessLevel} />
        </div>
        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
        {item.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.excerpt}</p>
        )}
        {item.authorName && (
          <p className="text-xs text-muted-foreground mt-1">{item.authorName}</p>
        )}
      </div>
      {(item.readTime || item.meta) && (
        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
          {item.readTime || item.meta}
        </span>
      )}
    </Link>
  )
}
