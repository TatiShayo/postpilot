# TICKETS — PostPilot Social Engine

## [TICKET-001] Atomic AI Quota RPC Guard
- **Blocked by**: None
- **Delivers**: Database-enforced atomic usage decrement preventing concurrent balance overruns.
- **Verification**: `src/lib/__tests__/quota.test.ts`

## [TICKET-002] Multi-Platform Character Limit & Override Engine
- **Blocked by**: TICKET-001
- **Delivers**: Validation schema and UI preview enforcing Twitter, LinkedIn, and Threads constraints.
- **Verification**: `src/lib/__tests__/post-validation.test.ts`

## [TICKET-003] Idempotent Stripe Webhook Ledger
- **Blocked by**: None
- **Delivers**: Unique event ledger blocking replay attacks and duplicate subscription allocations.
- **Verification**: Stripe mock webhook test suite.
