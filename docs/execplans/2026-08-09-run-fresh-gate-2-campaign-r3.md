# ExecPlan 8 — Run a Fresh Gate 2 Campaign after OTEL Hardening

- Date: 2026-08-09
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Planning baseline: `a0dd21d998dff438fd7ccd55bf8b5f0fafe159a4`
- Campaign ID: `foundation-e0-e2-gate2-20260809-r3`
- Preparation commit: `d0fbf31` (`docs: authorize corrected Gate 2 campaign`)
- Frozen revision: `74dbd356b3bedfd3d557403fd5b3f9f6eae3cf30`
- Scientific configuration digest: `bbd1444af8502b704df51f44d662196443dda39ed38d1b73edfe4a1a3d249ed0`
- Status: complete; E1, baseline, and deep passed; G2 recommends SDK-first with weakened trace-dependent claims

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

## Campaign Result

The freeze bound schema 3 to clean local commit `74dbd356b3bedfd3d557403fd5b3f9f6eae3cf30`, Promptfoo `0.122.0`, Codex SDK and CLI `0.147.0`, and scientific configuration digest `bbd1444af8502b704df51f44d662196443dda39ed38d1b73edfe4a1a3d249ed0`. The selected external Codex home was writable, reported a ChatGPT login, and matched its one-way frozen identity. The freeze contained no external path, credential key, or `auth.json` reference, and no reservation existed before E1.

E1 consumed one reservation and returned exact `E1_AUTH_OK` without a provider error, so G1 passed. Promptfoo logged the known failed trace-store query for this non-persisted condition, but it did not remove or contradict the direct response and curated G1 evidence.

Baseline E2 consumed the second reservation and passed: provider status was `SUCCESS`, the response was `E2_CANARY_OK`, and the mechanical canary confirmed all four byte-exact filesystem effects. Baseline trace signals remain unrequested and `INSUFFICIENT` by design.

Deep E2 consumed the third and final reservation and passed under the nested OTLP/HTTP exporter: provider status was `SUCCESS`, response and canary were `E2_CANARY_OK`, all four filesystem effects passed, and one correlated trace was recovered. The capability matrix contains 24 rows: eight `NATIVE_STABLE`, seven observed `NATIVE_EXPERIMENTAL`, and nine `INSUFFICIENT`. The experimental trace rows include receiver transport, evaluation linkage, command trajectory, file operations, ordering, controlled recovery, and skill-usage metadata; none is promoted to stable evidence or causal skill contribution.

The complete four-report set is canonical and sanitized. G2 is eligible as the bounded Foundation recommendation because the deep canary passed and `deep-final-response` was observed. It offers `CONTINUE_WITH_CODEX_SDK` together with `WEAKEN_SUPPORTED_CLAIMS`; its explicit limitation is that deep trace evidence remains experimental and is not itself decision-eligible. This supports continuing SDK-first only within stable observed surfaces while weakening claims that depend on experimental traces. It does not authorize product implementation automatically.

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

Use the operator-designated dedicated logged-in `CODEX_HOME` only in the command environment. Confirm it is writable, its directory identity is stable, `codex login status` reports a ChatGPT login, the worktree is clean, forbidden API-key variables are absent, and no `r3` campaign directory exists. The preparation commit may be ahead of origin because pushes are out of scope; freeze the exact local commit. Run `npm run experiment:freeze -- --campaign foundation-e0-e2-gate2-20260809-r3` once.

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
- [x] Create the Milestone 1 preparation commit at `d0fbf31`.
- [x] Start Milestone 2: confirm two writable ChatGPT-authenticated Codex homes, select the previously designated external home, confirm forbidden API keys absent, worktree clean, and campaign `r3` absent without reading credentials.
- [x] Create and validate the Milestone 2 freeze at `74dbd356b3bedfd3d557403fd5b3f9f6eae3cf30` with scientific digest `bbd1444af8502b704df51f44d662196443dda39ed38d1b73edfe4a1a3d249ed0` and no reservation.
- [x] Complete Milestone 3: E1, baseline, and deep each ran once and passed; all three authorized reservations are consumed; four canonical sanitized reports were generated.
- [x] Start Milestone 4: reconcile direct observations, limitations, report digests, and the bounded G2 recommendation.
- [x] Complete Milestone 4 reconciliation and final validation; the dedicated result commit is the canonical completion marker.

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

- Decision: reuse the previously designated external Codex home rather than the Linux default; do not persist either path.
  Rationale: both candidates are writable and report a ChatGPT login, while continuity with the prior operator designation minimizes an unplanned environment change. Principal continuity remains unproven.
  Date/Author: 2026-08-09 / implementation agent

- Decision: permit the clean preparation commit to remain ahead of origin and freeze its exact local identity.
  Rationale: pushing is explicitly out of scope, while the harness requires a clean exact commit rather than remote publication.
  Date/Author: 2026-08-09 / implementation agent

