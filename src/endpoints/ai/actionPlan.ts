import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'
import { buildActionPlanPrompt, parseActionPlanResponse } from '../../ai/prompts/actionPlan'

export const actionPlanEndpoint: Endpoint = {
  path: '/ai/action-plan',
  method: 'post',
  handler: async (req) => {
    const startTime = Date.now()

    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const aiConfig = await req.payload.findGlobal({ slug: 'ai-config', req, overrideAccess: true })
    if (!aiConfig.enabled) {
      return Response.json({ error: 'AI features are currently disabled' }, { status: 503 })
    }

    const body = (await req.json?.()) as { enrollmentId?: string } | undefined
    if (!body?.enrollmentId) {
      return Response.json({ error: 'Missing enrollmentId' }, { status: 400 })
    }

    // Check rate limit
    const tier = ((req.user as any)?.tier?.accessLevel as string) ?? 'free'
    const role = (req.user.role as string) ?? 'user'
    const rateLimitResult = await checkRateLimit(
      req.user.id as string,
      'action-plan',
      role,
      tier,
      aiConfig.rateLimits as any[],
    )
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'Action plan generation limit reached. Upgrade for more access.', limit: rateLimitResult.limit },
        { status: 429 },
      )
    }

    try {
      // Fetch enrollment with course data
      const enrollment = await req.payload.findByID({
        collection: 'enrollments',
        id: body.enrollmentId,
        depth: 2,
        req,
        overrideAccess: false,
      })

      if (!enrollment) {
        return Response.json({ error: 'Enrollment not found' }, { status: 404 })
      }

      const course = typeof enrollment.course === 'object' ? enrollment.course : null
      if (!course) {
        return Response.json({ error: 'Course data not available' }, { status: 400 })
      }

      const pillarName = typeof course.pillar === 'object' ? (course.pillar as any)?.name : 'General'

      // Retrieve course content via RAG
      const chunks = await retrieveRelevantChunks(
        `${course.title} ${pillarName} longevity`,
        req.payload,
        req,
        { limit: 8 },
      )

      // Fetch health profile
      const healthProfile = await getHealthProfile(req.user.id as string, req.payload, req)

      // Build prompt and generate
      const prompt = buildActionPlanPrompt(course.title as string, pillarName, chunks, healthProfile)
      const messages: ChatMessage[] = [{ role: 'system', content: prompt }]

      const modelConfig = getModelConfig('actionPlan')
      const maxTokens = (aiConfig.tokenBudgets as any)?.actionPlanMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'actionPlan', { maxTokens, temperature: 0.5 })

      const plan = parseActionPlanResponse(result.content)
      if (!plan) {
        return Response.json({ error: 'Failed to generate a valid action plan. Please try again.' }, { status: 500 })
      }

      // Store the plan
      const actionPlan = await req.payload.create({
        collection: 'action-plans',
        data: {
          user: req.user.id,
          enrollment: body.enrollmentId,
          course: course.id,
          pillar: typeof course.pillar === 'object' ? (course.pillar as any)?.id : undefined,
          status: 'ready',
          plan,
          healthProfileSnapshot: healthProfile
            ? { biomarkers: healthProfile.biomarkers, healthGoals: healthProfile.healthGoals }
            : null,
          generatedAt: new Date().toISOString(),
        },
        req,
        overrideAccess: true,
      })

      // Log usage
      logUsage(req, {
        feature: 'action-plan',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startTime,
      })

      return Response.json({ actionPlan })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Action plan generation failed' })
      return Response.json({ error: 'Failed to generate action plan. Please try again.' }, { status: 500 })
    }
  },
}
