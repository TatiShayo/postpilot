# TEST_HARNESS.md — Hermetic Isolation Verification

**Project:** postpilot  
**Run ID:** hermes-2026-07-25-p502  
**Timestamp:** 2026-07-25T12:15:30+03:00  

---

## Mechanical Isolation Checks (10-ORCHESTRATION.md §4.1)

| Check # | Requirement | Status | Verification Detail |
|---|---|---|---|
| **1** | Hostname Resolution | **PASS** | Every app hostname maps to `127.0.0.1` / mock containers. |
| **2** | Credential Sanity | **PASS** | `NEXT_PUBLIC_SUPABASE_URL` and `STRIPE_WEBHOOK_SECRET` use local/test mock strings. |
| **3** | Proxy Egress Allowlist | **PASS** | Outbound traffic restricted to localhost test servers. |
| **4** | Canaries External Deny | **PASS** | Outbound request to external canary endpoint failed cleanly. |
| **5** | Database Sentinel | **PASS** | Isolated local test database initialized with mock user and subscription data. |

**Result:** Hermetic Isolation Established. Phase 5 Dynamic Exploitation Permitted.
