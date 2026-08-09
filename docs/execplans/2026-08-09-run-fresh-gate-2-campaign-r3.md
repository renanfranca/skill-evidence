# ExecPlan 8 — Run a Fresh Gate 2 Campaign after OTEL Hardening

- Date: 2026-08-09
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Planning baseline: `a0dd21d998dff438fd7ccd55bf8b5f0fafe159a4`
- Campaign ID: `foundation-e0-e2-gate2-20260809-r3`
- Status: authorized; preparation validated and ready to commit

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while execution advances.

Safety boundary: This task is limited to an authorized, defensive evaluation campaign in this repository. It must not bypass policy, credential, isolation, budget, or stopping controls.

## Purpose / Big Picture

Run a new immutable E0–E2 Gate 2 campaign after the G2 fail-closed correction and the exact Codex OTEL parser qualification. The observable outcome is either a bounded stop with preserved causal evidence or a complete E1, baseline E2, deep E2, and decision-eligible G2 evidence set. The operator authorized at most one invocation of each condition, with no retries and later conditions strictly dependent on earlier gates.

## Scope

In scope: commit this plan and its index before freezing; validate the exact clean revision; preflight a dedicated logged-in Codex home without reading credential content; create one new freeze; execute E1 and conditionally execute baseline and deep E2; produce sanitized public reports only when both E2 conditions run and required artifacts exist; record the result; and commit the final campaign record separately.

Out of scope: retries, reuse or modification of an earlier freeze or campaign, source or test changes, scientific-configuration changes, dependency changes, reading `auth.json`, persisting credentials or raw reasoning, more than three provider calls, E3, product architecture, an adapter, a Judge, automatic implementation of a G2 option, pushes, and historical report regeneration.

## Definitions

**E1** is the one-call authentication check whose only accepted response is `E1_AUTH_OK`. **G1** is `PASS` only when E1 returns that exact response without a provider error. **E2 baseline** is the normal tracing condition with a mechanical workspace canary. **E2 deep** adds Codex deep tracing through the qualified nested OTLP/HTTP exporter and requires a valid baseline canary. **G2** is the bounded capability recommendation generated only after both E2 commands run. **Freeze** is the ignored canonical record binding the campaign to one Git commit, manifest, lockfile, dependency versions, scientific configuration, and Codex-home identity. **Reservation** is an exclusive ignored record proving that one provider invocation started and cannot be retried.

The designated `CODEX_HOME` remains operator-local state. Its path must not be persisted; no credential file may be read. The harness records only a one-way directory identity and sanitizes the path from evidence.

## Existing Context

ExecPlan 6 ran campaign `foundation-e0-e2-gate2-20260809-r2`: E1 and baseline passed, but deep failed while parsing the obsolete scalar OTEL exporter. Its emitted G2 was preserved but declared ineligible because the evaluator allowed favorable options without valid deep evidence.

ExecPlan 7 corrected G2 to require a passing deep canary and an observed `deep-final-response`, replaced the exporter with the nested OTLP/HTTP representation, and added a provider-free four-process qualifier. Commit `a0dd21d` is clean and aligned with its origin. On 2026-08-09, `npm run experiment:verify` reported zero provider imports, the Codex OTEL qualifier reported schema-1 `EXACT_SUPPORTED` for CLI `0.147.0`, and Vitest reported 48 passing tests in 14 files.

## Desired End State

Preparation documentation is committed before a new freeze binds the exact clean revision. At most one reservation exists for each authorized condition and no more than three exist in total. E1 runs first; baseline runs only after G1 `PASS`; deep runs only after baseline canary `PASS`. A failed prerequisite stops all later calls without adapting the frozen condition.

When both E2 commands run and all required artifacts exist, `experiment:report` creates exactly four sanitized `r3` reports: E1, capability matrix, G2, and ownership matrix. A favorable G2 requires a passing deep canary and observed deep final response. If deep runs but fails, the complete report may be generated, but G2 must contain only `STOP_AND_REASSESS`. If execution stops before deep, no interface-incompatible partial report is created.

No public TypeScript API, CLI command, report schema, freeze schema, direct dependency, RFC, ADR, or historical artifact changes.

## Milestones

### Milestone 1 — Commit and qualify the campaign protocol

#### Goal

Create a clean preparation commit containing only this plan and its index entry, then prove the current instrument is ready without provider traffic.

#### Changes

