# SPEC 001: AI Social Media Studio & Schedule Orchestrator

## Problem Statement
Solo founders and creators need high-volume social media content but lack time to manually format, schedule, and tailor posts across fragmented platform limits without overspending on AI tokens.

## Solution
A unified Next.js + Supabase SaaS platform offering AI content generation, multi-platform character validation, visual scheduling calendar, and atomic usage quota guards.

## User Stories
1. As a creator, I want to generate a 30-day content calendar from a single topic prompt, so that my pipeline remains populated.
2. As a founder, I want live platform character warnings, so that my post complies with platform guidelines before scheduling.
3. As a subscriber, I want predictable billing with clear quota boundaries, so that I never receive surprise overage bills.

## Implementation Decisions
- AI generation guard in `src/lib/quota.ts` and `supabase/schema.sql`.
- Platform post validation in `src/lib/validations/post.ts`.
- Idempotent Stripe webhook handler in `src/app/api/webhooks/stripe/route.ts`.

## Testing Decisions
- Seam: `src/lib/__tests__/quota.test.ts` and `src/lib/__tests__/post-validation.test.ts`.
- Verify quota exhaustion denies requests cleanly with 429 status code.
- Verify platform length limits prevent submission of oversized text.
