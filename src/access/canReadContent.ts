import type { Access } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'

/**
 * Read access for content collections (Articles, Courses).
 * - Admins/editors/publishers: read everything
 * - Authenticated users: read published content at their access level
 * - Anonymous: read published free content only
 */
export const canReadContent: Access = ({ req: { user } }) => {
  // Admin bypass: editorial roles see everything
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return true
  }

  // Determine effective access levels
  const tierLevel = (user as any)?.tier?.accessLevel as string | undefined
  const orgLevel = (user as any)?.tenant?.contentAccessLevel as string | undefined
  const levels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

  // Published content at user's access level
  return {
    and: [
      { editorialStatus: { equals: 'published' } },
      { accessLevel: { in: levels } },
    ],
  }
}
