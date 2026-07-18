# PostPilot — Architecture

AI-assisted social-media management SaaS. Users connect (mock) social accounts,
compose/schedule posts, generate content with OpenAI, view analytics, and manage
a Stripe subscription (Free / Pro / Business).

## Stack

| Layer      | Technology |
|------------|------------|
| Framework  | Next.js 16 (App Router, Turbopack, React 19) |
| Language   | TypeScript (strict) |
| Auth + DB  | Supabase (Postgres + Auth + Storage, RLS-enforced) |
| Payments   | Stripe (Checkout, Billing Portal, webhooks) |
| AI         | OpenAI (`gpt-4o-mini`, JSON mode) |
| Email      | Resend |
| UI         | Tailwind + shadcn/ui, Recharts, Framer Motion |
| Tests      | Vitest (unit) + Playwright (e2e) |

## Request / auth flow

1. **`src/proxy.ts`** — Next 16 proxy (formerly `middleware.ts`). Runs on
   `/dashboard/*`, `/auth/login`, `/auth/signup`. Refreshes the Supabase session
   cookie and redirects: unauthenticated → `/auth/login`; authenticated hitting
   auth pages → `/dashboard`. Exported as `proxy` + `config` (Next 16 names).
2. **`src/lib/supabase/`** — three client factories:
   - `client.ts` `createClient()` — browser client (anon key).
   - `server.ts` `createClient()` — RSC/route-handler client (anon key, cookie-bound, RLS applies).
   - `server.ts` `createAdminClient()` — service-role client (bypasses RLS). **Only** used by the Stripe webhook.
3. **`auth/callback/route.ts`** — exchanges the OAuth/magic-link code for a session.

## Data model (`supabase/schema.sql`)

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | 1:1 with `auth.users`; tier, stripe_customer_id | owner-only (`auth.uid() = id`) |
| `social_accounts` | connected platforms | owner-only |
| `posts` | drafts/scheduled/published content | owner-only + **public SELECT of `status='published'`** |
| `post_analytics` | per-post metrics | SELECT via owning post |
| `subscriptions` | Stripe subscription mirror | owner SELECT only (writes = admin) |
| `waitlist` | landing-page email capture | INSERT-only for anon |
| `ai_usage` | per-user/month AI credit counter | owner SELECT; writes only via RPC |
| `stripe_events` | webhook idempotency ledger | no policy (admin-only) |

- **`handle_new_user()`** trigger auto-creates a `profiles` row on signup (all
  gating depends on it).
- **`public_profiles`** view exposes only `id, username, full_name, avatar_url`
  to `anon`/`authenticated` for the public portfolio — never leaks
  `stripe_customer_id` / `subscription_tier`.
- **`consume_ai_credit(p_limit)`** security-definer RPC atomically increments the
  monthly counter iff under limit (denial-of-wallet guard).
- Indexes on every foreign key + hot lookup (`stripe_customer_id`, `username`,
  published posts).

## API routes (`src/app/api/`)

| Route | Method | Guards |
|-------|--------|--------|
| `ai/generate`, `ai/generate-month`, `ai/optimize`, `ai/hashtags` | POST | `guardAIRequest` → IP RL + auth + tier + per-user RL + atomic quota; prompt-injection delimiters |
| `ai/generate-month` | PUT | auth + IP RL; saves generated month to `posts` |
| `stripe/checkout` | POST | auth + IP RL; creates/reuses customer + Checkout session |
| `stripe/portal` | POST | auth + IP RL; Billing Portal session |
| `webhooks/stripe` | POST | signature verify + **idempotency ledger** + provisioning |
| `email/weekly-report` | POST | constant-time `CRON_SECRET` + zod |
| `waitlist` | POST | IP RL + zod |

### Shared security utilities
- **`src/lib/ai-guard.ts`** — `guardAIRequest()` is the single choke point in
  front of every paid OpenAI call (auth → tier → rate limit → atomic quota).
  `wrapUntrusted()` + `PROMPT_INJECTION_GUARD` wrap user text as data.
- **`src/lib/gate.ts`** — tier lookups + `enforceAIQuota()`.
- **`src/lib/rate-limit.ts`** — in-memory sliding window (per IP and per user).
  *Note:* single-instance only; production multi-instance needs Redis/Upstash.
- **`src/lib/openai.ts` / `src/lib/stripe.ts`** — lazily constructed clients so
  builds don't crash without env.

## Frontend

- `src/app/page.tsx` — marketing landing (hero, pricing, comparison, waitlist).
- `src/app/dashboard/*` — authenticated app: compose, calendar, analytics,
  accounts, billing, settings, templates, competitors, best-time, ai-month.
  Every route has `loading.tsx` (skeleton) + `error.tsx` (error boundary).
- `src/app/u/[username]` — public portfolio (published posts via `public_profiles`).
- Analytics data is mock-generated (`src/lib/mock-analytics.ts`); social posting
  is simulated (no real platform OAuth).

## Security headers (`next.config.ts`)
CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy,
X-XSS-Protection applied to all routes.

## Known limitations
- Rate limiting is in-memory (resets on restart, not shared across instances).
- Social posting + analytics are simulated, not live integrations.
- `schema.sql` is the source of truth; apply migrations manually to Supabase.
