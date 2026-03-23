import type { CollectionAfterChangeHook } from 'payload'

/**
 * Recalculate course completion percentage when lesson progress changes.
 * Stub — full implementation in Task 4.
 */
export const updateEnrollmentProgress: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (doc.status === previousDoc?.status) return doc
  return doc
}
