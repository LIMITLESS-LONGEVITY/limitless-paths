import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { checkRateLimit } from '../../ai/rateLimiter'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'
import { getStayPhase, getStayDayNumber } from '../../utilities/getStayPhase'
import { buildDailyProtocolPrompt, parseDailyProtocolResponse } from '../../ai/prompts/dailyProtocol'

export const dailyProtocolEndpoint: Endpoint = {
  path: '/ai/daily-protocol',
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

    const body = (await req.json?.()) as { date?: string; regenerate?: boolean } | undefined
    const targetDate = body?.date || new Date().toISOString().split('T')[0]

    // Check for existing protocol (unless regenerate)
    if (!body?.regenerate) {
      const existing = await req.payload.find({
        collection: 'daily-protocols',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { date: { equals: targetDate } },
            { status: { equals: 'ready' } },
          ],
        },
        limit: 1,
        overrideAccess: true,
        req,
      })
      if (existing.docs[0]) {
        return Response.json({ protocol: existing.docs[0] })
      }
    }

    // Rate limit
    const tier = ((req.user as any)?.tier?.accessLevel as string) ?? 'free'
    const role = (req.user.role as string) ?? 'user'
    const rateLimitResult = await checkRateLimit(
      req.user.id as string,
      'daily-protocol',
      role,
      tier,
      aiConfig.rateLimits as any[],
    )
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'Daily protocol generation limit reached.', limit: rateLimitResult.limit },
        { status: 429 },
      )
    }

    try {
      // Gather context: enrolled courses
      const enrollments = await req.payload.find({
        collection: 'enrollments',
        where: { user: { equals: req.user.id }, status: { in: ['active', 'completed'] } },
        depth: 2,
        limit: 10,
        overrideAccess: true,
        req,
      })

      const enrolledCourses = enrollments.docs
        .map((e: any) => {
          const course = typeof e.course === 'object' ? e.course : null
          if (!course) return null
          const pillarName = typeof course.pillar === 'object' ? course.pillar?.name : 'General'
          return { title: course.title, pillarName }
        })
        .filter(Boolean) as Array<{ title: string; pillarName: string }>

      // Recent lesson progress
      const recentProgress = await req.payload.find({
        collection: 'lesson-progress',
        where: { user: { equals: req.user.id }, status: { equals: 'completed' } },
        sort: '-completedAt',
        depth: 2,
        limit: 5,
        overrideAccess: true,
        req,
      })

      const recentLessons = recentProgress.docs.map((lp: any) => {
        const lesson = typeof lp.lesson === 'object' ? lp.lesson : null
        const enrollment = typeof lp.enrollment === 'object' ? lp.enrollment : null
        const course = enrollment && typeof enrollment.course === 'object' ? enrollment.course : null
        return {
          title: lesson?.title || 'Lesson',
          courseTitle: course?.title || 'Course',
        }
      })

      // RAG context from enrolled pillar topics
      const pillarQuery = enrolledCourses.map((c) => c.pillarName).join(' ') || 'longevity health'
      const chunks = await retrieveRelevantChunks(
        `daily protocol ${pillarQuery}`,
        req.payload,
        req,
        { limit: 6 },
      )

      // Health profile
      const healthProfile = await getHealthProfile(req.user.id as string, req.payload, req)

      // Check for active stay enrollment
      let stayContext: string | null = null
      for (const e of enrollments.docs) {
        const enrollment = e as any
        const phase = getStayPhase(enrollment)
        if (phase === 'during-stay') {
          const dayNumber = getStayDayNumber(enrollment)
          const course = typeof enrollment.course === 'object' ? enrollment.course : null
          const location = course?.stayLocation || 'the hotel'
          const stayType = course?.stayType || 'stay'
          stayContext = `The student is on Day ${dayNumber} of a ${stayType} longevity stay at ${location}. Include hotel-specific activities: morning wellness routine, spa recovery, Mediterranean nutrition, evening relaxation. Reference the day's scheduled activities from the stay program.`
          break
        }
      }

      // Generate
      const prompt = buildDailyProtocolPrompt(enrolledCourses, recentLessons, chunks, healthProfile, stayContext)
      const messages: ChatMessage[] = [{ role: 'system', content: prompt }]

      const modelConfig = getModelConfig('dailyProtocol')
      const maxTokens = (aiConfig.tokenBudgets as any)?.dailyProtocolMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'dailyProtocol', { maxTokens, temperature: 0.6 })

      const parsed = parseDailyProtocolResponse(result.content)
      if (!parsed) {
        return Response.json({ error: 'Failed to generate protocol. Please try again.' }, { status: 500 })
      }

      // Archive any existing protocol for this date
      const oldProtocols = await req.payload.find({
        collection: 'daily-protocols',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { date: { equals: targetDate } },
          ],
        },
        overrideAccess: true,
        req,
      })
      for (const old of oldProtocols.docs) {
        await req.payload.update({
          collection: 'daily-protocols',
          id: old.id,
          data: { status: 'archived' },
          overrideAccess: true,
          req,
        })
      }

      // Create new protocol
      const protocol = await req.payload.create({
        collection: 'daily-protocols',
        data: {
          user: req.user.id,
          date: targetDate,
          status: 'ready',
          protocol: { blocks: parsed.blocks },
          completedCount: 0,
          totalCount: parsed._totalCount,
          generatedAt: new Date().toISOString(),
        },
        overrideAccess: true,
        req,
      })

      // Log usage
      logUsage(req, {
        feature: 'daily-protocol',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startTime,
      })

      return Response.json({ protocol })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Daily protocol generation failed' })
      return Response.json({ error: 'Failed to generate protocol. Please try again.' }, { status: 500 })
    }
  },
}
