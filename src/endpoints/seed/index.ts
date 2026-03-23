import type { Payload, PayloadRequest } from 'payload'

export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding default LIMITLESS data...')

  // Seed membership tiers
  const tiers = [
    {
      name: 'Free',
      slug: 'free',
      accessLevel: 'free' as const,
      displayOrder: 0,
      isActive: true,
      features: [
        { feature: 'Browse free articles' },
        { feature: 'Basic content pillars' },
      ],
    },
    {
      name: 'Regular',
      slug: 'regular',
      accessLevel: 'regular' as const,
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      displayOrder: 1,
      isActive: true,
      features: [
        { feature: 'All free content' },
        { feature: 'Regular-tier articles' },
        { feature: 'AI tutor (basic)' },
      ],
    },
    {
      name: 'Premium',
      slug: 'premium',
      accessLevel: 'premium' as const,
      monthlyPrice: 29.99,
      yearlyPrice: 299.99,
      displayOrder: 2,
      isActive: true,
      features: [
        { feature: 'All regular content' },
        { feature: 'Premium courses' },
        { feature: 'AI tutor (advanced)' },
        { feature: 'AI quiz generation' },
      ],
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      accessLevel: 'enterprise' as const,
      displayOrder: 3,
      isActive: true,
      features: [
        { feature: 'All premium content' },
        { feature: 'Organization management' },
        { feature: 'Custom content assignments' },
        { feature: 'Analytics dashboard' },
      ],
    },
  ]

  for (const tier of tiers) {
    const existing = await payload.find({
      req,
      overrideAccess: true,
      collection: 'membership-tiers',
      where: { slug: { equals: tier.slug } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ req, overrideAccess: true, collection: 'membership-tiers', data: tier })
      payload.logger.info(`  Created tier: ${tier.name}`)
    } else {
      payload.logger.info(`  Tier already exists: ${tier.name}`)
    }
  }

  // Seed content pillars
  const pillars = [
    { name: 'Nutrition', slug: 'nutrition', icon: 'nutrition', description: 'Diet, supplements, and metabolic health', displayOrder: 1 },
    { name: 'Movement', slug: 'movement', icon: 'movement', description: 'Exercise, mobility, and physical performance', displayOrder: 2 },
    { name: 'Sleep', slug: 'sleep', icon: 'sleep', description: 'Sleep quality, circadian rhythm, and recovery', displayOrder: 3 },
    { name: 'Mental Health', slug: 'mental-health', icon: 'mental-health', description: 'Stress management, mindfulness, and cognitive health', displayOrder: 4 },
    { name: 'Diagnostics', slug: 'diagnostics', icon: 'diagnostics', description: 'Biomarkers, testing, and health monitoring', displayOrder: 5 },
    { name: 'Longevity Science', slug: 'longevity-science', icon: 'longevity-science', description: 'Aging research, interventions, and cutting-edge science', displayOrder: 6 },
  ]

  for (const pillar of pillars) {
    const existing = await payload.find({
      req,
      overrideAccess: true,
      collection: 'content-pillars',
      where: { slug: { equals: pillar.slug } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ req, overrideAccess: true, collection: 'content-pillars', data: { ...pillar, isActive: true } })
      payload.logger.info(`  Created pillar: ${pillar.name}`)
    } else {
      payload.logger.info(`  Pillar already exists: ${pillar.name}`)
    }
  }

  // Seed default tenant
  const existingTenant = await payload.find({
    req,
    overrideAccess: true,
    collection: 'tenants',
    where: { slug: { equals: 'limitless' } },
    limit: 1,
  })
  if (existingTenant.totalDocs === 0) {
    await payload.create({
      req,
      overrideAccess: true,
      collection: 'tenants',
      data: { name: 'LIMITLESS', slug: 'limitless' },
    })
    payload.logger.info('  Created tenant: LIMITLESS')
  } else {
    payload.logger.info('  Tenant already exists: LIMITLESS')
  }

  // Seed site settings
  const freeTier = await payload.find({
    req,
    overrideAccess: true,
    collection: 'membership-tiers',
    where: { slug: { equals: 'free' } },
    limit: 1,
  })
  await payload.updateGlobal({
    req,
    overrideAccess: true,
    slug: 'site-settings',
    data: {
      siteName: 'PATHS by LIMITLESS',
      siteDescription: 'AI-integrated longevity education platform',
      ...(freeTier.docs[0] ? { defaultTier: freeTier.docs[0].id } : {}),
    },
  })
  payload.logger.info('  Updated site settings')

  payload.logger.info('Seeding complete!')
}
