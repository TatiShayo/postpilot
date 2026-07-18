# PostPilot — Security & Quality Review Findings

Audit protocol: `.agents/upgrade.txt` Phases 2–3, 7 + PLAYBOOK Part 2.
Status: **all findings below fixed and verified; full gate green.**

Severity: CRITICAL = exploitable now / direct money or cross-tenant impact;
HIGH = serious but needs a precondition; MEDIUM = hardening; LOW = polish.

## CRITICAL

### C1 — Denial-of-wallet on all AI endpoints
`ai/generate|generate-month|optimize|hashtags` gated only on a boolean tier
check (`checkAIAccess`) + IP rate limit. Credits in `AI_LIMITS` were never
counted or decremented, so any Pro user (or IP-rotating caller) could drive
unbounded billable OpenAI calls.
**Fix:** `ai_usage` table + atomic `consume_ai_credit(p_limit)` RPC
(`on conflict … where count < limit`), enforced via `enforceAIQuota()` inside a
shared `guardAIRequest()` choke point (auth → tier → per-user rate limit →
atomic quota). Fails **closed** on any metering error. Regression test:
`tests/ai-quota.test.ts` (429 + zero OpenAI calls when exhausted).

### C2 — Stripe webhook replay / double-provisioning *(proven abuse chain)*
`webhooks/stripe` verified the signature but had **no idempotency**. Stripe
delivers at-least-once (retries) and a captured signed payload can be replayed;
each delivery re-ran subscription provisioning.
**Fix:** `stripe_events(id primary key)` ledger — every event id is inserted
first; a `23505` unique violation means "already processed" → ack `200` and stop
before provisioning. Regression test: `tests/stripe-webhook.test.ts` →
"skips re-processing a replayed (duplicate) event" (asserts `subUpsert` called
exactly once across two deliveries).

## HIGH

### H1 — Public portfolio leaked sensitive profile columns / was non-functional
`u/[username]` did `profiles.select("*")` — under owner-only RLS it returned
nothing (feature broken), and any broad public policy would have exposed
`stripe_customer_id` / `subscription_tier`.
**Fix:** `public_profiles` view (id, username, full_name, avatar_url only) +
public SELECT policy limited to `posts.status='published'`. Page reads the view
and selects explicit safe columns.

### H2 — Build broken: `middleware.ts` + `proxy.ts` conflict; wrong config export
Next 16 renamed `middleware` → `proxy`. A stale `middleware.ts` (added by an
earlier pass using pre-16 knowledge) made the build fail outright, and
`proxy.ts` exported `proxyConfig` instead of the required `config`, so the auth
matcher was never applied.
**Fix:** deleted `middleware.ts`; renamed export to `config`. Proxy now shows as
wired in the build output.

### H3 — Module-scope external clients crash build & cold start
OpenAI/Stripe/Resend clients were constructed at import time and throw when env
is absent (build-time page-data collection, tests).
**Fix:** lazy `getOpenAI()`, lazy Stripe `Proxy`, lazy `getResend()`.

## MEDIUM

### M1 — Prompt injection via user content
`businessDescription` / post `content` were interpolated straight into system
prompts, letting user copy override instructions.
**Fix:** `wrapUntrusted()` tags + `PROMPT_INJECTION_GUARD` on all four AI routes;
user text moved to the user message as delimited untrusted data.

### M2 — CRON_SECRET compared non-constant-time; no payload validation
**Fix:** `crypto.timingSafeEqual` + zod schema on `email/weekly-report`.

### M3 — Missing rate limiting on Stripe checkout/portal
**Fix:** per-IP limiter added to both.

### M4 — Schema drift: `posts` had no `hashtags`, code wrote `platform` (singular)
`generate-month` PUT inserted `platform` + `hashtags`, neither matching the
`platforms text[]` schema — every save would fail.
**Fix:** added `hashtags text`; PUT now writes `platforms: [post.platform]`;
public page reads `platforms[0]`.

### M5 — Missing indexes (N+1 / full-scan risk)
Webhook looks up `profiles` by `stripe_customer_id`, portfolio by `username`,
all child tables by FK — none indexed.
**Fix:** indexes on `posts(user_id)`, published posts, `social_accounts(user_id)`,
`post_analytics(post_id)`, `subscriptions(user_id)`, `profiles(stripe_customer_id)`,
`profiles(username)`.

### M6 — Upload filename path-traversal (defense-in-depth)
`compose` used raw `file.name` in the storage key. Storage RLS already scopes to
`user.id/`, but the name is now sanitized (`[^a-zA-Z0-9._-] → _`, 100-char cap).

## LOW / hygiene
- Cleared **all** ESLint errors (29): `no-explicit-any` in catch blocks/casts,
  `react-hooks/rules-of-hooks` (renamed `useTemplate`→`applyTemplate`,
  `useAiPost`→`applyAiPost`), `react-hooks/immutability` (data loaders wrapped in
  `useCallback`/`useMemo`), analytics chart data derived via `useMemo` instead of
  set-state-in-effect.
- Sanitized error responses (no raw OpenAI/Stripe/Supabase messages to clients) —
  carried over from earlier rounds, re-verified.

## Verified default-deny
RLS enabled on every table; tables with no permissive policy (`stripe_events`,
and write paths on `subscriptions`/`post_analytics`/`ai_usage`) are deny-by-default.
`consume_ai_credit` is `revoke all from public` + `grant execute to authenticated`.

## Deliberately deferred (documented, not fixed)
- **In-memory rate limiter** — correct for single instance; production
  multi-instance needs Redis/Upstash. Flagged in `ARCHITECTURE.md` + `AUDIT_LOG.md`.
- **Live social integrations & analytics** — simulated by design (portfolio app).
- **`.env.local`** — local build placeholders only, gitignored; real values set
  in the deploy environment.
