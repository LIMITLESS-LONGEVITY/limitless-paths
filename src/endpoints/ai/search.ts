import type { Endpoint } from 'payload'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { getEffectiveAccessLevels } from '../../utilities/accessLevels'

export const semanticSearchEndpoint: Endpoint = {
  path: '/ai/search',
  method: 'post',
  handler: async (req) => {
    const startTime = Date.now()

    // 1. Parse request
    const body = (await req.json?.()) as {
      query?: string
      pillar?: string
      limit?: number
    } | undefined

    if (!body?.query || body.query.trim().length === 0) {
      return Response.json({ error: 'Missing required field: query' }, { status: 400 })
    }

    // 2. Check AI enabled
    const aiConfig = await req.payload.findGlobal({ slug: 'ai-config', req, overrideAccess: true })
    if (!aiConfig.enabled) {
      return Response.json({ error: 'AI features are currently disabled' }, { status: 503 })
    }

    // 3. Rate limit (authenticated users only)
    if (req.user) {
      const role = (req.user.role as string) ?? 'user'
      const tier = (req.user as any)?.tier?.accessLevel as string ?? 'free'
      const rateLimitResult = await checkRateLimit(
        req.user.id as string, 'semantic-search', role, tier,
        aiConfig.rateLimits as any[],
      )
      if (!rateLimitResult.allowed) {
        return Response.json({
          error: 'Daily search limit reached. Upgrade your plan for more searches.',
        }, { status: 429 })
      }
    }

    const limit = Math.min(Math.max(body.limit ?? 10, 1), 20)

    // 4. Retrieve chunks
    try {
      const chunks = await retrieveRelevantChunks(
        body.query, req.payload, req,
        { limit: limit * 2, pillarFilter: body.pillar }, // fetch extra for dedup
      )

      // 5. Deduplicate by source document (take highest-scoring chunk per doc)
      const seen = new Map<string, typeof chunks[0]>()
      for (const chunk of chunks) {
        const key = `${chunk.sourceCollection}:${chunk.sourceId}`
        if (!seen.has(key) || chunk.relevanceScore > seen.get(key)!.relevanceScore) {
          seen.set(key, chunk)
        }
      }

      const deduped = Array.from(seen.values()).slice(0, limit)

      // 6. Compute locked status for each result
      const userLevels = req.user
        ? getEffectiveAccessLevels(
            (req.user as any)?.tier?.accessLevel ?? null,
            (req.user as any)?.tenant?.contentAccessLevel ?? null,
          )
        : ['free']

      const results = deduped.map((chunk) => ({
        title: chunk.sourceTitle,
        slug: '', // Will need to fetch from source doc
        collection: chunk.sourceCollection,
        accessLevel: chunk.accessLevel,
        locked: !userLevels.includes(chunk.accessLevel as any),
        snippet: chunk.text.slice(0, 300),
        relevanceScore: chunk.relevanceScore,
      }))

      // 7. Log usage
      logUsage(req, {
        feature: 'semantic-search',
        provider: 'jina',
        model: 'jina-embeddings-v3',
        inputTokens: Math.ceil(body.query.length / 4),
        outputTokens: 0,
        durationMs: Date.now() - startTime,
      })

      return Response.json({ results })
    } catch (err) {
      return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 })
    }
  },
}
