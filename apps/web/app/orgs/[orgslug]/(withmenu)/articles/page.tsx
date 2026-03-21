import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth/server'
import { getCanonicalUrl, getOrgSeoConfig, buildPageTitle } from '@/lib/seo/utils'
import ArticleBrowse from '@components/Pages/Articles/ArticleBrowse'

type MetadataProps = {
  params: Promise<{ orgslug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(props: MetadataProps): Promise<Metadata> {
  const params = await props.params
  const org = await getOrganizationContextInfo(params.orgslug, {
    revalidate: 0,
    tags: ['organizations'],
  })

  const seoConfig = getOrgSeoConfig(org)
  const title = buildPageTitle('Articles', org.name, seoConfig)
  const description = seoConfig.default_meta_description || `Articles from ${org.name}`
  const canonical = getCanonicalUrl(params.orgslug, '/articles')

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
  }
}

const ArticlesPage = async (params: any) => {
  const orgslug = (await params.params).orgslug
  const org = await getOrganizationContextInfo(orgslug, {
    revalidate: 1800,
    tags: ['organizations'],
  })

  return (
    <ArticleBrowse orgslug={orgslug} org_id={org.id} />
  )
}

export default ArticlesPage
