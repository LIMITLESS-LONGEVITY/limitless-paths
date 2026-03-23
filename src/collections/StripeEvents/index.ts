import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'

export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  admin: {
    useAsTitle: 'stripeEventId',
    defaultColumns: ['stripeEventId', 'eventType', 'processed', 'createdAt'],
  },
  fields: [
    { name: 'stripeEventId', type: 'text', required: true, unique: true },
    { name: 'eventType', type: 'text', required: true },
    { name: 'processed', type: 'checkbox', defaultValue: true },
  ],
  access: {
    create: () => false,
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
}
