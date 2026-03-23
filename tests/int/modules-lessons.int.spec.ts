import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any
let courseId: string

describe('Modules and Lessons', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    try {
      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'modules-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'ModTest',
          role: 'admin',
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'modules-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }

    try {
      const course = await payload.create({
        collection: 'courses',
        data: { title: 'Module Test Course', slug: 'module-test-course' },
      })
      courseId = course.id as string
    } catch {
      const found = await payload.find({
        collection: 'courses',
        where: { slug: { equals: 'module-test-course' } },
      })
      courseId = found.docs[0]?.id as string
    }
  })

  it('creates a module linked to a course', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: {
        title: 'Module 1: Introduction',
        course: courseId,
        order: 1,
      },
    })
    expect(mod.title).toBe('Module 1: Introduction')
    expect(mod.order).toBe(1)
  })

  it('creates a text lesson linked to a module', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: { title: 'Lesson Test Module', course: courseId, order: 2 },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      data: {
        title: 'Lesson 1: Getting Started',
        slug: 'lesson-1-getting-started',
        module: mod.id,
        order: 1,
        lessonType: 'text',
        estimatedDuration: 15,
      },
    })
    expect(lesson.title).toBe('Lesson 1: Getting Started')
    expect(lesson.lessonType).toBe('text')
    expect(lesson.estimatedDuration).toBe(15)
  })

  it('creates a video lesson with YouTube embed', async () => {
    const mod = await payload.create({
      collection: 'modules',
      data: { title: 'Video Lesson Module', course: courseId, order: 3 },
    })

    const lesson = await payload.create({
      collection: 'lessons',
      data: {
        title: 'Video Lesson',
        slug: 'video-lesson-test',
        module: mod.id,
        order: 1,
        lessonType: 'video',
        videoEmbed: {
          platform: 'youtube',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
        },
        estimatedDuration: 10,
      },
    })
    expect(lesson.lessonType).toBe('video')
    expect(lesson.videoEmbed?.platform).toBe('youtube')
    expect(lesson.videoEmbed?.videoId).toBe('dQw4w9WgXcQ')
  })
})
