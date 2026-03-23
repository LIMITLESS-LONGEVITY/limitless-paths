import type { CollectionAfterReadHook } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'

/**
 * Shared afterRead hook for content collections (Articles, Courses).
 * Computes whether the content is locked for the requesting user.
 *
 * Adds virtual fields to API response:
 * - `locked: boolean` — whether the user lacks access
 * - For locked content: `content` is replaced with a teaser (excerpt only)
 *
 * This is a virtual field pattern — `locked` is not a database column.
 */
export const computeLockedStatus: CollectionAfterReadHook = async ({ doc, req }) => {
  const user = req.user

  // Admin bypass — never locked
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return { ...doc, locked: false }
  }

  const tierLevel = (user as any)?.tier?.accessLevel as string | undefined
  const orgLevel = (user as any)?.tenant?.contentAccessLevel as string | undefined
  const effectiveLevels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

  const contentLevel = doc.accessLevel as string
  const locked = !effectiveLevels.includes(contentLevel as any)

  if (locked) {
    // Return teaser: keep metadata + excerpt, remove full content
    return {
      ...doc,
      locked: true,
      content: null, // Full Lexical content hidden
      // Preserved: title, slug, excerpt, featuredImage, pillar, accessLevel, author, publishedAt
    }
  }

  return { ...doc, locked: false }
}
