import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'stripeSubscriptionId',
    defaultColumns: ['user', 'tier', 'status', 'billingInterval', 'currentPeriodEnd', 'cancelAtPeriodEnd'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'tier', type: 'relationship', relationTo: 'membership-tiers', required: true },
    { name: 'stripeSubscriptionId', type: 'text', required: true, unique: true },
    { name: 'stripeCustomerId', type: 'text', required: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'billingInterval', type: 'select', required: true,
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ],
    },
    { name: 'currentPeriodStart', type: 'date' },
    { name: 'currentPeriodEnd', type: 'date' },
    { name: 'cancelAtPeriodEnd', type: 'checkbox', defaultValue: false },
  ],
  access: {
    create: () => false,
    read: canAccessOwnOrStaff,
    update: () => false,
    delete: isAdmin,
  },
}
