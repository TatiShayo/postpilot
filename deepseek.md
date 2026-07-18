# postpilot — DeepSeek Audit

**Date:** 2026-07-13
**Path:** `C:\Users\TATI\Desktop\DEV\postpilot\`
**Stack:** TypeScript / Next.js 16 + Supabase + Stripe + OpenAI
**Tier:** 2 — High
**Dependencies:** None installed

---

## 🔴 Security Vulnerabilities

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| 🔴 CRITICAL | `.env.local` | 2-3 | **Supabase service role key exposed** — same demo project keys as billflow. Dangerous pattern. | DELETE this file. Only use `.env.local.example` as template. |
| 🟡 MEDIUM | `src/app/api/waitlist/route.ts` | — | Zod validated + rate limited per IP. Good. | — |
| 🟡 MEDIUM | `src/app/api/ai/generate/route.ts` | — | Rate limited per IP only — no per-user limit. | Add per-user rate limiting. |
| 🟡 MEDIUM | `src/app/api/ai/hashtags/route.ts` | — | Same — IP-only rate limiting. | Add per-user rate limiting. |
| 🟡 MEDIUM | `src/app/api/ai/optimize/route.ts` | — | Same. | Add per-user rate limiting. |
| ✅ | `src/proxy.ts` | — | Supabase SSR cookie proxy. Good. | — |

---

## 🟠 Performance Issues

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟡 MEDIUM | `src/lib/rate-limit.ts` | — | In-memory rate limiter — resets on server restart, shared across all users on same instance. | For multi-instance deployment, use Redis or Supabase-based rate limiter. |
| 🟡 MEDIUM | `src/app/dashboard/calendar/page.tsx` | — | Post cards in calendar rendered without `React.memo` — re-render on any state change. | Extract list items into `React.memo`-wrapped components. |

---

## 🟡 UI/UX Improvements

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟡 MEDIUM | `src/app/dashboard/compose/page.tsx` | 436 | `alt=""` on uploaded preview image — should be descriptive. | Add descriptive alt text: `alt="Uploaded social media post preview"`. |
| ✅ | `src/app/layout.tsx` | 40-46 | Skip-to-content link. Good. | — |
| ✅ | ALL routes | — | `loading.tsx` + skeleton on EVERY route. `error.tsx` on EVERY route. Excellent. | — |
| ✅ | ALL routes | — | sonner toast for all feedback. focus-visible rings via shadcn. OG + Twitter meta tags. Good. | — |
| ✅ | — | — | `@next/bundle-analyzer`, Playwright, @testing-library/react, vitest — full quality toolkit. Best-in-class. | — |

---

## 🟢 Dependency Audit

| Category | Package | Issue | Fix |
|----------|---------|-------|-----|
| 🔴 CRITICAL | `shadcn ^4.8.2` | Like billflow — shadcn is a CLI tool, should not be a runtime dependency. | Remove from runtime deps. |
| 🟡 MEDIUM | `recharts ^3.8.1` | ~1.2MB. Inconsistent version with interviewace (^2.15.0). | Standardize. |
| 🟡 MEDIUM | `framer-motion`, `html2canvas`, `openai`, `stripe`, `resend` | Heavy but justified for the product. | Keep — all core to functionality. |
| ✅ | Dev deps | Full quality toolkit: vitest, testing-library, Playwright, bundle-analyzer. | — |

---

## 📋 Priority Fix Queue

1. **[CRITICAL — Secrets]** `.env.local` — DELETE.
2. **[MEDIUM — Rate Limiting]** `src/app/api/ai/*/route.ts` — Add per-user rate limiting, not just IP-based.
3. **[MEDIUM — Shadcn Dep]** Remove `shadcn` from runtime dependencies.
4. **[MEDIUM — Accessibility]** `src/app/dashboard/compose/page.tsx:436` — Add descriptive alt text on uploaded image.
5. **[MEDIUM — React.memo]** Extract list item callbacks into `React.memo` components for calendar, post list.

---

## 🔧 Session: 2026-07-14 — Multi-Agent Deep Audit Sweep (Round 1)

### Security fixes applied

| Severity | Issue | Fix | Files |
|----------|-------|-----|-------|
| 🟠 HIGH | Orphaned `proxy.ts` auth middleware — never wired to Next.js (no `middleware.ts` existed) | Created `src/middleware.ts` that re-exports `proxy` + `proxyConfig` | `src/middleware.ts` (NEW) |
| 🟠 HIGH | `CRON_SECRET` used by weekly-report endpoint but not documented in `.env.local.example` | Added `CRON_SECRET=` to env template | `.env.local.example` |
| 🟠 HIGH | No security headers configured | Added CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | `next.config.ts` |
| 🟡 MEDIUM | `error.message` leaked to clients in 8 API route files — raw OpenAI/Stripe/Supabase errors returned | Sanitized all to generic messages: "Failed to generate content. Please try again.", etc. | `api/ai/generate/route.ts`, `api/ai/optimize/route.ts`, `api/ai/hashtags/route.ts`, `api/ai/generate-month/route.ts` (2 locations), `api/webhooks/stripe/route.ts`, `api/email/weekly-report/route.ts`, `api/stripe/portal/route.ts`, `api/stripe/checkout/route.ts` |

### Artifacts created
- `AUDIT_LOG.md` — full audit trail

---

## 🔧 Session: 2026-07-14 — Round 2: Adversarial, Reduction & Cross-Angle Sweep

### CRITICAL fixes
- **Missing profile auto-creation fixed:** Added `handle_new_user()` trigger in schema.sql. Signup was only calling `auth.signUp()` with no profile insert — broke ALL gating (no user could pass `checkAIAccess()` or be upgraded).

### Reduction
- Removed 7 dead dependencies from package.json: `@base-ui/react`, `@hookform/resolvers`, `@stripe/stripe-js`, `@tanstack/react-table`, `cmdk`, `next-themes`, `react-hook-form`.
