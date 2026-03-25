# Browser QA Test Report — 2026-03-25

## Summary
- **Total:** 45 tests | **Passed:** 40 | **Failed:** 2 | **Skipped:** 0 | **Findings:** 2 | **Fixed during QA:** 1
- **Environment:** Production (`paths.limitless-longevity.health`)
- **Browser:** Chromium (Playwright MCP)
- **Tester:** Claude Opus 4.6 (automated via Playwright MCP + Chrome DevTools MCP)

## Critical Regression Tests (3 previously fixed bugs)

| Bug | Test | Result |
|-----|------|--------|
| Video embed not rendering | W5-03: YouTube iframe loads with thumbnail, play button | **PASS** |
| Quiz not showing correct answer | W5-04/W5-05: Wrong answer = red X, correct = green check | **PASS** |
| AI Tutor "Something went wrong" | W6-05: Unauth = "Please sign in" / W6-07: Free tier = "Not available on plan" | **PASS** |

All 3 critical regression bugs are confirmed fixed in production.

---

## Workflow Results

### W1: Admin Login & Platform Health Check

| Test | Result | Details |
|------|--------|---------|
| Admin login | PASS | `admin@limitless-longevity.health` / `TestUser2026!` |
| Collections visible | PASS | 22 collections (18 custom + 4 template/plugin) |
| Globals visible | PASS | 4 globals: Header, Footer, Ai Config, Site Settings |
| Users list | PASS | 5 accounts with correct roles |
| Tiers | PASS | 4/4: Free, Regular ($9.99), Premium ($29.99), Enterprise |
| Pillars | PASS | 6/6: Nutrition, Movement, Sleep, Mental Health, Diagnostics, Longevity Science |
| AI Config | PASS | Enabled, tutor 1024 tokens, quiz 2048 tokens |
| QA user creation | PASS | `qa-free-user@limitless.test` (ID 7, free tier, LIMITLESS tenant) |

### W2: Contributor — Content Creation

| Test | Result | Details |
|------|--------|---------|
| Contributor login | PASS | `sarah.contributor@test.com` |
| Article creation form | PASS | All fields present and functional |
| H2 heading (markdown shortcut) | PASS | `## ` converted to heading |
| Paragraph text | PASS | Text entered after heading |
| Video Embed block | PASS | YouTube platform, URL, caption filled |
| Quiz Question block | PASS | 4 options, correctAnswer=1, explanation |
| Callout block | PASS | Type: Info, content filled |
| Save as draft | PASS | Status: Draft, version 1 |
| Submit for review | PASS | Status changed to In Review, version 2 |
| Contributor status restriction | **FINDING** | Contributor sees ALL status options (Draft, In Review, Approved, Published, Archived) — expected restriction to Draft/In Review only |

### W3: Editor — Review & Approval

| Test | Result | Details |
|------|--------|---------|
| Editor login | PASS | `editor@test.com` |
| Content blocks verified | PASS | All 5 block types intact |
| Approve article | PASS | Status → Approved, version 3 |
| Editor status restriction | **FINDING** | Editor sees ALL status options including Published — expected restriction |

### W4: Publisher — Publishing

| Test | Result | Details |
|------|--------|---------|
| Publisher login | PASS | `publisher@test.com` |
| Publish article | PASS | Status → Published, `_status=published`, version 4 |
| Slug auto-generation | **FINDING** | Slug field was empty — had to manually enter. Auto-generate from title didn't work. |
| Published At | PASS | Auto-set to 03/25/2026 |
| Frontend articles listing | PASS | Article visible with pillar badge, title, excerpt, author |
| Frontend article page | PASS | Title, pillar, author, date render correctly |
| Video embed on frontend | PASS | YouTube iframe renders with thumbnail, play button, caption |
| Quiz on frontend | PASS | 4 options render as interactive buttons |
| Callout on frontend | **FAIL** | Renders as "unknown node" — missing Lexical JSX converter for callout block |

