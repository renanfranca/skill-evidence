# ExecPlan 7 — Harden G2 and Qualify Codex OTEL

- Date: 2026-08-09
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Status: complete; 48 tests and both development qualifiers are green

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while work advances.

Safety boundary: This task is limited to authorized, defensive maintenance of this repository. It does not authorize credentials, provider invocation, campaign execution, freeze creation, or historical evidence regeneration.

## Purpose / Big Picture

Correct Gate 2 (G2) so it cannot recommend continued architecture work when the required deep condition failed or its final response is missing. Replace the rejected Codex OpenTelemetry (OTEL) exporter representation with the supported nested OTLP/HTTP representation, then add a provider-free development qualifier that proves the exact configuration parses twice under pinned Codex CLI `0.147.0` while the obsolete scalar form is rejected twice. The observable result is a green 48-test suite, a canonical schema-1 qualification report with `EXACT_SUPPORTED`, and unchanged historical campaign reports.

## Scope

In scope: G2 decision logic and report-CLI regressions; the deep scientific OTEL configuration; a development-only `experiment:qualify:codex-otel` command; fresh-process and temporary-`CODEX_HOME` isolation; sanitized canonical evidence; package script and documentation reconciliation; post-GREEN design review; and the prescribed validation sequence.

Out of scope: credentials, any provider invocation, a new freeze, campaign execution, live Codex commands, historical report regeneration, report-schema migration, freeze-schema migration, dependency changes, RFC or ADR changes, commits, pushes, and claims about telemetry delivery or live readiness. The provider-free `codex features list` parser probe is the only Codex CLI execution authorized by this plan.

## Definitions

**G2** is the bounded architecture recommendation emitted after baseline and deep E2 evidence. **Deep canary evidence** is the `CanaryAssessment` from the deep E2 condition and must be `PASS`. **Deep final response** is the capability row whose identifier is exactly `deep-final-response`; a baseline response is not a substitute. **OTEL** is OpenTelemetry. **OTLP/HTTP** is its HTTP exporter transport. **Exact form** is the nested exporter value `exporter: { 'otlp-http': { endpoint, protocol: 'json' } }`, represented to the CLI through the corresponding dotted configuration key. **Legacy form** is the rejected scalar exporter `exporter: 'otlp-http'`. **Parsing qualification** establishes only that pinned CLI configuration parsing discriminates these forms under the tested command.

## Existing Context

`experiments/capabilities.ts` currently stops only for deep `INVALID_CANARY`, and it searches any condition for an observed final response. That allowed the historical baseline-pass/deep-error case from ExecPlan 6 to emit favorable G2 options despite missing deep evidence. `experiments/cli.ts` supplies the deep canary to this decision but cannot compensate for the permissive rule.

`experiments/configuration.ts` currently emits both scalar `otel.exporter = 'otlp-http'` and an obsolete `otel.otlp_http` sibling. Official OpenAI documentation describes OTLP/HTTP as a nested exporter variant and recommends `log_user_prompt = false`; the exact consulted page is `https://learn.chatgpt.com/docs/config-file/config-advanced`. The pinned dependency versions are Codex SDK and CLI `0.147.0` and Promptfoo `0.122.0`. Freeze schema 3 captures the scientific configuration digest, so changing the scientific condition naturally invalidates older freezes without a schema change.

ExecPlan 6 and its four files in `docs/experiments/` are historical evidence. Their campaign narrative and bytes must remain unchanged except for one follow-up pointer added to ExecPlan 6.

## Desired End State

`recommendG2(matrix, deepCanary)` returns only `STOP_AND_REASSESS` when deep canary evidence is absent, `ERROR`, or `INVALID_CANARY`; it also stops when `deep-final-response` is not observed. Existing positive options remain available only after a passing deep canary and an observed deep final response. The G2 JSON shape remains unchanged.

The deep provider configuration contains only `otel.exporter['otlp-http']` with the loopback endpoint and JSON protocol plus `log_user_prompt: false`; all other scientific settings and freeze schema 3 remain intact.

