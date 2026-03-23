import PageTemplate, { generateMetadata } from './[slug]/page'

export default PageTemplate

export { generateMetadata }

// Payload CMS requires a database connection — cannot prerender at build time
export const dynamic = 'force-dynamic'