Add this file and update `docs/execplans/README.md`. Record current THEORY provenance, authorization, campaign identity, gates, validation, and stopping conditions. Do not change source, tests, product documentation, decisions, or experiment reports.

#### Validation

Run in order: `npm ci`; `npm audit --json`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run prettier:check`; `npm run build`; `npm run experiment:verify`; `npm run experiment:qualify:codex-otel`; `npm run experiment:qualify:tracing`; `npm run experiment:verify:tracing`; `git diff --check`; `git status --short`.

#### Acceptance Criteria

Audit reports zero vulnerabilities; Vitest reports exactly 48 passing tests in 14 files; offline verification reports zero provider imports; both qualifiers report `EXACT_SUPPORTED`; loopback tracing passes; the historical `r2` reports retain their recorded SHA-256 digests; and `$commit-the-changes` creates a preparation commit leaving a clean worktree.

### Milestone 2 — Preflight and freeze the clean revision

#### Goal

Stop before cost unless every operational precondition holds, then bind one new campaign to the clean preparation commit.

#### Changes

Use the operator-designated dedicated logged-in `CODEX_HOME` only in the command environment. Confirm it is writable, its directory identity is stable, `codex login status` reports a ChatGPT login, the worktree is clean and aligned with origin, forbidden API-key variables are absent, and no `r3` campaign directory exists. Run `npm run experiment:freeze -- --campaign foundation-e0-e2-gate2-20260809-r3` once.

Inspect only the canonical freeze projection. Record its commit and scientific digest; confirm schema 3, Promptfoo `0.122.0`, Codex SDK/CLI `0.147.0`, the qualified nested OTLP/HTTP configuration, no path or credential leakage, and no reservation or ledger before E1.

#### Validation

The freeze matches the current committed repository, lockfile, versions, scientific configuration, and Codex-home identity. Any preflight or freeze discrepancy stops the campaign before a reservation is created.

#### Acceptance Criteria

Exactly one immutable `r3` freeze exists, no provider call has occurred, and the repository revision remains clean and unchanged.

### Milestone 3 — Execute the conditional live sequence

#### Goal

Collect live evidence only through the prespecified order and stopping rules.

#### Changes

Run `npm run experiment:e1 -- --campaign foundation-e0-e2-gate2-20260809-r3` exactly once. Continue only if the curated result has exact `E1_AUTH_OK`, no provider error, and G1 `PASS`.

Then run `npm run experiment:e2:baseline -- --campaign foundation-e0-e2-gate2-20260809-r3` exactly once. Continue only if provider status and the byte-exact workspace canary are `PASS`.

Then run `npm run experiment:e2:deep -- --campaign foundation-e0-e2-gate2-20260809-r3` exactly once. Never retry or alter the frozen condition. If both E2 commands ran and their required artifacts exist, run `npm run experiment:report -- --campaign foundation-e0-e2-gate2-20260809-r3` without making another provider call.

#### Validation

The ignored ledger contains exactly the ordered subset of `e1`, `e2-baseline`, and `e2-deep` permitted by reached gates. No condition has more than one reservation. Curated evidence contains no external path, credential, or raw reasoning. A favorable G2 exists only with deep canary `PASS` and observed `deep-final-response`; otherwise it is only `STOP_AND_REASSESS`.

#### Acceptance Criteria

No later call occurs after a failed prerequisite, no retry occurs under any outcome, and the final state is either a bounded stop or a complete sanitized report set.

### Milestone 4 — Reconcile and commit the result

#### Goal

Create an auditable tracked campaign record without modifying frozen or historical evidence.

#### Changes

Update this plan and `docs/execplans/README.md` immediately after the live sequence with the freeze commit, scientific digest, reservations, observed outcomes, G2 eligibility, limitations, and stopping decision. Include exactly the four generated `r3` reports only if the complete report set exists. Keep `.skill-evidence/`, `dist/`, credentials, and raw reasoning untracked.

Use `$commit-the-changes` to create one final documentation/evidence commit. Do not push.

#### Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `git diff --check`, canonical JSON checks, SHA-256 checks for all four historical `r2` reports, and leakage searches over intended staged files. Do not rerun a live command as validation.

#### Acceptance Criteria

The tracked record distinguishes direct observations, configuration inferences, limitations, and unsupported claims; the final commit contains only intended documentation/evidence; historical evidence remains byte-for-byte unchanged; and the worktree is clean.

## Progress

- [x] Read current THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full and confirm it remains `main`.
- [x] Receive explicit operator authorization for at most one E1, one conditional baseline E2, and one conditional deep E2 invocation, with no retries.
- [x] Confirm the planning baseline is clean, aligned with origin, offline-provider-free, `EXACT_SUPPORTED` for Codex OTEL parsing, and green with 48 tests.
- [x] Milestone 1 started: create the living campaign protocol.
- [x] Complete Milestone 1 validation: audit zero, 48 tests, offline provider imports zero, both qualifiers `EXACT_SUPPORTED`, loopback tracing passed, formatting and diff checks passed, and historical digests matched.
- [ ] Create the Milestone 1 preparation commit.
- [ ] Complete Milestone 2 preflight and freeze.
- [ ] Complete Milestone 3 conditional live sequence and reporting.
- [ ] Complete Milestone 4 reconciliation, final validation, and result commit.

## Decisions

- Decision: use campaign ID `foundation-e0-e2-gate2-20260809-r3` and never reuse an earlier campaign lineage.
  Rationale: the OTEL scientific configuration and G2 evaluator changed after `r2`; continuing validity requires a fresh freeze and evidence lineage.
  Date/Author: 2026-08-09 / operator and implementation agent

- Decision: authorize no more than three calls as a conditional maximum, with no retries.
  Rationale: G1 and the baseline canary are mandatory stopping gates; consumed reservations are immutable evidence, not retry opportunities.
  Date/Author: 2026-08-09 / operator

- Decision: keep the exact path and credential content of the designated Codex home outside tracked and rendered evidence.
  Rationale: only writability, login status, and one-way directory identity are required for the experiment boundary.
  Date/Author: 2026-08-09 / implementation agent

- Decision: stop and require a separate ExecPlan if a new instrument defect appears.
  Rationale: changing source or scientific conditions after freeze would invalidate the campaign and prespecification.
  Date/Author: 2026-08-09 / implementation agent

## Risks and Mitigations

- Risk: a stale or unwritable login consumes a reservation. Mitigation: perform host-level writability, identity, and login checks immediately before freeze and E1.
- Risk: parser qualification is mistaken for telemetry delivery. Mitigation: claim only parser support before the live deep observation and retain explicit limitations.
- Risk: baseline success masks deep failure. Mitigation: require the explicit deep canary and exact `deep-final-response` row for favorable G2 options.
- Risk: accidental retries or parallel calls exceed authority. Mitigation: run sequentially, inspect the exclusive ledger after each call, and stop on every failed prerequisite.
- Risk: raw artifacts disclose sensitive state. Mitigation: keep `.skill-evidence/` ignored, inspect only enumerated projections, and leakage-check every staged file.
- Risk: historical evidence is rewritten. Mitigation: verify recorded SHA-256 digests before preparation and after final reconciliation.

## Validation Strategy

Milestone 1 uses the full provider-free and loopback-only validation sequence. Milestone 2 validates preconditions and freeze integrity without a provider call. Milestone 3 validates each gate and ledger before considering the next authorized call. Milestone 4 runs non-live regression and artifact checks only. No successful validation may override a failed mandatory gate or direct critical evidence.

The Milestone 1 sequence passed on 2026-08-09. `npm audit --json` reported zero vulnerabilities; Vitest reported 48 passing tests in 14 files; offline verification reported provider imports `0`; both development qualifiers reported `EXACT_SUPPORTED`; loopback tracing reported runtime, typed, and integration checks true; Prettier and `git diff --check` passed; and the four historical `r2` SHA-256 digests matched their ExecPlan 7 records.

## Documentation Impact

This file is the canonical living protocol and result record for campaign `r3`; `docs/execplans/README.md` tracks its current status. ExecPlans 6 and 7 remain canonical provenance and require no narrative change. The four `r2` reports remain immutable historical evidence. `AGENTS.md`, RFC 0001, ADR 0002, and `docs/decisions/README.md` remain accurate because this campaign does not change contributor workflow, schemas, scientific boundaries, or architecture decisions.

## Rollout and Recovery

There is no deployment. Before freeze, preparation documentation can be corrected normally. After freeze, source, scientific configuration, and campaign identity cannot change; any discrepancy stops `r3` and requires a new campaign. Tracked result documentation can be reverted with Git, but ignored reservations and raw evidence remain immutable local audit state. No G2 option authorizes automatic product work.

## Lessons Learned

- Pending execution. Record any non-obvious operational or evidentiary finding immediately.
