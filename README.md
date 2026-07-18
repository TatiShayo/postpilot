# PostPilot

AI-assisted social-media management for solo founders and small teams. Compose
and schedule posts across platforms, generate a month of content with AI, track
analytics, and manage billing — in one dashboard.

> Portfolio project. Built on Next.js 16 + Supabase + Stripe + OpenAI, with a
> security-first backend (atomic AI quotas, idempotent webhooks, RLS everywhere).

## Features

- **AI content studio** — generate post variations, a full 30-day plan, caption
  optimization, and ranked hashtag suggestions (OpenAI `gpt-4o-mini`, JSON mode).
- **Compose & schedule** — multi-platform composer with per-platform character
  limits, media upload, live preview, image export, WhatsApp share.
- **Calendar & analytics** — month calendar of scheduled/published posts;
  impressions & engagement charts.
- **Public portfolio** — shareable `/u/<username>` page of published posts.
- **Billing** — Stripe Checkout + Billing Portal; Free / Pro / Business tiers
  with enforced post, platform, and AI-usage limits.
- **Waitlist + weekly email report** (Resend).

## Tech stack

Next.js 16 (App Router, React 19, Turbopack) · TypeScript · Supabase
(Postgres + Auth + Storage, RLS) · Stripe · OpenAI · Resend · Tailwind +
shadcn/ui · Recharts · Vitest · Playwright.

## Security highlights

- **Denial-of-wallet protection** — every paid AI call passes a single guard:
  auth → tier → per-user rate limit → **atomic** per-user monthly quota
  (Postgres RPC). Fails closed.
- **Idempotent Stripe webhooks** — signature verification + an event-id ledger
  that blocks replays / double-provisioning.
- **RLS default-deny** on every table; a column-limited `public_profiles` view
  powers the public portfolio without leaking billing data.
- **Prompt-injection hardening** — user content is delimited and treated as data.
- Security headers (CSP, HSTS, X-Frame-Options, …) on all routes; zod validation
  on API boundaries; constant-time secret comparison for the cron endpoint.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`REVIEW_FINDINGS.md`](./REVIEW_FINDINGS.md) for details.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in real values
```

Apply the database schema to your Supabase project (in order):
`supabase/schema.sql`, `supabase/storage-policy.sql`, then optionally
`supabase/seed.sql`.

Configure the Stripe webhook to POST `checkout.session.completed` and
`customer.subscription.*` events to `/api/webhooks/stripe`.

```bash
npm run dev      # http://localhost:3000
```

### Environment variables

See `.env.local.example`. Required: Supabase URL + anon + service-role keys,
Stripe secret + webhook secret + price IDs, `OPENAI_API_KEY`, `RESEND_API_KEY`,
`CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Scripts & checks

```bash
npm run dev            # dev server
npm run build          # production build
npm run lint           # eslint
npx tsc --noEmit       # typecheck
npx vitest run         # unit tests
npx playwright test    # e2e (auto-starts dev server)
```

## Notes

- Social posting and analytics are **simulated** — this is a product/portfolio
  build, not wired to live platform APIs.
- Rate limiting is in-memory (single instance). For multi-instance production,
  swap `src/lib/rate-limit.ts` for a Redis/Upstash-backed limiter.