- Decision: stop and require a separate ExecPlan if a new instrument defect appears.
  Rationale: changing source or scientific conditions after freeze would invalidate the campaign and prespecification.
  Date/Author: 2026-08-09 / implementation agent

- Decision: accept the emitted G2 as the bounded Foundation recommendation and preserve both options without automatically choosing an implementation.
  Rationale: direct deep evidence satisfied the corrected mandatory gates, while the recommendation accurately retains the limitation that experimental trace signals cannot support stable claims.
  Date/Author: 2026-08-09 / implementation agent

- Decision: interpret the combined options as SDK-first for stable native surfaces plus explicit claim weakening for trace-dependent capabilities.
  Rationale: eight stable rows support native SDK continuation, while seven trace-derived rows remain experimental and nine rows remain insufficient; collapsing them into one unconditional architecture claim would exceed the evidence.
  Date/Author: 2026-08-09 / implementation agent

## Risks and Mitigations

- Risk: a stale or unwritable login consumes a reservation. Mitigation: perform host-level writability, identity, and login checks immediately before freeze and E1.
- Risk: parser qualification is mistaken for telemetry delivery. Mitigation: claim only parser support before the live deep observation and retain explicit limitations.
- Risk: baseline success masks deep failure. Mitigation: require the explicit deep canary and exact `deep-final-response` row for favorable G2 options.
- Risk: accidental retries or parallel calls exceed authority. Mitigation: run sequentially, inspect the exclusive ledger after each call, and stop on every failed prerequisite.
- Risk: raw artifacts disclose sensitive state. Mitigation: keep `.skill-evidence/` ignored, inspect only enumerated projections, and leakage-check every staged file.
- Risk: historical evidence is rewritten. Mitigation: verify recorded SHA-256 digests before preparation and after final reconciliation.
- Risk: the successful deep run promotes experimental traces into stable or causal claims. Mitigation: preserve every row's signal-specific classification and the G2 limitation; do not infer skill contribution from metadata.

## Validation Strategy

Milestone 1 uses the full provider-free and loopback-only validation sequence. Milestone 2 validates preconditions and freeze integrity without a provider call. Milestone 3 validates each gate and ledger before considering the next authorized call. Milestone 4 runs non-live regression and artifact checks only. No successful validation may override a failed mandatory gate or direct critical evidence.

The Milestone 1 sequence passed on 2026-08-09. `npm audit --json` reported zero vulnerabilities; Vitest reported 48 passing tests in 14 files; offline verification reported provider imports `0`; both development qualifiers reported `EXACT_SUPPORTED`; loopback tracing reported runtime, typed, and integration checks true; Prettier and `git diff --check` passed; and the four historical `r2` SHA-256 digests matched their ExecPlan 7 records.

Final validation passed on 2026-08-09 without rerunning a live command. Typecheck, lint, Prettier, build, and `git diff --check` passed; Vitest again reported 48 passing tests in 14 files; offline verification again reported provider imports `0`; all `r3` reports were canonical and passed leakage checks; and the four historical `r2` digests remained unchanged.

The final `r3` report SHA-256 digests in filename order are `f3add9719f72a420681c7c428718c7cf983f596e4f2d06a3052f1f9fa0585b24`, `332de02dd1780517da45b728f4e4e527e208423b9729f0a5adffc97df46090ad`, `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`, and `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395`.

## Documentation Impact

This file is the canonical living protocol and result record for campaign `r3`; `docs/execplans/README.md` tracks its current status. ExecPlans 6 and 7 remain canonical provenance and require no narrative change. The four `r2` reports remain immutable historical evidence. `AGENTS.md`, RFC 0001, ADR 0002, and `docs/decisions/README.md` remain accurate because this campaign does not change contributor workflow, schemas, scientific boundaries, or architecture decisions.

## Rollout and Recovery

There is no deployment. Before freeze, preparation documentation can be corrected normally. After freeze, source, scientific configuration, and campaign identity cannot change; any discrepancy stops `r3` and requires a new campaign. Tracked result documentation can be reverted with Git, but ignored reservations and raw evidence remain immutable local audit state. No G2 option authorizes automatic product work.

## Lessons Learned

- `codex login status` writes its success message to stderr in this environment. A pipe that checks stdout alone falsely fails the preflight even though the login command exits successfully; redirect both streams before matching the fixed status line.
- The nested Codex OTLP/HTTP exporter that was only parser-qualified in ExecPlan 7 also completed the live deep condition and delivered one correlated trace. This is direct evidence for this frozen condition, not a stable public API or general delivery guarantee.
- A valid G2 can preserve multiple bounded options. Here, continuing SDK-first and weakening trace-dependent claims are complementary rather than competing conclusions.
