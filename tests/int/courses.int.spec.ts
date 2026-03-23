import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let adminUser: any

describe('Courses collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    try {
      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'courses-test-admin@test.com',
          password: 'TestPassword123!',
          firstName: 'Admin',
          lastName: 'CourseTest',
          role: 'admin',
        },
      })
    } catch {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: 'courses-test-admin@test.com' } },
      })
      adminUser = found.docs[0]
    }
  })

  it('creates a course with defaults', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: 'Test Course',
        slug: 'test-course-crud',
        instructor: adminUser.id,
      },
    })
    expect(course.title).toBe('Test Course')
    expect(course.editorialStatus).toBe('draft')
    expect(course.accessLevel).toBe('premium') // Courses default to premium
  })

  it('supports versioning', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: 'Versioned Course',
        slug: 'test-course-versioned',
      },
    })

    await payload.update({
      collection: 'courses',
      id: course.id,
      data: { title: 'Versioned Course v2' },
    })

    const versions = await payload.findVersions({
      collection: 'courses',
      where: { parent: { equals: course.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
