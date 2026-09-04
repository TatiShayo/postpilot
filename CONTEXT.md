# CONTEXT.md — Ubiquitous Domain Language (PostPilot)

## Core Entities
- **SocialPost**: Draft or scheduled multimedia content destined for one or more target channels.
- **ContentPlan**: 30-day AI-generated editorial calendar structured by theme and target audience.
- **PlatformChannel**: Target destination (e.g. X/Twitter, LinkedIn, Threads, Instagram) with platform-specific character invariants.
- **QuotaGuard**: Atomic accounting system enforcing strict monthly token caps per subscription tier.
- **StripeEventLedger**: Audit table recording processed Stripe webhook events for idempotency.

## Domain Invariants
- AI generation cannot occur if monthly quota usage exceeds the subscriber's tier allowance.
- Posts scheduled in the past are rejected; minimum lead time is 60 seconds from current UTC timestamp.
- Public profile queries never return draft, scheduled, or deleted posts.

## Forbidden Terminology
- Do not call posts "tweets" or "articles"; use "SocialPost".
- Do not use "token balance" for monthly quota; use "AiUsageQuota".
