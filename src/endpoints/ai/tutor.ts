import type { Endpoint } from 'payload'
import { streamChat, type ChatMessage } from '../../ai/chat'
import { validateInput } from '../../ai/guardrails'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { buildTutorSystemPrompt } from '../../ai/prompts/tutor'
import { extractTextFromLexical } from '../../ai/utils'
import { getModelConfig } from '../../ai/models'

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

    // 6. Fetch context document (overrideAccess: false to enforce user's access level)
    let contextDoc: any
    try {
      if (body.contextType === 'articles') {
        contextDoc = await req.payload.findByID({
          collection: 'articles',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
      } else if (body.contextType === 'lessons') {
        contextDoc = await req.payload.findByID({
          collection: 'lessons',
          id: body.contextId,
          req,
          overrideAccess: false,
        })
      } else {
        return Response.json(
          { error: 'Invalid contextType. Must be "articles" or "lessons".' },
          { status: 400 },
        )
      }
    } catch {
      return Response.json({ error: 'Content not found' }, { status: 404 })
    }

    // 7. Build messages
    const contentText = extractTextFromLexical(contextDoc.content)
    const systemPrompt = buildTutorSystemPrompt(contextDoc.title, contentText)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(body.conversationHistory ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message },
    ]

    // 8. Stream response
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

          // 9. Log usage (fire-and-forget)
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