### W5: Frontend Content Verification

| Test | Result | Severity | Details |
|------|--------|----------|---------|
| Article header (5.1) | PASS | — | Title, pillar, author, date |
| Heading + paragraph (5.2) | PASS | — | H2 and paragraph render |
| Video embed (5.3) | **PASS** | CRITICAL | YouTube iframe loads correctly |
| Quiz wrong answer (5.4) | **PASS** | CRITICAL | Red X on wrong, green check on correct, explanation shown |
| Quiz correct answer (5.5) | **PASS** | CRITICAL | Green highlight, no red, explanation shown |
| Callout block (5.6) | **FAIL** | MEDIUM | "unknown node" — missing block converter |
| Sidebar (5.7) | PASS | — | ToC + AI Tutor button present |
| Mobile viewport (5.8) | PASS | — | Responsive, no overflow, sidebar collapsed |
| TEST ARTICLE (5.9) | PASS | — | Video + quiz render, no errors |

### W6: Free User — Consumer Experience

| Test | Result | Severity | Details |
|------|--------|----------|---------|
| Articles listing unauth (6.1) | PASS | — | 2 free articles visible |
| Free article content (6.2-6.4) | PASS | — | Full content, video, quiz all work |
| AI Tutor unauth (6.5) | **PASS** | CRITICAL | "Please sign in to use the AI Tutor." |
| Free user login (6.6) | PASS | — | JWT set, admin panel correctly blocks user role |
| AI Tutor free tier (6.7) | **PASS** | CRITICAL | "AI Tutor is not available on your current plan. Upgrade for access." |
| Premium article (6.8) | **PASS** | — | LockedContentBanner shown: "This is Premium content", Upgrade button links to /account/billing |
| Account page (6.9) | PASS | — | Profile, Billing, My Courses tabs working |
| Stripe checkout (6.10) | **FAIL** | LOW | `/api/billing/checkout` returns 500 |
| Mobile (6.11) | PASS | — | Articles listing, article, tutor all responsive |

### W7: Regression & Cross-Cutting

| Test | Result | Details |
|------|--------|---------|
| YouTube Shorts regex (7.1) | PASS | Regex extracts video ID from `/shorts/` URLs |
| Standard YouTube embed (7.2) | PASS | Regression confirmed |
| Quiz correctAnswer=0 (7.3) | **PASS** | Added quiz with correctAnswer=0 (Vitamin D). First option highlights green correctly. |
| Quiz correctAnswer=1 fixed (7.4) | **PASS** | TEST ARTICLE correctAnswer fixed from 3→1. Option B ("no") now highlights green. |
| AI Tutor 401 (7.5) | PASS | Regression confirmed |
| AI Tutor 429/limit=0 (7.6) | PASS | Regression confirmed |
| Navigation flow (7.7) | PASS | Home → Articles → Article → Back works |
| Admin logout (7.8) | PASS | Clean redirect to login |

---

## Bugs Found

### FAIL — Must Fix Before Launch

| # | Severity | Component | Description | Workflow |
|---|----------|-----------|-------------|----------|
| 1 | **MEDIUM** | Lexical JSX Converter | Callout block renders as "unknown node" on frontend. Console error: `Lexical => JSX converter: Blocks converter` missing for callout block type. | W4, W5 |
| 2 | **LOW** | Stripe Billing | `/api/billing/checkout` returns 500 when free user clicks Monthly upgrade. Likely missing Stripe price IDs or customer creation flow. | W6 |

### FINDINGS — Should Fix

| # | Severity | Component | Description | Workflow |
|---|----------|-----------|-------------|----------|
| 3 | **MEDIUM** | Editorial Workflow | All roles (contributor, editor, publisher) see all 5 editorial status options. Expected: role-based restrictions (contributor: Draft/In Review only, editor: cannot set Published). | W2, W3 |
| 4 | **MEDIUM** | Article Slug | Slug not auto-generated from title on article creation. Had to manually enter. | W4 |
| 5 | **FIXED** | Quiz Data | TEST ARTICLE had correctAnswer=3 with only 3 options. Fixed to correctAnswer=1. Verified working. | W7 |

