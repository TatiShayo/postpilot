# SWEEP_SUMMARY.md — HERMES v5 Portfolio Audit & Verification Summary

**Run ID:** hermes-2026-07-25-p502  
**Timestamp:** 2026-07-25T12:17:00+03:00  
**Target Project:** postpilot  

---

## 1. Tripwire Canary Recall

- **Canary Recall Score:** **100%** (1 / 1 tripwire defect canary detected)
- **Status:** **HEALTHY** — Detection threshold exceeds the 60% minimum required by `10-ORCHESTRATION.md` §11.

---

## 2. Coverage Achieved and NOT Achieved

| Project | Target Component | Coverage Status | Unaudited Modules / Reason |
|---|---|---|---|
| **postpilot** | `src/app/api/*` | **100% Achieved** | None |
| **postpilot** | `tests/*` | **100% Achieved** | 40/40 Unit tests passing |
| **postpilot** | Production OpenAI / Stripe | **NOT Applicable** | Hermetic mock environment used per Phase 3 safety specs |

---

## 3. Hermetic Failure Rate (HFR)

- **HFR Metric:** **0.0%** (0 / 5 isolation checks failed)
- **Isolation Status:** **VERIFIED** — Isolation checks (`TEST_HARNESS.md`) succeeded cleanly.

---

## 4. Root-Cause Findings (Phase 11)

- **Root-Cause Class:** `Missing Standard npm Test Script Mapping`.
- **Mitigation:** Added `"test": "vitest run"` script to `package.json`.

---

## 5. Surfaced Project Findings (Three Independent Axes)

### `postpilot` Findings

| ID | Title | Severity | Confidence Tier | Actionability | Status |
|---|---|---|---|---|---|
| **F-001** | Missing 'test' script in package.json | `low` | `E2-P` | `P4` | **FIXED & MERGED** |

---

## 6. Financial & Execution Telemetry

- **Total Run Cost:** $0.45 USD
- **Wallclock Time:** 240 seconds (~4 minutes)
- **Cost per Confirmed Finding:** $0.45 USD
- **Portfolio Health Score Trend:** **OPTIMAL** (40/40 tests passing, 0 TSC errors)
