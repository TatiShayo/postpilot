# ADR 0001: Atomic AI Quota Allocation and Dedicated Public Projections

## Context
PostPilot delivers AI-assisted content scheduling. To prevent API exhaustion attacks and safeguard subscriber privacy, resource allocation and data isolation must be enforced at the database layer.

## Decision
1. **Atomic Quota RPC**: Enforce token limits via Postgres stored procedure `check_and_increment_ai_quota` before invoking OpenAI endpoints.
2. **Column-Restricted Public Views**: Expose public creator portfolios via a hardened SQL view omitting billing and draft metadata.
3. **Idempotent Event Ledger**: Track Stripe webhook processing with an immutable event ID ledger.

## Consequences
- **Positive**: Zero possibility of wallet denial through concurrent client race conditions. Strict RLS isolation prevents inadvertent data leaks.
- **Negative**: Adds a database round-trip prior to dispatching external LLM requests.