`npm run experiment:qualify:codex-otel` launches the pinned CLI's provider-free `features list` command four times: two exact and two legacy attempts, each as a fresh process with a distinct temporary `CODEX_HOME`. It emits canonical schema-1 JSON, suppresses subprocess output and sensitive or ephemeral values, and reports `EXACT_SUPPORTED` only when exact parsing succeeds twice, legacy parsing is rejected twice with the expected parser classification, the version is exactly `0.147.0`, and process plus home isolation are proven. Blocked or inconsistent evidence cannot produce support. Its limitations explicitly exclude OTEL delivery, authenticated identity, zero egress, and live readiness.

## Milestones

### Milestone 1 — Make G2 require deep evidence

#### Goal

Close the observed decision-gate defect through the report CLI and preserve positive behavior only for valid deep evidence.

#### Changes

- [x] Add a report-CLI regression in `test/cli.test.ts` for baseline pass, deep error, and trace presence; require only `STOP_AND_REASSESS`.
- [x] Update `experiments/capabilities.ts` minimally so `ERROR`, `INVALID_CANARY`, and missing deep-canary evidence stop G2.
- [x] Add a second regression proving a baseline response cannot substitute for missing `deep-final-response`.
- [x] Preserve the existing G2 JSON contract and positive option ordering.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: each new regression first fails for the intended favorable recommendation and then the full suite passes after the minimal implementation.
- [x] Command: `npm run experiment:verify`
- [x] Expected result: public offline verification passes with zero provider imports after no more than two cycles.

#### Acceptance Criteria

- [x] Deep `ERROR`, deep `INVALID_CANARY`, absent deep canary, or absent deep response cannot yield a favorable G2 option.
- [x] A passing deep canary plus required deep response preserves existing bounded positive options.

### Milestone 2 — Correct the scientific OTEL condition

#### Goal

Represent the deep OTLP/HTTP exporter in the supported nested form without changing unrelated scientific settings.

#### Changes

- [x] Change the existing behavior expectation in `test/experiment-configuration.test.ts` to the nested exporter shape and observe RED.
- [x] Update `experiments/configuration.ts` to remove the scalar exporter and `otlp_http` sibling.
- [x] Preserve the loopback endpoint, JSON protocol, `log_user_prompt: false`, model, budgets, isolation, canary, tracing, and schema version 3.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: 47 tests pass after the configuration cycle.
- [x] Command: `npm run experiment:verify`
- [x] Expected result: public offline verification remains green.

#### Acceptance Criteria

- [x] The only deep exporter representation is `{ 'otlp-http': { endpoint: 'http://127.0.0.1:4318/v1/logs', protocol: 'json' } }`.
- [x] Scientific digest inputs change while freeze schema stays 3.

### Milestone 3 — Qualify pinned Codex OTEL parsing

#### Goal

Add discriminating, provider-free parser evidence for the exact and legacy forms.

#### Changes

- [x] Add one orchestration behavior in the existing `test/tracing-gate.test.ts` covering two exact and two legacy attempts, canonical sanitized output, distinct fresh processes and homes, exact version enforcement, and blocked or inconsistent evidence.
- [x] Add `experiments/qualify-codex-otel.ts` with stable report types, classification, orchestration, fresh temporary-home lifecycle, a minimal environment, and a pinned local CLI launcher.
- [x] Add `experiment:qualify:codex-otel` to `package.json` without changing dependencies.
- [x] Suppress raw stderr, feature-list output, temporary paths, process IDs, and credential-bearing environment values.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: exactly 48 tests pass in 14 files.
- [x] Command: `npm run experiment:verify`
- [x] Expected result: public offline verification remains green.
- [x] Command: `npm run experiment:qualify:codex-otel`
- [x] Expected result: canonical schema-1 evidence reports `EXACT_SUPPORTED` for Codex CLI `0.147.0` and states the four explicit limitations.

#### Acceptance Criteria

- [x] Four attempts run in the prespecified two-by-two order and cannot be selectively omitted.
- [x] Support requires exact success twice, expected legacy parser rejection twice, exact CLI version, unique process identities, and unique temporary-home identities.
- [x] No subprocess output, raw error, temporary path, PID, credential, or feature list appears in rendered evidence.

### Milestone 4 — Review, reconcile, and validate

#### Goal

Consolidate the green design, reconcile canonical documentation, prove historical immutability, and execute the full validation sequence.

#### Changes

- [x] Enter `$refactor-design` only after all behavior, `npm test`, and `npm run experiment:verify` are green and no milestone behavior remains.
- [x] Update this living plan and `docs/execplans/README.md`; add only a follow-up pointer to ExecPlan 6.
- [x] Leave `AGENTS.md`, RFCs, ADRs, and the four historical reports unchanged, with explicit documentation-impact reasons.

