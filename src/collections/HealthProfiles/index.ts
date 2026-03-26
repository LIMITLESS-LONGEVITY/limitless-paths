import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin } from '../../access/isAdmin'

export const HealthProfiles: CollectionConfig = {
  slug: 'health-profiles',
  admin: {
    useAsTitle: 'user',
    defaultColumns: ['user', 'updatedAt'],
    description: 'User health data for personalized AI features. Strictly access-controlled.',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      admin: { description: 'One health profile per user (1:1 relationship)' },
    },
    {
      name: 'biomarkers',
      type: 'array',
      admin: { description: 'Health biomarker measurements from diagnostic assessments' },
      fields: [
        { name: 'name', type: 'text', required: true, admin: { description: 'e.g. "Vitamin D", "HbA1c", "ApoB", "hs-CRP"' } },
        { name: 'value', type: 'number', required: true },
        { name: 'unit', type: 'text', required: true, admin: { description: 'e.g. "ng/mL", "%", "mg/dL"' } },
        { name: 'date', type: 'date', required: true },
        { name: 'normalRangeLow', type: 'number' },
        { name: 'normalRangeHigh', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' },
          ],
        },
      ],
    },
    {
      name: 'healthGoals',
      type: 'array',
      admin: { description: 'User-selected health improvement goals' },
      fields: [
        {
          name: 'goal',
          type: 'select',
          required: true,
          options: [
            { label: 'Improve Sleep', value: 'improve-sleep' },
            { label: 'Lose Weight', value: 'lose-weight' },
            { label: 'Increase Energy', value: 'increase-energy' },
            { label: 'Reduce Inflammation', value: 'reduce-inflammation' },
            { label: 'Build Muscle', value: 'build-muscle' },
            { label: 'Improve Cognition', value: 'improve-cognition' },
            { label: 'Cardiovascular Health', value: 'cardiovascular-health' },
            { label: 'Hormone Balance', value: 'hormone-balance' },
            { label: 'Longevity Optimization', value: 'longevity-optimization' },
            { label: 'Stress Management', value: 'stress-management' },
          ],
        },
      ],
    },
    {
      name: 'conditions',
      type: 'array',
      admin: { description: 'User-reported health conditions (optional)' },
      fields: [
        { name: 'condition', type: 'text', required: true },
      ],
    },
    {
      name: 'medications',
      type: 'array',
      admin: { description: 'Current medications (optional)' },
      fields: [
        { name: 'medication', type: 'text', required: true },
      ],
    },
    {
      name: 'pillarPriorities',
      type: 'array',
      admin: { description: 'Ordered list of content pillars the user prioritizes' },
      fields: [
        {
          name: 'pillar',
          type: 'relationship',
          relationTo: 'content-pillars',
          required: true,
        },
      ],
    },
  ],
  access: {
    create: authenticated,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: isAdmin,
  },
}
