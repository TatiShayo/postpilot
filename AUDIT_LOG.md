# AUDIT LOG — postpilot

**Sweep:** July 14, 2026 (Round 1, Rounds 2-3 applied)

## FIXES APPLIED

### HIGH — Missing middleware file
**Finding:** `src/proxy.ts` contained complete auth guard logic but was never wired as Next.js middleware. No `middleware.ts` existed at all.
**Fix:** Created `src/middleware.ts` that re-exports `proxy` and `proxyConfig`.
**File:** `src/middleware.ts` (NEW)

### HIGH — CRON_SECRET not documented
**Finding:** Weekly report endpoint required `CRON_SECRET` but `.env.local.example` didn't list it.
**Fix:** Added `CRON_SECRET=` to env example.
**File:** `.env.local.example`

### HIGH — Missing security headers
**Finding:** `next.config.ts` was empty.
**Fix:** Added `headers()` with full security header set + CSP.
**File:** `next.config.ts`

### MEDIUM — Error messages leaked to clients (6 files)
**Finding:** All AI routes and Stripe/webhook endpoints returned `error.message` directly to clients, potentially exposing OpenAI API error details, Stripe internal messages, etc.
**Fix:** Replaced all with generic messages: "Failed to generate content. Please try again.", "Failed to save posts. Please try again.", etc.
**Files:** `api/ai/generate/route.ts`, `api/ai/optimize/route.ts`, `api/ai/hashtags/route.ts`, `api/ai/generate-month/route.ts`, `api/webhooks/stripe/route.ts`, `api/email/weekly-report/route.ts`, `api/stripe/portal/route.ts`, `api/stripe/checkout/route.ts`

## DEFERRED

- AI credit limits checked but not enforced (no server-side decrement counter)
- Weekly report CRON_SECRET uses non-constant-time comparison
- Stripe checkout/portal routes lack rate limiting
- In-memory rate limit map — needs Redis/Upstash for production
- Storage bucket content-type validation missing server-side
- File upload path traversal risk in compose page (unsanitized file.name)

---

## ROUND 2 — Adversarial, Reduction & Cross-Angle Sweep (July 14, 2026)

### CRITICAL — Missing profile auto-creation breaks all gating
**Finding:** No `handle_new_user` trigger existed. Signup only called `supabase.auth.signUp()`. All gating (`checkAIAccess`, webhook provisioning) depends on profile rows that don't exist. No user could pass AI access checks or be upgraded to Pro/Business.
**Fix:** Added `handle_new_user()` trigger in schema.sql that auto-creates profile on `auth.users` insert.
**File:** `supabase/schema.sql`

### MEDIUM — 7 dead dependencies removed
**Removed:** `@base-ui/react`, `@hookform/resolvers`, `@stripe/stripe-js`, `@tanstack/react-table`, `cmdk`, `next-themes`, `react-hook-form` — all never imported or used.
**File:** `package.json`
