/**
 * Automated screenshot capture for the PATHS Contributor Guide.
 *
 * Correct navigation flow:
 * 1. Visit homepage (triggers middleware cookies)
 * 2. Login via Next.js proxy (/api/auth/login)
 * 3. Navigate using simplified routes (/dash/*, /articles, /account/general)
 *    NOT /orgs/default/* routes (those 404 in headless navigation)
 *
 * Usage: node docs/contributor-guide/capture-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE = 'https://paths.limitless-longevity.health';
const EMAIL = 'info@limitless-longevity.health';
const PASSWORD = 'Limitless74747!';
const DIR = join(import.meta.dirname, 'docs', 'assets', 'screenshots');

mkdirSync(DIR, { recursive: true });

const snap = (page, name) => {
  console.log(`   -> ${name}`);
  return page.screenshot({ path: join(DIR, name), fullPage: false });
};
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // ========================================
  // PHASE 1: LOGIN PAGE (unauthenticated)
  // ========================================
  // Use a clean context for the login page screenshot
  console.log('1. Login page (unauthenticated)');
  const cleanCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await cleanCtx.newPage();
  await loginPage.goto(`${BASE}/login`);
  await loginPage.waitForLoadState('networkidle');
  await wait(2000);
  // This shows the org-slug entry step — capture it
  await snap(loginPage, 'account-login.png');
  await loginPage.close();
  await cleanCtx.close();

  // ========================================
  // PHASE 2: AUTHENTICATE
  // ========================================
  console.log('2. Authenticating...');
  // Visit homepage first to trigger middleware instance cookies
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await wait(2000);

  // Login via the Next.js proxy (sets all cookies correctly)
  const loginResp = await page.request.post(`${BASE}/api/auth/login`, {
    form: { username: EMAIL, password: PASSWORD }
  });
  console.log(`   Login status: ${loginResp.status()}`);

  // Reload homepage with auth cookies
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await wait(3000);
  console.log(`   Homepage title: ${await page.title()}`);

  // ========================================
  // PHASE 3: HOMEPAGE & DASHBOARD
  // ========================================
  console.log('3. Homepage (authenticated)');
  await snap(page, 'dashboard-overview.png');

  // ========================================
  // PHASE 4: ARTICLES BROWSE
  // ========================================
  console.log('4. Articles browse page');
  await page.goto(`${BASE}/articles`);
  await page.waitForLoadState('networkidle');
  await wait(2000);
  await snap(page, 'dashboard-articles.png');

  // ========================================
  // PHASE 5: DASHBOARD - ARTICLES MANAGEMENT
  // ========================================
  console.log('5. Dashboard - Articles management');
  await page.goto(`${BASE}/dash/articles`);
  await page.waitForLoadState('networkidle');
  await wait(2000);
  await snap(page, 'articles-list.png');

  // ========================================
  // PHASE 6: CREATE ARTICLE
  // ========================================
  console.log('6. Creating article...');
  const newBtn = page.locator('button, a').filter({ hasText: /new article/i }).first();
  if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await newBtn.click();
    await page.waitForLoadState('networkidle');
    await wait(3000);
    console.log(`   Editor URL: ${page.url()}`);
    await snap(page, 'editor-empty.png');

    // Fill title and content
    console.log('7. Adding content...');
    const editables = page.locator('[contenteditable="true"]');
    const count = await editables.count();
    console.log(`   ${count} editable elements`);

    if (count > 0) {
      // First contenteditable is usually the title
      await editables.first().click();
      await page.keyboard.type('Understanding Sleep and Longevity', { delay: 15 });

      // Find the ProseMirror body editor
      const prosemirror = page.locator('.ProseMirror').first();
      if (await prosemirror.isVisible({ timeout: 2000 }).catch(() => false)) {
        await prosemirror.click();
        await page.keyboard.type(
          'Sleep is one of the most powerful tools for longevity. Quality sleep directly impacts cellular repair, immune function, and cognitive health. In this article, we explore the science behind sleep optimisation and practical strategies you can apply today.',
          { delay: 5 }
        );
      }
      await wait(1500);
    }

    // Editor with content — shows toolbar
    await snap(page, 'editor-toolbar.png');

    // Metadata sidebar
    await snap(page, 'editor-metadata.png');

    // Save
    console.log('8. Saving...');
    const saveBtn = page.locator('button').filter({ hasText: /^save$/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await wait(2000);
    }

    // Version history
    console.log('9. Version history...');
    const versionBtn = page.locator('button, a, [role="tab"]').filter({ hasText: /version|history/i }).first();
    if (await versionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await versionBtn.click();
      await wait(2000);
      await snap(page, 'editor-versions.png');
      // Close the overlay
      await page.keyboard.press('Escape');
      await wait(1000);
      // If still blocked, click the backdrop
      const backdrop = page.locator('.bg-black\\/30, [class*="backdrop"]').first();
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backdrop.click({ force: true });
        await wait(1000);
      }
    } else {
      console.log('   Not found');
    }

    // ========================================
    // PHASE 7: EDITORIAL WORKFLOW
    // ========================================

    // Submit for review
    console.log('10. Submit for review...');
    await snap(page, 'workflow-submit.png');
    const submitBtn = page.locator('button').filter({ hasText: /submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await wait(2000);
      // Handle confirmation dialog
      const confirmBtn = page.locator('[role="alertdialog"] button, [role="dialog"] button, .modal button')
        .filter({ hasText: /confirm|yes|submit|ok/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await wait(2000);
      }
      await snap(page, 'workflow-status-badge.png');
    }

    // Approve
    console.log('11. Approve...');
    await wait(1000);
    const approveBtn = page.locator('button').filter({ hasText: /approve/i }).first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await snap(page, 'workflow-review.png');
      await approveBtn.click();
      await wait(2000);
      const confirm2 = page.locator('[role="alertdialog"] button, [role="dialog"] button, .modal button')
        .filter({ hasText: /confirm|yes|approve|ok/i }).first();
      if (await confirm2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm2.click();
        await wait(2000);
      }
    }

    // Publish
    console.log('12. Publish...');
    const publishBtn = page.locator('button').filter({ hasText: /publish/i }).first();
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await snap(page, 'workflow-publish.png');
      await publishBtn.click();
      await wait(2000);
      const confirm3 = page.locator('[role="alertdialog"] button, [role="dialog"] button, .modal button')
        .filter({ hasText: /confirm|yes|publish|ok/i }).first();
      if (await confirm3.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm3.click();
        await wait(2000);
      }
      await snap(page, 'workflow-published.png');
    }
  } else {
    console.log('   WARNING: New Article button not found');
  }

  // ========================================
  // PHASE 8: PROFILE / ACCOUNT
  // ========================================
  console.log('13. Profile page...');
  await page.goto(`${BASE}/account/general`);
  await page.waitForLoadState('networkidle');
  await wait(2000);
  await snap(page, 'account-profile.png');

  // ========================================
  // RESULTS
  // ========================================
  const files = readdirSync(DIR).filter(f => f.endsWith('.png'));
  console.log(`\nDone! Captured ${files.length} screenshots:`);
  files.forEach(f => console.log(`  ${f}`));

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
