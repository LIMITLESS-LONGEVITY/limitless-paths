'use client'
import React from 'react'
import ArticleList from '@components/Dashboard/Pages/Articles/ArticleList'
import { useOrg } from '@components/Contexts/OrgContext'

export default function ArticlesPage() {
  const org = useOrg() as any

  if (!org) {
    return (
      <div className="h-full w-full bg-[#f8f8f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <ArticleList
      orgslug={org.slug}
      org_id={org.id}
    />
  )
}
