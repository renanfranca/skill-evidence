# ExecPlan 3 — Promote isolated local persistence for E2

- Date: 2026-08-08
- Executor target: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Repository base: `63e6dc1e9a4a2da415711ec840ec6af392d6f2c2`
- Pinned instrument: Promptfoo `0.122.0`, Codex SDK/CLI `0.147.0`
- Status: Gate 1 complete with `EXACT_SUPPORTED`. Gate 2 is not authorized.

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, validation evidence, `Documentation Impact`, and `Lessons Learned` current as work advances.

## Purpose / Big Picture

Requalify the offline E0–E2 instrument after promoting the Promptfoo persistence condition that ExecPlan 2 found operational. E1 must remain non-persisted while E2 baseline and E2 deep use isolated temporary local persistence, recover and sanitize the evaluation summary and correlated traces into ignored `.skill-evidence/` evidence storage, and remove the temporary Promptfoo database afterward. The real development qualifier and tracing checkpoint must then classify this exact E2 condition as `EXACT_SUPPORTED` without any model call, credential, freeze, or campaign.

The later three-invocation E1/E2 campaign is a separate gate. It may begin only after this implementation is reviewed, committed cleanly, and the operator gives separate authorization.

Safety boundary: this task is limited to authorized, defensive maintenance of this repository. Gate 1 uses a deterministic local provider and loopback receiver only; it configures no external provider or endpoint.

## Scope

In scope: condition-specific `writeLatestResults`; scientific-configuration versioning; freeze incompatibility; explicit exact-condition qualification; a real tracing checkpoint matching E2; unique temporary Promptfoo database ownership; sanitized summary and trace retention before database cleanup; tests; ExecPlan 1 and index reconciliation; and full offline validation.

Out of scope: model-backed invocation; authentication; credentials; a new campaign or freeze; E1, G1, E2 baseline, E2 deep, G2, or curated experiment reports; dependency updates; E3; retries; provider changes; RFC 0001, ADR 0002, their index, or historical-record rewrites.

## Definitions

The **exact condition** is the complete E2 tracing condition now specified by the scientific configuration: `writeLatestResults=true`, `sharing=false`, Promptfoo cache disabled, telemetry and updates disabled, unique temporary `PROMPTFOO_CONFIG_DIR`, and the loopback OTLP receiver. **Persistence** means only Promptfoo's temporary local database and associated local files; it never means sharing. **Retained evidence** is the sanitized canonical summary and trace projection copied below ignored `.skill-evidence/` before cleanup. A **freeze drift** is any mismatch in schema version or canonical scientific configuration and requires a new campaign and freeze.

## Existing Context

ExecPlan 1 froze all three suites with `writeLatestResults=false`. ExecPlan 2 ran two fresh-process repetitions under each persistence value and observed that Promptfoo `0.122.0` recovered the deterministic correlated span only with `writeLatestResults=true`, classifying the candidate as `ALTERNATIVE_SUPPORTED`. `experiments/configuration.ts` currently types `ExperimentSuite.writeLatestResults` as literal `false` and scientific schema version 2. `experiments/isolation.ts` already points Promptfoo configuration, cache, and logs at one unique temporary root and removes it in `finally`; Promptfoo resolves its database as `PROMPTFOO_CONFIG_DIR/promptfoo.db`. `experiments/run.ts` collects summary and traces inside that lifetime and writes sanitized raw projections under the campaign before cleanup.

The THEORY requires claims to remain conditional on the system version, direct evidence to be preserved before making capability claims, missing observations not to become absence claims, material condition changes to invalidate continuing evidence, and evaluator qualification to precede the campaign. These constraints make the new persistence policy part of the versioned scientific configuration and prohibit reuse of earlier freezes.

## Desired End State

`createExperimentInvocation()` emits `writeLatestResults=false` for E1 and `true` for both E2 conditions, with `sharing=false` everywhere. Scientific configuration and freeze schemas advance so every older freeze fails closed. The isolation contract exposes an exact temporary database path and proves cleanup after success and failure. Live orchestration copies sanitized summary and trace evidence before the isolation lifetime ends. The qualifier report names the exact condition structurally rather than treating Boolean `false` as inherently exact, and the deterministic real qualifier yields `EXACT_SUPPORTED`. `experiment:verify:tracing` exercises the same persistence, sharing, tracing, cache, and isolation settings as E2.

## Milestones

### Milestone 1 — Version the condition-specific persistence policy

#### Goal

Make persistence an explicit per-condition scientific policy and invalidate all earlier freezes.

#### Changes

