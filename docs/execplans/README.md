# ExecPlans

| Plan                                                                                                                | Status                                           | Scope                            |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| [ExecPlan 1 — Theory First Promptfoo Foundation E0–E2](2026-08-08-theory-first-promptfoo-foundation-e0-e2.md)       | Gate 2 stopped: E1 `ERROR`                       | RFC 0001 E0–E2 only              |
| [ExecPlan 2 — Qualify Promptfoo tracing](2026-08-08-qualify-promptfoo-tracing.md)                                   | Complete: `ALTERNATIVE_SUPPORTED`                | Local development qualification  |
| [ExecPlan 3 — Promote isolated local persistence for E2](2026-08-08-promote-local-persistence-for-e2.md)            | Gate 1 complete: `EXACT_SUPPORTED`               | Offline instrument evolution     |
| [ExecPlan 4 — Harden live preflight and error projection](2026-08-08-harden-live-preflight-and-error-projection.md) | Complete: 45 tests; `EXACT_SUPPORTED`            | Defensive instrument hardening   |
| [ExecPlan 5 — Remediate npm audit findings](2026-08-09-remediate-npm-audit-findings.md)                             | Complete: audit 0; 45 tests                      | Dependency security hardening    |
| [ExecPlan 6 — Run fresh Gate 2 campaign](2026-08-09-run-fresh-gate-2-campaign.md)                                   | Complete: E1/baseline pass; deep error           | Authorized live E0–E2 campaign   |
| [ExecPlan 7 — Harden G2 and qualify Codex OTEL](2026-08-09-harden-g2-and-qualify-codex-otel.md)                     | Complete: 48 tests; `EXACT_SUPPORTED`            | Development instrument hardening |
| [ExecPlan 8 — Run fresh Gate 2 campaign after OTEL hardening](2026-08-09-run-fresh-gate-2-campaign-r3.md)           | Complete: all live gates passed                  | Authorized live E0–E2 campaign   |
| [ExecPlan 9 — Qualify E3 regressions through Promptfoo](2026-08-09-protect-e3-archaeological-regressions.md)        | Complete: 62 tests; `SUPPORTED`                  | Offline RFC 0001 R1–R6 corpus    |
| [ExecPlan 10 — Add pull request CI](2026-08-09-add-pull-request-ci.md)                                              | Complete: hosted validation passed               | Deterministic PR validation      |
| [ExecPlan 11 — Build Evaluation Author v0 — E4](2026-08-10-build-evaluation-author-v0.md)                           | Complete: R3 `SUPPORTED_FOR_E5`                  | Product Author development core  |
| [ExecPlan 12 — Run a fresh E4 Author canary — R2](2026-08-10-run-e4-author-canary-r2.md)                            | Closed: `INSUFFICIENT` (provider error)          | Authorized E4 development canary |
| [ExecPlan 13 — Diagnose E4 Author provider boundary](2026-08-10-diagnose-e4-author-provider-boundary.md)            | Complete: local boundary supported               | Offline provider diagnostics     |
| [ExecPlan 14 — Run E4 Author canary R3](2026-08-10-run-e4-author-canary-r3.md)                                      | Closed: `SUPPORTED_FOR_E5`                       | Authorized E4 development canary |
| [ExecPlan 15 — Qualify the Evaluation Author blindly — E5](2026-08-11-qualify-evaluation-author-blind-e5.md)        | Runner hardened offline; collection unauthorized | Blind Author qualification plan  |
| [Historical record — Pre-live instrument hardening](2026-08-08-pre-live-instrument-hardening-record.md)             | Closed and blocked at `60c0240`                  | Preserved hardening provenance   |

Live experiments are separate from offline validation. Their sanitized curated reports may be committed only after the corresponding provider invocation has completed.
