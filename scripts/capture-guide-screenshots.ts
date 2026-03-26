/**
 * PATHS Platform Guide — Screenshot Capture Script
 *
 * Captures annotated screenshots of the platform for use in guide documentation.
 *
 * Usage:
 *   npx tsx scripts/capture-guide-screenshots.ts
 *   npx tsx scripts/capture-guide-screenshots.ts --base-url http://localhost:3000
 *   npx tsx scripts/capture-guide-screenshots.ts --role user-free
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const DEFAULT_BASE_URL = 'https://paths.limitless-longevity.health'
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'guide', 'screenshots')
const VIEWPORT = { width: 1280, height: 800 }

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2)
  let baseUrl = DEFAULT_BASE_URL
  let targetRole: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) {
      baseUrl = args[i + 1]
      i++
    }
    if (args[i] === '--role' && args[i + 1]) {
      targetRole = args[i + 1]
      i++
    }
  }

  return { baseUrl, targetRole }
}

// Ensure screenshot directory exists
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Take a screenshot with consistent naming
async function capture(page: Page, role: string, name: string, options?: { fullPage?: boolean }) {
  const dir = path.join(SCREENSHOT_DIR, role)
  ensureDir(dir)
  const filePath = path.join(dir, `${name}.png`)
  await page.screenshot({
    path: filePath,
    fullPage: options?.fullPage ?? false,
  })
  console.log(`  ✓ ${role}/${name}.png`)
}

// Wait for page to be fully loaded
async function waitForLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  // Extra wait for animations to settle
  await page.waitForTimeout(500)
}

// Login helper
async function login(page: Page, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/login`)
  await waitForLoad(page)
  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"], input[type="password"]', password)
  await page.click('button[type="submit"]')
  await waitForLoad(page)
  // Wait for redirect after login
  await page.waitForTimeout(1000)
}

// ─── Screenshot Scenarios ───────────────────────────────────────────────────────

type ScenarioFn = (page: Page, baseUrl: string) => Promise<void>

const scenarios: Record<string, ScenarioFn> = {
  // ── Public / Free User Screenshots ──────────────────────────────
  'user-free': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Free User screenshots')

    // Homepage
    await page.goto(baseUrl)
    await waitForLoad(page)
    await capture(page, 'user-free', 'homepage')

    // Registration page
    await page.goto(`${baseUrl}/register`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'register-form')

    // Login page
    await page.goto(`${baseUrl}/login`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'login-form')

    // Articles listing
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'articles-listing')

    // Courses listing
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'courses-listing')

    // Search page
    await page.goto(`${baseUrl}/search`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'search-page')

    // Try clicking on an article (if available)
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const firstArticle = page.locator('a[href^="/articles/"]').first()
    if (await firstArticle.isVisible()) {
      await firstArticle.click()
      await waitForLoad(page)
      await capture(page, 'user-free', 'article-detail')
    }

    // Try clicking on a course (if available)
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    const firstCourse = page.locator('a[href^="/courses/"]').first()
    if (await firstCourse.isVisible()) {
      await firstCourse.click()
      await waitForLoad(page)
      await capture(page, 'user-free', 'course-preview')
    }
  },

  // ── Paid User Screenshots ──────────────────────────────────────
  'user-paid': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Paid User screenshots')

    // Login as paid user
    await login(page, baseUrl, process.env.PAID_USER_EMAIL || 'premium@test.com', process.env.PAID_USER_PASSWORD || 'Test1234!')

    // Homepage (logged in)
    await page.goto(baseUrl)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'homepage-logged-in')

    // Header with user menu
    await capture(page, 'user-paid', 'header-user-menu')

    // Courses listing (with enrollment status)
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'courses-listing')

    // Try to show enrolled course
    const enrolledCourse = page.locator('a[href^="/courses/"]').first()
    if (await enrolledCourse.isVisible()) {
      await enrolledCourse.click()
      await waitForLoad(page)
      await capture(page, 'user-paid', 'course-detail')

      // Try to access a lesson
      const lessonLink = page.locator('a[href*="/lessons/"]').first()
      if (await lessonLink.isVisible()) {
        await lessonLink.click()
        await waitForLoad(page)
        await capture(page, 'user-paid', 'lesson-view')
      }
    }

    // Account page
    await page.goto(`${baseUrl}/account`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'account-overview')

    // Account courses
    await page.goto(`${baseUrl}/account/courses`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'account-courses')

    // Billing page
    await page.goto(`${baseUrl}/account/billing`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'billing-page')

    // Search with results
    await page.goto(`${baseUrl}/search`)
    await waitForLoad(page)
    const searchInput = page.locator('input[type="search"], input[type="text"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('longevity')
      await page.keyboard.press('Enter')
      await waitForLoad(page)
      await capture(page, 'user-paid', 'search-results')
    }

    // Article with AI tutor
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const article = page.locator('a[href^="/articles/"]').first()
    if (await article.isVisible()) {
      await article.click()
      await waitForLoad(page)
      await capture(page, 'user-paid', 'article-with-sidebar')

      // Try opening AI tutor
      const tutorButton = page.locator('button:has-text("AI Tutor"), button:has-text("tutor")')
      if (await tutorButton.isVisible()) {
        await tutorButton.click()
        await waitForLoad(page)
        await capture(page, 'user-paid', 'ai-tutor-panel')
      }
    }
  },

  // ── Organization User Screenshots ──────────────────────────────
  'user-organization': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Organization User screenshots')

    await login(page, baseUrl, process.env.ORG_USER_EMAIL || 'org-user@test.com', process.env.ORG_USER_PASSWORD || 'Test1234!')

    await page.goto(baseUrl)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'homepage-org-user')

    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'courses-org-view')

    await page.goto(`${baseUrl}/account`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'account-org-user')
  },

  // ── Contributor Screenshots ────────────────────────────────────
  'contributor': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Contributor screenshots')

    await login(page, baseUrl, process.env.CONTRIBUTOR_EMAIL || 'contributor@test.com', process.env.CONTRIBUTOR_PASSWORD || 'Test1234!')

    // Admin dashboard (contributor view)
    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'admin-dashboard')

    // Articles collection
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'articles-list')

    // Create new article
    await page.goto(`${baseUrl}/admin/collections/articles/create`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'create-article')

    // Lexical editor (if article editor is visible)
    await page.waitForTimeout(1000)
    await capture(page, 'contributor', 'lexical-editor')
  },

  // ── Editor Screenshots ─────────────────────────────────────────
  'editor': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Editor screenshots')

    await login(page, baseUrl, process.env.EDITOR_EMAIL || 'editor@test.com', process.env.EDITOR_PASSWORD || 'Test1234!')

    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'editor', 'admin-dashboard')

    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'editor', 'articles-review-list')

    // Try to open an article for review
    const articleRow = page.locator('table tbody tr').first()
    if (await articleRow.isVisible()) {
      await articleRow.click()
      await waitForLoad(page)
      await capture(page, 'editor', 'article-review-view')
    }
  },

  // ── Publisher Screenshots ──────────────────────────────────────
  'publisher': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Publisher screenshots')

    await login(page, baseUrl, process.env.PUBLISHER_EMAIL || 'publisher@test.com', process.env.PUBLISHER_PASSWORD || 'Test1234!')

    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'publisher', 'admin-dashboard')

    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'publisher', 'articles-publish-list')
  },

  // ── Admin Screenshots ──────────────────────────────────────────
  'admin': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Admin screenshots')

    await login(page, baseUrl, process.env.ADMIN_EMAIL || 'admin@test.com', process.env.ADMIN_PASSWORD || 'Test1234!')

    // Admin dashboard overview
    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'admin', 'dashboard-overview')

    // Users collection
    await page.goto(`${baseUrl}/admin/collections/users`)
    await waitForLoad(page)
    await capture(page, 'admin', 'users-list')

    // Membership tiers
    await page.goto(`${baseUrl}/admin/collections/membership-tiers`)
    await waitForLoad(page)
    await capture(page, 'admin', 'tiers-list')

    // Tenants
    await page.goto(`${baseUrl}/admin/collections/tenants`)
    await waitForLoad(page)
    await capture(page, 'admin', 'tenants-list')

    // Courses
    await page.goto(`${baseUrl}/admin/collections/courses`)
    await waitForLoad(page)
    await capture(page, 'admin', 'courses-list')

    // Modules
    await page.goto(`${baseUrl}/admin/collections/modules`)
    await waitForLoad(page)
    await capture(page, 'admin', 'modules-list')

    // Lessons
    await page.goto(`${baseUrl}/admin/collections/lessons`)
    await waitForLoad(page)
    await capture(page, 'admin', 'lessons-list')

    // Articles
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'admin', 'articles-list')

    // Content pillars
    await page.goto(`${baseUrl}/admin/collections/content-pillars`)
    await waitForLoad(page)
    await capture(page, 'admin', 'content-pillars-list')

    // AI Config global
    await page.goto(`${baseUrl}/admin/globals/ai-config`)
    await waitForLoad(page)
    await capture(page, 'admin', 'ai-config')

    // Site settings
    await page.goto(`${baseUrl}/admin/globals/site-settings`)
    await waitForLoad(page)
    await capture(page, 'admin', 'site-settings')

    // Create user form
    await page.goto(`${baseUrl}/admin/collections/users/create`)
    await waitForLoad(page)
    await capture(page, 'admin', 'create-user')

    // Create course form
    await page.goto(`${baseUrl}/admin/collections/courses/create`)
    await waitForLoad(page)
    await capture(page, 'admin', 'create-course')
  },
}

// ─── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  const { baseUrl, targetRole } = parseArgs()

  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   PATHS Platform Guide — Screenshot Capture      ║')
  console.log('╚═══════════════════════════════════════════════════╝')
  console.log(`\nBase URL: ${baseUrl}`)
  console.log(`Target:   ${targetRole || 'all roles'}`)

  // Ensure base screenshot directory exists
  ensureDir(SCREENSHOT_DIR)

  const browser: Browser = await chromium.launch({ headless: true })

  const rolesToCapture = targetRole ? [targetRole] : Object.keys(scenarios)

  for (const role of rolesToCapture) {
    const scenarioFn = scenarios[role]
    if (!scenarioFn) {
      console.warn(`\n⚠️  Unknown role: ${role}`)
      continue
    }

    const context: BrowserContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2, // Retina screenshots
    })
    const page: Page = await context.newPage()

    try {
      await scenarioFn(page, baseUrl)
    } catch (err) {
      console.error(`\n❌ Error capturing ${role}:`, err)
    } finally {
      await context.close()
    }
  }

  await browser.close()

  // Count total screenshots
  let total = 0
  if (fs.existsSync(SCREENSHOT_DIR)) {
    const dirs = fs.readdirSync(SCREENSHOT_DIR)
    for (const dir of dirs) {
      const dirPath = path.join(SCREENSHOT_DIR, dir)
      if (fs.statSync(dirPath).isDirectory()) {
        total += fs.readdirSync(dirPath).filter((f) => f.endsWith('.png')).length
      }
    }
  }

  console.log(`\n✅ Done! ${total} screenshots captured in ${SCREENSHOT_DIR}`)
}

main().catch(console.error)
