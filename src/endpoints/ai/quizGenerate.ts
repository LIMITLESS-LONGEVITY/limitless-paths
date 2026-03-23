import type { Endpoint } from 'payload'
import { chat } from '../../ai/chat'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { buildQuizPrompt, parseQuizResponse } from '../../ai/prompts/quizGenerator'
import { extractTextFromLexical } from '../../ai/utils'
import { getModelConfig } from '../../ai/models'

export const quizGenerateEndpoint: Endpoint = {
  path: '/ai/quiz/generate',
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
      | { contextType?: string; contextId?: string; questionCount?: number }
      | undefined

    if (!body?.contextType || !body?.contextId) {
      return Response.json(
        { error: 'Missing required fields: contextType, contextId' },
        { status: 400 },
      )
    }

    const questionCount = Math.min(Math.max(body.questionCount ?? 5, 1), 10)

    // 4. Check rate limit
    const role = (req.user.role as string) ?? 'user'
    const tier = ((req.user as any)?.tier?.accessLevel as string) ?? 'free'
    const rateLimitResult = await checkRateLimit(
      req.user.id as string,
      'quiz-generate',
      role,
      tier,
      aiConfig.rateLimits as any[],
    )

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: 'Daily quiz generation limit reached. Upgrade your plan for more access.',
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        { status: 429 },
      )
    }

    // 5. Fetch context document (overrideAccess: false to enforce user's access level)
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

    // 6. Build prompt and call AI
    const contentText = extractTextFromLexical(contextDoc.content)
    const prompt = buildQuizPrompt(contextDoc.title, contentText, questionCount)
    const modelConfig = getModelConfig('quizGeneration')
    const maxTokens = (aiConfig.tokenBudgets as any)?.quizMaxTokens ?? modelConfig.maxOutputTokens

    try {
      const result = await chat([{ role: 'user', content: prompt }], 'quizGeneration', {
        maxTokens,
        temperature: 0.7,
      })

      const quiz = parseQuizResponse(result.content)

      // 7. Log usage (fire-and-forget)
      logUsage(req, {
        feature: 'quiz-generate',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        contextCollection: body.contextType,
        contextId: body.contextId,
        durationMs: Date.now() - startTime,
      })

      return Response.json(quiz)
    } catch (err) {
      return Response.json(
        { error: 'Failed to generate quiz. Please try again.' },
        { status: 500 },
      )
    }
  },
}
