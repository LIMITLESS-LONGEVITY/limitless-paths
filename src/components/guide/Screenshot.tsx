import React from 'react'
import Image from 'next/image'
import { cn } from '@/utilities/ui'

export const Screenshot: React.FC<{
  src: string
  alt: string
  caption?: string
  className?: string
}> = ({ src, alt, caption, className }) => {
  const imageSrc = src.startsWith('/') ? src : `/guide/screenshots/${src}`

  return (
    <figure className={cn('my-8', className)}>
      <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
        <Image
          src={imageSrc}
          alt={alt}
          width={1200}
          height={675}
          className="w-full h-auto"
          quality={90}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