- [x] Update behavior cases in `test/experiment-configuration.test.ts`, `test/instrument-freeze.test.ts`, and the existing offline behavior suites.
- [x] Update `experiments/configuration.ts`, `experiments/freeze.ts`, and canonical consumers to express E1 false, both E2 true, `sharing=false`, and new schema versions.
- [x] Keep `npm run experiment:verify` green after the RED/GREEN cycle.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: the full Vitest suite proves all three condition policies and rejects schema-2 freezes.
- [x] Command: `npm run experiment:verify`
- [x] Expected result: the public offline path remains provider-free and checks the new invariants.

#### Acceptance Criteria

- [x] E1 cannot accidentally inherit persistence from E2.
- [x] E2 baseline and deep are comparable on persistence and sharing.
- [x] A prior freeze is incompatible even if dependency and Git inputs otherwise match.

### Milestone 2 — Preserve sanitized evidence before database cleanup

#### Goal

Make temporary local persistence observable and bounded across success and failure.

#### Changes

- [x] Extend behavior cases in `test/promptfoo-isolation.test.ts` and `test/live-experiment-runner.test.ts` for database location, cleanup, retention, and sanitization.
- [x] Evolve `experiments/isolation.ts` to expose the exact temporary database path while preserving telemetry, update, and cache controls.
- [x] Confirm `experiments/run.ts` already persists and rereads summary and trace projections before temporary cleanup; no production edit was needed.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: the full suite proves the database is isolated and removed while canonical sanitized artifacts remain.
- [x] Command: `npm run experiment:verify`
- [x] Expected result: offline safety invariants remain green.

#### Acceptance Criteria

- [x] No Promptfoo database survives the isolation callback.
- [x] Sanitized summary and traces survive below the caller's ignored artifact root.
- [x] Temporary paths, dedicated `CODEX_HOME`, credentials, and raw reasoning are absent from retained evidence.

### Milestone 3 — Requalify the exact E2 tracing condition

#### Goal

Name and execute the promoted E2 condition as the exact qualifier and tracing checkpoint.

#### Changes

- [x] Update behavior cases in `test/tracing-gate.test.ts` so exactness is driven by a named condition contract, not Boolean ordering.
- [x] Evolve `experiments/qualify-tracing.ts` and its worker to report the complete exact condition and classify it without assuming `false` is baseline.
- [x] Update `experiments/tracing-check.ts` to reproduce E2's persistence, sharing, cache, receiver, and isolation settings through `experiments/verify-tracing.ts`.

#### Validation

- [x] Command: `npm test`
- [x] Expected result: the full suite proves named exactness, `EXACT_SUPPORTED`, sanitization, and process isolation.
- [x] Command: `npm run experiment:qualify:tracing`
- [x] Expected result: two exact E2 repetitions recover the correlated span and the canonical result is `EXACT_SUPPORTED`.
- [x] Command: `npm run experiment:verify:tracing`
- [x] Expected result: the real loopback-only checkpoint passes under the exact E2 condition.

#### Acceptance Criteria

- [x] The qualifier cannot relabel a different persistence setting as exact implicitly.
- [x] The exact-condition report includes `writeLatestResults=true`, `sharing=false`, and the local isolation controls.
- [x] Both real development checkpoints use no credential or external provider.

### Milestone 4 — Design review, documentation, and final validation

#### Goal

Complete post-GREEN structural review and leave a handoff-safe, clean Gate 1.

#### Changes

- [x] Run `$refactor-design` only after all behaviors, the full suite, and public checkpoints are green.
- [x] Reconcile this plan, ExecPlan 1, and `docs/execplans/README.md` without rewriting historical records.
- [x] Record why RFC 0001, ADR 0002, `docs/decisions/README.md`, `AGENTS.md`, and historical plans remain unchanged.

#### Validation

- [x] Run in order: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `npm run experiment:qualify:tracing`, `npm run experiment:verify:tracing`, `git diff --check`, `git status --short`.
- [x] Expected result: 43 tests and every checkpoint pass; status lists only intended Gate 1 changes.

#### Acceptance Criteria

- [x] Gate 1 contains no campaign, freeze instance, model invocation, credential, or curated live report.
- [x] Gate 2 remains explicitly pending separate operator authorization after a clean commit.

## Progress

