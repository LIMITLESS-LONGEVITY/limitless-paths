/**
 * Compute the current phase of a stay enrollment.
 * Used to determine which content modules are accessible.
 */
export type StayPhase = 'pre-arrival' | 'during-stay' | 'post-stay' | 'follow-up-expired' | null

export function getStayPhase(
  enrollment: any,
  followUpMonths?: number | null,
): StayPhase {
  if (!enrollment?.stayStartDate) return null

  const now = new Date()
  const start = new Date(enrollment.stayStartDate)
  const end = enrollment.stayEndDate ? new Date(enrollment.stayEndDate) : null

  if (now < start) return 'pre-arrival'
  if (end && now <= end) return 'during-stay'

  // Post-stay period
  if (end && followUpMonths) {
    const followUpEnd = new Date(end)
    followUpEnd.setMonth(followUpEnd.getMonth() + followUpMonths)
    if (now <= followUpEnd) return 'post-stay'
    return 'follow-up-expired'
  }

  return 'post-stay'
}

/**
 * Compute which day of the stay the user is currently on (1-indexed).
 * Returns null if not during a stay.
 */
export function getStayDayNumber(enrollment: any): number | null {
  if (!enrollment?.stayStartDate) return null

  const now = new Date()
  const start = new Date(enrollment.stayStartDate)

  if (now < start) return null

  const diffMs = now.getTime() - start.getTime()
  const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return dayNumber
}

/**
 * Check if a specific module (by index) is accessible given the stay phase and day.
 * Convention: first N modules are pre-stay, next M modules are during-stay days,
 * remaining are post-stay. The module's position is determined by a `stayPhase` field
 * on the module, or inferred by index.
 */
export function isModuleAccessible(
  moduleIndex: number,
  totalPreStayModules: number,
  stayPhase: StayPhase,
  currentDayNumber: number | null,
): boolean {
  if (!stayPhase) return true // Not a stay course, no gating

  // Pre-stay modules always accessible once enrolled
  if (moduleIndex < totalPreStayModules) return true

  // During-stay modules
  const stayDayIndex = moduleIndex - totalPreStayModules
  if (stayPhase === 'pre-arrival') return false // Can't access during-stay content yet
  if (stayPhase === 'during-stay') {
    return currentDayNumber !== null && stayDayIndex < currentDayNumber
  }

  // Post-stay: all during-stay content is accessible (for review)
  if (stayPhase === 'post-stay') return true

  // Follow-up expired: could restrict, but for now allow access
  return true
}
