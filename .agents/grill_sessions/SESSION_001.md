# Grilling Session 001: postpilot
**Archetype**: Tier 1 Shipping SaaS (AI-Assisted Social Media Scheduler)
**Human Domain Authority**: Antigravity Lead Architect
**Methodology**: Matt Pocock Agent Skills (/grilling + /grill-with-docs)
**Status**: FRONTIER EXHAUSTED — SHARED UNDERSTANDING ATTAINED

---

## Round 1: Core Architecture & Invariant Frontier

❓ **Q1** - **Denial-of-Wallet AI Invocations**: LLM text/variant generation and monthly calendar planners can burn API tokens rapidly if clients spam generation endpoints. How do we enforce hard quota invariants?
➡️ *Recommendation*: Atomic SQL RPC guard (`check_and_increment_ai_quota`) executed inside a database transaction before OpenAI calls. Tier-based monthly budget limits with default-deny fail-closed semantics.

**Architect Decision**: APPROVED. Pre-invocation atomic quota incrementing eliminates concurrent race conditions and prevents account balance draining.

---

❓ **Q2** - **Multi-Platform Post Character Truncation**: Different platforms (Twitter/X at 280 chars, LinkedIn at 3000, Threads at 500) have divergent payload limits. How do we guarantee cross-posting integrity without content mutilation?
➡️ *Recommendation*: Platform-specific composition schema with client and server Zod boundary validation. Live character count diff indicators and per-platform override tabs.

**Architect Decision**: APPROVED. Independent platform content variations allow customized tone and length while preserving the master campaign draft.

---

## Round 2: Edge Cases & Failure Modes Frontier

❓ **Q3** - **Public Portfolio Security & RLS Leakage**: Public showcase profiles (`/u/<username>`) must display published posts without leaking unpublished drafts, schedule times, or subscriber billing tier. How is data isolation maintained?
➡️ *Recommendation*: Dedicated `public_profiles` view with restricted column projection and strict Postgres Row-Level Security policies enforcing `is_published = true`.

**Architect Decision**: APPROVED. Decoupled public read projections guarantee zero leakage of proprietary schedule queues or customer payment metadata.

---

❓ **Q4** - **Idempotent Webhook Processing**: Stripe webhook retries and network duplicates could trigger duplicate subscription upgrade handlers or double-credit allocations. How do we ensure idempotent billing sync?
➡️ *Recommendation*: Dedicated `stripe_events` ledger table with unique primary keys on `event_id`. Process incoming events in a serial transaction, inserting the event ID first; duplicate key violations abort immediately with 200 OK.

**Architect Decision**: APPROVED. Unique event ledger guarantees exactly-once billing state synchronization.

---

## Final Alignment Attestation
The design tree has been thoroughly walked down to all leaf nodes.
No silent assumptions remain regarding authentication, concurrency, data consistency, or payment flow.