- [x] Repository confirmed clean at `63e6dc1e9a4a2da415711ec840ec6af392d6f2c2`.
- [x] THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` read in full.
- [x] Promptfoo's current Node API and Node package documentation reviewed; persistence and sharing are separate controls.
- [x] Applicable repository and workflow instructions read.
- [x] Milestone 1 started.
- [x] Milestone 1 completed: 40 Vitest cases pass; E1 remains non-persisted, both E2 suites persist with sharing disabled, schema 3 rejects a schema-2 freeze, and the offline checkpoint remains provider-free.
- [x] Milestone 2 started.
- [x] Milestone 2 completed: 43 Vitest cases prove the exact database path, cleanup after success/failure, and sanitized E2 summary/trace retention before cleanup.
- [x] Milestone 3 started.
- [x] Milestone 3 completed: the fresh-process real qualifier observed two supported exact repetitions and two unsupported non-persisted comparisons, producing `EXACT_SUPPORTED`; the exact E2 tracing checkpoint passed with authorized loopback bind.
- [x] Milestone 4 started.
- [x] Milestone 4 completed: post-GREEN design review, documentation reconciliation, and the complete ordered final validation passed.

## Decisions

- Decision: treat only E2's persisted condition as exact; keep E1 non-persisted.
  Rationale: E1 characterizes authentication/model/reasoning and does not require Promptfoo trace recovery, while E2 directly depends on the lifecycle qualified by ExecPlan 2.
  Date/Author: 2026-08-08 / user and Codex.

- Decision: make exactness a structured condition identity in qualification evidence.
  Rationale: `false` and `true` are mechanism values, not semantic labels; implicit Boolean ordering could silently misclassify a future configuration.
  Date/Author: 2026-08-08 / Codex.

- Decision: advance both scientific-configuration and freeze schemas.
  Rationale: the persistence change materially alters the evaluated system, so continuing validity and regression protection require older freezes to be mechanically incompatible.
  Date/Author: 2026-08-08 / Codex.

- Decision: freeze the exported qualifier conditions after the post-GREEN design review.
  Rationale: requests, attempts, and reports share these values by reference; runtime immutability prevents an accidental mutation from relabeling the exact condition during qualification.
  Date/Author: 2026-08-08 / Codex.

## Risks and Mitigations

- Risk: local persistence is mistaken for remote sharing. Mitigation: preserve literal `sharing=false` in every suite and assert it independently from `writeLatestResults`.
- Risk: temporary database deletion precedes evidence recovery. Mitigation: collect, sanitize, persist, and reread summary/traces inside the isolation lifetime; remove the database only in `finally`.
- Risk: Promptfoo module-global database state crosses nominal runs. Mitigation: preserve fresh-process qualification and unique configuration roots; do not claim more isolation than observed.
- Risk: a prior freeze is accidentally accepted. Mitigation: schema validation and canonical comparison fail closed before budget reservation or provider loading.
- Risk: loopback bind is denied by the sandbox. Mitigation: request authorization only for the two deterministic loopback checkpoints; no external provider or endpoint is configured.
- Risk: successful deterministic tracing is overstated. Mitigation: limit `EXACT_SUPPORTED` to the pinned Promptfoo lifecycle and retain limitations for Codex deep tracing, authentication, and egress.

## Validation Strategy

Each behavior is introduced through an existing behavior-focused suite at the highest stable public boundary, followed by the full Vitest suite and the minimum GREEN change. `npm run experiment:verify` is the provider-free public checkpoint at least every two cycles. The deterministic qualifier and tracing command are real local integration checkpoints after unit behavior is green. Final validation runs only after post-GREEN design review and documentation reconciliation.

## Documentation Impact

This file is the canonical implementation record for the promoted instrument. ExecPlan 1 is reconciled as the canonical operational handoff for the newly qualified but not-yet-authorized E1/E2 campaign, while preserving its earlier decisions as dated history. `docs/execplans/README.md` records ExecPlan 3 as complete with `EXACT_SUPPORTED`. ExecPlan 2 and the pre-live hardening record remain immutable historical evidence. RFC 0001, ADR 0002, and `docs/decisions/README.md` remain unchanged because this plan follows their out-of-band evolution and requalification rule rather than changing it. `AGENTS.md` remains unchanged because its commands and safety boundaries already describe both checkpoints. No generated documentation or `docs/experiments/` artifact is created in Gate 1.

## Rollout and Recovery

There is no deployment. Gate 1 may be reverted as one coherent set of configuration, freeze schema, isolation, tracing, tests, and documentation changes. No older campaign or freeze may be migrated or reused; Gate 2 must create a new campaign and freeze from a clean committed revision. If qualification is blocked, retain the diagnostic classification and do not execute E1.

## Lessons Learned

- Promptfoo `0.122.0` resolves its SQLite database below `PROMPTFOO_CONFIG_DIR`, so the existing unique configuration root is the ownership boundary that must be made explicit and tested.
- Current Promptfoo documentation exposes `sharing` and `writeLatestResults` independently and describes persisted results as the prerequisite for viewing or sharing, consistent with the bounded local-persistence interpretation.
- The managed sandbox consistently denies loopback bind with `EPERM`; the same deterministic commands pass when authorized only for `127.0.0.1:4318`.
- The first sandboxed `npm ci` could not complete the dependency tree without registry access and left development binaries absent; the authorized lockfile-only rerun restored the pinned tree before the final sequence restarted.
- Post-GREEN review classified mutable shared qualifier conditions as a design risk and removed it with runtime freezing; no other reviewed finding justified an in-scope refactor.
