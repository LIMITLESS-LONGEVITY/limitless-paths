import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { isAdmin, isAdminOrSelf } from '../../access/isAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role'],
  },
  auth: {
    tokenExpiration: 28800, // 8 hours
    cookies: {
      domain: process.env.COOKIE_DOMAIN || undefined,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Contributor', value: 'contributor' },
        { label: 'Editor', value: 'editor' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'tier',
      type: 'relationship',
      relationTo: 'membership-tiers',
    },
    // Note: 'tenant' field is auto-injected by @payloadcms/plugin-multi-tenant
    // and serves as the organization relationship for access control.
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  access: {
    create: isAdmin,
    read: authenticated,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) =>
      Boolean(user?.role && ['admin', 'editor', 'publisher', 'contributor'].includes(user.role)),
  },
}