#### Validation

- [x] Run, in order: `npm ci`; `npm audit --json`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run prettier:check`; `npm run build`; `npm run experiment:verify`; `npm run experiment:qualify:codex-otel`; `npm run experiment:qualify:tracing`; `npm run experiment:verify:tracing`; `git diff --check`; `git status --short`.
- [x] Expected result: every command passes, audit reports zero vulnerabilities, Vitest reports 48 tests in 14 files, both qualifiers and both verification paths pass, and status lists only the intended uncommitted implementation.
- [x] Confirm the SHA-256 digests of all four `docs/experiments/foundation-e0-e2-gate2-20260809-r2-*.json` files remain `db7f2f847c9acc03f1f91a2cd68afa2d5c23f539c31008dc0b5fcd41c446ff14`, `5a395aec76ce3575a93655f1f1c19cfa96f137d0c4fc1c847edaac8a2aa3999b`, `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`, and `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395` in filename order.

#### Acceptance Criteria

- [x] The implementation is green, design-reviewed, documented, uncommitted, and ready for separate commit authorization.
- [x] No live, credentialed, freeze, campaign, or historical-regeneration action occurred.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Consult official OpenAI advanced configuration documentation for nested OTLP/HTTP exporter syntax and prompt redaction.
- [x] Confirm the repository workflow profile, relevant suite `npm test`, public checkpoint `npm run experiment:verify`, final validation order, plan destination, and canonical documentation sources.
- [x] Create this living ExecPlan before implementation.
- [x] Milestone 1 started: add the report-CLI regression for baseline pass, deep error, and trace presence.
- [x] Milestone 1 completed: both report-CLI regressions failed for the observed favorable options, then 47 tests passed after G2 required a passing deep canary and observed `deep-final-response`.
- [x] Milestone 2 started: change the existing deep configuration expectation to the supported nested OTLP/HTTP exporter.
- [x] Milestone 2 completed: the nested expectation failed against the scalar-plus-sibling form, then 47 tests passed with the nested exporter and freeze schema 3 unchanged.
- [x] Milestone 3 started: specify the four-attempt parser qualification through its stable orchestration and rendered evidence contracts.
- [x] Milestone 3 completed: 48 tests pass in 14 files, offline verification passes, and the real four-process qualifier emits canonical schema-1 `EXACT_SUPPORTED` evidence for CLI `0.147.0`.
- [x] Post-GREEN design review completed: one observed-version defect returned to behavior TDD and was corrected; no further structural change was justified.
- [x] Documentation reconciled: index updated, one follow-up pointer added to ExecPlan 6, and all no-change sources reviewed explicitly.
- [x] Final validation completed in the prescribed order.

## Decisions

- Decision: treat missing deep canary evidence as a stopping condition in addition to explicit `ERROR` and `INVALID_CANARY`.
  Rationale: positive G2 options require direct deep evidence; optional input must fail closed rather than manufacture sufficiency from baseline rows.
  Date/Author: 2026-08-09 / implementation agent

- Decision: qualify the exact nested exporter against a deliberately invalid scalar contrast with two repetitions per condition.
  Rationale: THEORY requires both known-valid and known-invalid oracle behavior, while repetitions establish only local parser stability and not telemetry delivery.
  Date/Author: 2026-08-09 / implementation agent

- Decision: keep qualification evidence schema 1 independent of the public G2 and freeze schemas.
  Rationale: the qualifier is a new development artifact printed to stdout; no persisted report or product schema migration is needed.
  Date/Author: 2026-08-09 / implementation agent

- Decision: derive the report's top-level CLI version from all four attempts rather than copying the required version constant.
  Rationale: the required version is a decision threshold, while the report field is observed evidence; conflating them would misstate a blocked wrong-version run.
  Date/Author: 2026-08-09 / implementation agent after design review

- Decision: make no further behavior-preserving structural refactor after the corrected review gate.
  Rationale: the orchestration, report projection, and process launcher form one cohesive development qualifier; their test seam is used by runtime composition, and transport spelling remains appropriately local to this integration boundary.
  Date/Author: 2026-08-09 / implementation agent after design review

## Risks and Mitigations

- Risk: baseline success masks deep failure. Mitigation: gate on the explicit deep canary and exact `deep-final-response` capability identifier.
- Risk: parser success is overstated as delivery evidence. Mitigation: encode four explicit limitations in every report and keep campaign execution out of scope.
- Risk: the probe reads user state or credentials. Mitigation: create a distinct empty temporary `CODEX_HOME` for every attempt, pass a minimal environment, use only `features list`, and remove each home afterward.
- Risk: ephemeral or sensitive diagnostics leak through evidence. Mitigation: classify stderr inside the launcher, never expose raw output, and project only enumerated booleans and fixed classifications.
- Risk: process reuse or selective results create false stability. Mitigation: require four unique process identities, four unique home identities, both repetitions, known conditions, and internally consistent outcomes.
- Risk: scientific changes are mistaken for schema changes. Mitigation: retain freeze schema 3 and rely on the changed canonical scientific digest to invalidate prior freezes.
- Risk: historical evidence is accidentally rewritten. Mitigation: record current SHA-256 digests before editing and verify them after all formatting and validation commands.

## Validation Strategy

Each TDD cycle runs the full Vitest suite and confirms the expected failure before implementation. `npm run experiment:verify` is the provider-free public checkpoint at least every two cycles and at milestone completion. The post-GREEN design gate reuses those tests and checkpoint. Final validation is broader and runs exactly in the user-prescribed order, including provider-free and loopback-only integration checks.

The Codex qualifier may execute only the local pinned CLI's `features list` parser path. Promptfoo tracing qualification and loopback tracing verification use deterministic local providers and loopback receivers; neither authorizes external provider traffic. No validation command creates a freeze, executes E1/E2, regenerates reports, commits, or pushes.

Final validation ran on 2026-08-09 in the prescribed order. `npm ci` completed with only existing dependency deprecation warnings. `npm audit --json` reported zero vulnerabilities across 967 dependencies. Typecheck, lint, Prettier, and build passed; Vitest reported exactly 48 passing tests in 14 files; offline verification reported provider imports `0`; Codex OTEL qualification emitted schema 1 `EXACT_SUPPORTED` for CLI `0.147.0`; Promptfoo tracing qualification emitted `EXACT_SUPPORTED`; and loopback tracing verification passed runtime, typed, and integration checks. `git diff --check` passed, `git status --short` listed only this plan's intended uncommitted files, and the four historical report digests matched their recorded values byte-for-byte.

## Documentation Impact

This file is the canonical implementation and evidence record for ExecPlan 7. `docs/execplans/README.md` must index its current status. ExecPlan 6 receives one non-narrative follow-up pointer because it is the provenance of the observed G2 defect; its campaign account remains untouched.

`package.json` is the canonical command surface and gains the parser qualifier script. Official OpenAI advanced configuration documentation is the external canonical source for the nested exporter syntax. `AGENTS.md` remains accurate because project structure, commands, safety boundaries, and workflow rules do not change. RFCs and ADRs remain accurate because this is development instrumentation hardening rather than a product or architecture decision. The four files under `docs/experiments/` remain byte-for-byte historical evidence and are never regenerated or formatted.

Documentation reconciliation reviewed `AGENTS.md`, `docs/decisions/0001-theory-first-promptfoo-foundation.md`, `docs/decisions/0002-bounded-evaluation-and-out-of-band-instrument-evolution.md`, and `docs/decisions/README.md`; none requires a change because no contributor workflow, public report schema, Foundation decision boundary, or architecture decision changed. Earlier ExecPlans remain historical records and are unchanged except for the single follow-up pointer in ExecPlan 6.

## Rollout and Recovery

There is no deployment or live rollout. The completed work remains uncommitted for separate authorization. Recovery is a normal revert of the intended source, test, package, and documentation edits; old schema-3 freezes remain readable but cannot match the new scientific digest. If qualification is blocked in another environment, preserve the canonical blocked report and do not weaken the predicate or infer delivery readiness.

## Lessons Learned

- Sequential temporary directories can reuse the same inode immediately after removal. A non-exported isolation proof must bind the unique temporary path together with device and inode identity; inode identity alone caused the first real qualifier checkpoint to block despite four fresh homes.
- A required version constant is not observed-version evidence. The report must derive its top-level CLI version from all four attempts and block inconsistent or non-pinned observations.
