# ExecPlans

| Plan                                                                                                                | Status                                | Scope                           |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| [ExecPlan 1 — Theory First Promptfoo Foundation E0–E2](2026-08-08-theory-first-promptfoo-foundation-e0-e2.md)       | Gate 2 stopped: E1 `ERROR`            | RFC 0001 E0–E2 only             |
| [ExecPlan 2 — Qualify Promptfoo tracing](2026-08-08-qualify-promptfoo-tracing.md)                                   | Complete: `ALTERNATIVE_SUPPORTED`     | Local development qualification |
| [ExecPlan 3 — Promote isolated local persistence for E2](2026-08-08-promote-local-persistence-for-e2.md)            | Gate 1 complete: `EXACT_SUPPORTED`    | Offline instrument evolution    |
| [ExecPlan 4 — Harden live preflight and error projection](2026-08-08-harden-live-preflight-and-error-projection.md) | Complete: 45 tests; `EXACT_SUPPORTED` | Defensive instrument hardening  |
| [Historical record — Pre-live instrument hardening](2026-08-08-pre-live-instrument-hardening-record.md)             | Closed and blocked at `60c0240`       | Preserved hardening provenance  |

Live experiments are separate from offline validation. Their sanitized curated reports may be committed only after the corresponding provider invocation has completed.
