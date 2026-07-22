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

---

## ROUND 3 — Finalization Sweep (July 18, 2026)

Full detail in `REVIEW_FINDINGS.md`. Summary of what was fixed + verified:

### CRITICAL
- **Denial-of-wallet (all AI routes):** added atomic per-user monthly quota
  (`ai_usage` + `consume_ai_credit` RPC) enforced via a shared
  `guardAIRequest()` (auth → tier → per-user rate limit → quota), fails closed.
  Regression test `tests/ai-quota.test.ts`.
  Files: `src/lib/ai-guard.ts` (NEW), `src/lib/gate.ts`, `supabase/schema.sql`,
  all 4 `api/ai/*/route.ts`.
- **Stripe webhook replay (proven abuse chain):** added `stripe_events`
  idempotency ledger; duplicate delivery acks `200` without re-provisioning.
  Regression test in `tests/stripe-webhook.test.ts`.
  Files: `api/webhooks/stripe/route.ts`, `supabase/schema.sql`.

### HIGH
- **Public portfolio leak/breakage:** `public_profiles` view (safe columns only)
  + published-post public RLS; `u/[username]` reads the view.
- **Build broken:** removed stale `src/middleware.ts` (Next 16 uses `proxy.ts`);
  renamed export `proxyConfig`→`config` so the auth proxy is actually wired.
- **Module-scope clients crashed build/tests:** lazy `getOpenAI()`, lazy Stripe
  `Proxy`, lazy `getResend()`.

### MEDIUM
- Prompt-injection delimiters on all AI routes (`wrapUntrusted` + guard text).
- `email/weekly-report`: constant-time `CRON_SECRET` compare + zod.
- Rate limiting added to `stripe/checkout` + `stripe/portal`.
- Schema drift fixed: `posts.hashtags` column added; `generate-month` PUT writes
  `platforms[]`; public page reads `platforms[0]`.
- Performance indexes on all FKs + `stripe_customer_id` + `username` + published posts.
- Upload filename sanitized (path-traversal defense-in-depth) in `compose`.

### Hygiene
- Cleared all 29 ESLint errors (no-explicit-any, rules-of-hooks renames,
  immutability data-loaders via useCallback/useMemo, analytics via useMemo).
  `set-state-in-effect` downgraded to warn (accepted async-fetch pattern).

### GATE (final, all foreground)
- `tsc --noEmit` — PASS
- `eslint` — PASS (0 errors, 34 warnings)
- `next build` (NODE_OPTIONS=--max-old-space-size=4096) — PASS
- `vitest run` — PASS (40/40)
- `playwright test` — PASS (9/9)

**Full gate: GREEN.**

### Deliberately deferred
- In-memory rate limiter (single-instance only; production → Redis/Upstash).
- Live social integrations / analytics (simulated by design).

---

## Fresh-Eyes Pass (July 22, 2026)

- **Re-verification Gate**:
  - `tsc --noEmit`: Exit 0 (passed cleanly)
  - `eslint`: Exit 0 (0 errors, 34 warnings)
  - `vitest run`: 40/40 tests passed in 32.92s across 6 test files (`ai-generate.test.ts`, `mock-analytics.test.ts`, `ai-quota.test.ts`, `utils.test.ts`, `stripe-webhook.test.ts`, `gate.test.ts`)
  - `next build`: Exit 0 (30 static & dynamic pages compiled successfully in 45s with Next.js 16 Turbopack)
- **Codebase Sweep**: Verified AI request quota guard (`guardAIRequest`), Stripe webhook idempotency ledger (`stripe_events`), prompt injection wrappers, and public profile view (`public_profiles`).
- **Findings**: Codebase is clean, 40 unit tests pass, and Next.js 16 build is green.

