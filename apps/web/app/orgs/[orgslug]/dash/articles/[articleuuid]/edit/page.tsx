'use client'
import React from 'react'
import ArticleEditor from '@components/Dashboard/Pages/Articles/ArticleEditor'
import { useOrg } from '@components/Contexts/OrgContext'
import { useParams } from 'next/navigation'

export default function ArticleEditPage() {
  const org = useOrg() as any
  const params = useParams()
  const articleUuid = params?.articleuuid as string

  if (!org || !articleUuid) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f8f8f8]">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <ArticleEditor
      articleUuid={articleUuid}
      org={org}
      orgslug={org.slug}
    />
  )
}