---

## Screenshots

All screenshots saved to `tests/browser-qa/screenshots/`:

| File | Description |
|------|-------------|
| `W1-01-admin-login.png` | Admin dashboard after login |
| `W1-03-users-list.png` | Users collection — 5 accounts |
| `W1-06-ai-config.png` | AI Config global |
| `W1-07-free-user-created.png` | QA free user created |
| `W2-01-contributor-login.png` | Contributor dashboard |
| `W2-04-video-embed-added.png` | Video embed block in editor |
| `W2-05-quiz-added.png` | Quiz block in editor |
| `W2-09-saved-draft.png` | Article saved as draft |
| `W2-10-submitted-review.png` | Article submitted for review |
| `W3-01-editor-login.png` | Editor dashboard |
| `W3-03-editor-review.png` | Editor reviewing article |
| `W3-04-approved.png` | Article approved |
| `W4-01-publisher-login.png` | Publisher dashboard |
| `W4-03-published.png` | Article published |
| `W4-04-articles-listing.png` | Frontend articles listing |
| `W4-05-article-frontend.png` | Article on frontend |
| `W5-03-video-embed.png` | Video embed close-up |
| `W5-04-quiz-wrong-answer.png` | Quiz — wrong answer feedback |
| `W5-05-quiz-correct-answer.png` | Quiz — correct answer feedback |
| `W5-07-full-article.png` | Full article page |
| `W5-08-mobile-article.png` | Mobile article view |
| `W5-09-test-article.png` | TEST ARTICLE verification |
| `W6-01-articles-unauthenticated.png` | Articles listing (logged out) |
| `W6-05-tutor-unauthenticated.png` | AI Tutor — "Please sign in" |
| `W6-06-free-user-login.png` | Free user admin unauthorized |
| `W6-07-tutor-free-tier.png` | AI Tutor — "Not available on plan" |
| `W6-09-account-page.png` | Account profile page |
| `W6-10-billing-page.png` | Billing page with tier cards |
| `W6-11-mobile-articles.png` | Mobile articles listing |
| `W6-11-mobile-article.png` | Mobile article view |
| `W6-11-mobile-tutor.png` | Mobile AI Tutor panel |
| `W6-08-premium-locked.png` | Premium article — locked content banner |
| `W7-03-quiz-correctanswer-0.png` | Quiz with correctAnswer=0 — first option green |
| `W7-04-quiz-oob-correctanswer.png` | Quiz with out-of-bounds correctAnswer (before fix) |
| `W7-04-test-article-quiz-fixed.png` | TEST ARTICLE quiz after fix — option B green |
| `W7-08-logout.png` | Admin logout → login page |

---

## Recommendations

### Must fix (blocking)

1. **Fix callout block converter** — Add the callout/banner block type to the Lexical JSX converter in the frontend article renderer. This is the only content block that doesn't render. Console error: `Lexical => JSX converter: Blocks converter`.

2. **Fix Stripe checkout** — Investigate the 500 error on `/api/billing/checkout`. Likely needs Stripe price IDs configured or customer creation on first checkout.

### Should fix (non-blocking)

3. **Add editorial status field-level access control** — Restrict which status values each role can select. Contributors should only see Draft/In Review. Editors should not see Published.

4. **Investigate slug auto-generation** — The slug field should auto-populate from the title. Check if the Payload slug field hook is configured correctly for the Articles collection.

### Fixed during QA

5. ~~**Fix TEST ARTICLE quiz data**~~ — correctAnswer fixed from 3→1. Verified working.
6. ~~**Create premium test content**~~ — Premium article created and locked content banner verified.
