import React from 'react'
import { ContentListItem, type ContentListItemData } from '@/components/ContentListItem'

export const ContentList: React.FC<{
  items: Array<ContentListItemData & { href: string }>
}> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No content found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <ContentListItem key={item.slug} item={item} href={item.href} />
      ))}
    </div>
  )
}
