/**
 * Build a health context section for AI prompts.
 * Shared by the tutor (B1), action plans (B2), and daily protocols (C1).
 */
export function buildHealthContextSection(profile: any): string {
  const sections: string[] = []

  // Biomarkers
  if (profile.biomarkers?.length > 0) {
    const markers = profile.biomarkers
      .map((b: any) => {
        const range =
          b.normalRangeLow != null && b.normalRangeHigh != null
            ? `, normal: ${b.normalRangeLow}-${b.normalRangeHigh}`
            : ''
        return `${b.name}: ${b.value} ${b.unit} (${b.status.toUpperCase()}${range})`
      })
      .join('; ')
    sections.push(`Biomarkers: ${markers}`)
  }

  // Health goals
  if (profile.healthGoals?.length > 0) {
    const goals = profile.healthGoals
      .map((g: any) => g.goal.replace(/-/g, ' '))
      .join(', ')
    sections.push(`Goals: ${goals}`)
  }

  // Conditions
  if (profile.conditions?.length > 0) {
    const conditions = profile.conditions.map((c: any) => c.condition).join(', ')
    sections.push(`Conditions: ${conditions}`)
  }

  // Medications
  if (profile.medications?.length > 0) {
    const meds = profile.medications.map((m: any) => m.medication).join(', ')
    sections.push(`Medications: ${meds}`)
  }

  // Pillar priorities
  if (profile.pillarPriorities?.length > 0) {
    const pillars = profile.pillarPriorities
      .map((p: any) => (typeof p.pillar === 'object' ? p.pillar.name : 'Unknown'))
      .join(', ')
    sections.push(`Priority areas: ${pillars}`)
  }

  if (sections.length === 0) return ''

  return `== Health Context (confidential — do not repeat raw data unnecessarily) ==
${sections.join('\n')}

When relevant, connect content to the student's specific health data.
For example, if discussing a biomarker they have measured, reference their actual value.
IMPORTANT: All guidance is educational, not medical advice. Remind the student to consult a qualified healthcare provider for personal medical decisions.`
}
