import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { buildDiscoverPrompt, parseDiscoverResponse } from '../../ai/prompts/discover'

export const discoverEndpoint: Endpoint = {
  path: '/ai/discover',
  method: 'post',
  handler: async (req) => {
    const startTime = Date.now()

    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Check AI enabled
    const aiConfig = await req.payload.findGlobal({ slug: 'ai-config', req, overrideAccess: true })
    if (!aiConfig.enabled) {
      return Response.json({ error: 'AI features are currently disabled' }, { status: 503 })
    }

    // 3. Parse input
    const body = (await req.json?.()) as { query?: string; limit?: number } | undefined
    if (!body?.query || body.query.trim().length < 3) {
      return Response.json({ error: 'Please describe your goal (min 3 characters)' }, { status: 400 })
    }

    const limit = Math.min(body.limit ?? 5, 10)

    // 4. Rate limit
    const tier = ((req.user as any)?.tier?.accessLevel as string) ?? 'free'
    const role = (req.user.role as string) ?? 'user'
    const rateLimitResult = await checkRateLimit(
      req.user.id as string,
      'content-discover',
      role,
      tier,
      aiConfig.rateLimits as any[],
    )
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'Daily discovery limit reached. Upgrade your plan for more access.', limit: rateLimitResult.limit },
        { status: 429 },
      )
    }

    try {
      // 5. Semantic search for candidates (wider net)
      const chunks = await retrieveRelevantChunks(body.query, req.payload, req, { limit: 20 })

      // 6. Deduplicate by source document
      const seen = new Set<string>()
      const candidates = chunks
        .filter((c) => {
          const key = `${c.sourceCollection}:${c.sourceId}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map((c) => ({
          sourceId: c.sourceId,
          sourceCollection: c.sourceCollection,
          sourceTitle: c.sourceTitle,
          snippet: c.text.slice(0, 200),
          accessLevel: c.accessLevel,
        }))

      if (candidates.length === 0) {
        return Response.json({ path: [], message: 'No relevant content found for your goal.' })
      }

      // 7. AI ranks and structures into learning path
      const prompt = buildDiscoverPrompt(body.query, candidates)
      const messages: ChatMessage[] = [
        { role: 'system', content: prompt },
        { role: 'user', content: body.query },
      ]

      const modelConfig = getModelConfig('discover')
      const maxTokens = (aiConfig.tokenBudgets as any)?.discoverMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'discover', { maxTokens, temperature: 0.3 })

      // 8. Parse response
      const path = parseDiscoverResponse(result.content, candidates).slice(0, limit)

      // 9. Log usage
      logUsage(req, {
        feature: 'content-discover',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startTime,
      })

      return Response.json({ path })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Content discovery failed' })
      return Response.json({ error: 'Failed to generate learning path. Please try again.' }, { status: 500 })
    }
  },
}
