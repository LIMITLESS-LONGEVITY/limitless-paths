import type { Endpoint } from 'payload'
import { streamChat, type ChatMessage } from '../../ai/chat'
import { validateInput } from '../../ai/guardrails'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { buildTutorSystemPrompt } from '../../ai/prompts/tutor'
import { extractTextFromLexical } from '../../ai/utils'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'

export const tutorEndpoint: Endpoint = {
  path: '/ai/tutor',
  method: 'post',
  handler: async (req) => {
    const startTime = Date.now()

    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Check if AI is enabled
    const aiConfig = await req.payload.findGlobal({ slug: 'ai-config', req, overrideAccess: true })
    if (!aiConfig.enabled) {
      return Response.json({ error: 'AI features are currently disabled' }, { status: 503 })
    }

    // 3. Parse request body
    const body = (await req.json?.()) as
      | {
          message?: string
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
          contextType?: string
          contextId?: string
        }
      | undefined

    if (!body?.message || !body?.contextType || !body?.contextId) {
      return Response.json(
        { error: 'Missing required fields: message, contextType, contextId' },
        { status: 400 },
      )
    }

    // 4. Validate input
    try {
      validateInput({
        message: body.message,
        conversationLength: body.conversationHistory?.length ?? 0,
      })
    } catch (err) {
      const modelConfig = getModelConfig('tutor')
      logUsage(req, {
        feature: 'tutor-chat',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: 0,
        outputTokens: 0,
        contextCollection: body.contextType,
        contextId: body.contextId,
        refused: true,
        durationMs: Date.now() - startTime,
      })
      return Response.json({ error: (err as Error).message }, { status: 400 })
    }

    // 5. Check rate limit
    const role = (req.user.role as string) ?? 'user'
    const tier = ((req.user as any)?.tier?.accessLevel as string) ?? 'free'
    const rateLimitResult = await checkRateLimit(
      req.user.id as string,
      'tutor-chat',
      role,
      tier,
      aiConfig.rateLimits as any[],
    )

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: 'Daily AI tutor limit reached. Upgrade your plan for more access.',
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        { status: 429 },
      )
    }

    // 6. Retrieve relevant chunks via RAG (graceful degradation)
    let chunks: any[] = []
    try {
      chunks = await retrieveRelevantChunks(body.message, req.payload, req, {
        limit: 5,
      })
    } catch (ragErr) {
      req.payload.logger.warn('RAG retrieval failed, continuing without context:', ragErr)
    }

    // 7. Ensure current document is represented
    // If no chunks from current doc in results, fetch its most relevant chunk
    const currentDocInResults = chunks.some(
      (c) => c.sourceId === body.contextId && c.sourceCollection === body.contextType,
    )
    if (!currentDocInResults) {
      try {
        const contextDoc = await req.payload.findByID({
          collection: body.contextType as 'articles' | 'lessons',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
        if (contextDoc) {
          // Add a priority chunk from the current doc
          chunks = [
            {
              id: 'priority',
              text: extractTextFromLexical(contextDoc.content).slice(0, 2000),
              sourceCollection: body.contextType,
              sourceId: body.contextId,
              sourceTitle: contextDoc.title as string,
              accessLevel: (contextDoc as any).accessLevel ?? 'free',
              chunkIndex: 0,
              relevanceScore: 1,
            },
            ...chunks.slice(0, 4), // Keep top 4 RAG results + priority
          ]
        }
      } catch {}
    }

    // 7b. Fetch health profile for personalization (graceful degradation)
    let healthProfile: any = null
    try {
      healthProfile = await getHealthProfile(req.user.id as string, req.payload, req)
    } catch {
      // Health profile unavailable — continue without personalization
    }

    // 8. Build messages with RAG context + optional health context
    const systemPrompt = buildTutorSystemPrompt(
      chunks.find((c) => c.sourceId === body.contextId)?.sourceTitle ?? 'this content',
      chunks,
      healthProfile,
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(body.conversationHistory ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message },
    ]

    // 9. Stream response
    const modelConfig = getModelConfig('tutor')
    const maxTokens = (aiConfig.tokenBudgets as any)?.tutorMaxTokens ?? modelConfig.maxOutputTokens

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(messages, 'tutor', { maxTokens })
          let result = await generator.next()

          while (!result.done) {
            const chunk = `data: ${JSON.stringify({ text: result.value })}\n\n`
            controller.enqueue(encoder.encode(chunk))
            result = await generator.next()
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          // 10. Log usage (fire-and-forget)
          const usage = result.value
          logUsage(req, {
            feature: 'tutor-chat',
            provider: modelConfig.provider,
            model: modelConfig.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            contextCollection: body.contextType,
            contextId: body.contextId,
            durationMs: Date.now() - startTime,
          })
        } catch (err) {
          const errorChunk = `data: ${JSON.stringify({ error: 'An error occurred while generating the response.' })}\n\n`
          controller.enqueue(encoder.encode(errorChunk))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  },
}
