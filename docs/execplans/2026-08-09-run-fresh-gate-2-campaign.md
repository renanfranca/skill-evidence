# ExecPlan 6 — Run a Fresh Gate 2 Campaign

- Date: 2026-08-09
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Planning baseline: `0055bb5c10895aaa8862b985e77106a754eddf9f`
- Campaign ID: `foundation-e0-e2-gate2-20260809-r2`
- Preparation commit: `f690f92` (`docs: authorize fresh Gate 2 campaign`)
- Status: Gate 1 qualified and ready to freeze; no provider invocation reserved

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while execution advances.

Safety boundary: This task is limited to an authorized, defensive evaluation campaign in this repository. It must not bypass policy, credential, isolation, budget, or stopping controls.

## Purpose / Big Picture

Run a new, immutable E0–E2 Gate 2 campaign against the corrected and dependency-hardened experimental instrument. The observable outcome is either a bounded stop with a preserved causal error or a complete E1, baseline E2, deep E2, and G2 evidence set. The operator authorized at most one invocation of each condition, with no retries and later conditions strictly dependent on earlier gates.

This campaign does not reopen or reinterpret `foundation-e0-e2-gate2-20260808`. That historical campaign remains stopped with G1 `ERROR` after one invocation.

## Scope

In scope: reconcile the final commit status of ExecPlans 4 and 5; commit this plan and its index before freezing; validate the exact clean revision; preflight the designated Codex login without reading credential content; create one new freeze; execute E1 and conditionally execute baseline and deep E2; produce sanitized public reports only if both E2 conditions run; record the result; and commit the final campaign record separately.

Out of scope: retries, reuse or modification of any earlier freeze or campaign, changes to source code or tests, changes to the scientific configuration or direct dependency pins, reading `auth.json`, persisting raw reasoning or credentials, additional provider calls, E3, product architecture, an App Server spike, an adapter, a Judge, or automatic implementation of a G2 recommendation.

## Definitions

**E1** is the one-call authentication and requested-condition check whose only accepted response is `E1_AUTH_OK`. **G1** is `PASS` only when E1 returns that exact response without a provider error. **E2 baseline** is the normal tracing condition with a mechanical workspace canary. **E2 deep** adds Codex deep tracing and requires a valid baseline canary. **G2** is the bounded capability recommendation derived only after both E2 conditions run. **Freeze** is the ignored canonical record binding the campaign to one Git commit, manifest, lockfile, dependency versions, scientific configuration, and login-directory identity. **Reservation** is the exclusive ignored record proving that a provider invocation started and cannot be retried.

The designated external `CODEX_HOME` is `/home/renanfranca/.codex`. It is named here because the operator supplied it explicitly; no credential content or file below that directory may be inspected or persisted. The harness records only a one-way device/inode identity digest and sanitizes the path from evidence.

## Existing Context

ExecPlan 1 built the E0–E2 instrument and records the stopped 2026-08-08 campaign. ExecPlan 3 qualified the exact persisted E2 tracing condition. ExecPlan 4 added a fail-before-cost `W_OK` preflight and lossless normalization of provider summaries containing `undefined`; commit `43cb680` passed 45 tests and local tracing checks. ExecPlan 5 hardened vulnerable transitive dependencies without changing Promptfoo `0.122.0`, Codex SDK `0.147.0`, or Codex CLI `0.147.0`; commit `0055bb5` passed the same behavior and tracing gates with audit zero.

The branch and its origin were aligned at the planning baseline. The worktree was clean, forbidden host API keys were absent, and a read-only preflight inside the restricted sandbox correctly returned `EROFS`. The identical host-level `W_OK` check passed outside the sandbox, and `codex login status` reported a ChatGPT login. This establishes current operational readiness, not authenticated-principal continuity.

## Desired End State

The preparation documentation is committed before the freeze, and the freeze binds the campaign to that clean commit. At most one reservation exists for each authorized condition and no more than three exist in total. E1 runs first; baseline E2 runs only after mechanically confirmed G1 `PASS`; deep E2 runs only after a valid baseline canary. Any failed gate stops the campaign without adapting its condition.

If both E2 conditions run, `experiment:report` creates four sanitized files below `docs/experiments/`: the E1 result, capability matrix, G2 recommendation, and ownership matrix. If evidence is incomplete, no interface-incompatible partial report is created. The final ExecPlan records the exact freeze, configuration digest, reservations, outcomes, limitations, validations, and stopping decision; ignored raw artifacts remain local.

No public TypeScript API, CLI command, schema, scientific condition, threshold, model, retry setting, or direct dependency version changes.

## Milestones

### Milestone 1 — Commit and qualify the campaign revision

#### Goal

Create a clean, reviewable commit that contains only this campaign plan, its index entry, and accurate final status for ExecPlans 4 and 5, then qualify that exact revision without external provider traffic.

#### Changes

Update `docs/execplans/2026-08-08-harden-live-preflight-and-error-projection.md` and `docs/execplans/2026-08-09-remediate-npm-audit-findings.md` with their final commit identities. Add this file and its row in `docs/execplans/README.md`. Use `$commit-the-changes` to stage only these four documentation files and create a Conventional Commit matching repository history.

No source, test, RFC, ADR, decision record, or experiment report changes are required because this milestone records authority and provenance without changing behavior.

#### Validation

Run `npm ci`, `npm audit --json`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `npm run experiment:qualify:tracing`, `npm run experiment:verify:tracing`, `git diff --check`, and `git status --short`. The two tracing commands use deterministic local providers and a loopback-only receiver; they may run outside the restricted sandbox only for filesystem and `127.0.0.1` access.

#### Acceptance Criteria

The audit has zero findings; Vitest reports exactly 45 passing tests; offline verification reports zero provider imports; the qualifier reports `EXACT_SUPPORTED`; the tracing checkpoint passes; documentation formatting passes; and the commit leaves a clean worktree.

### Milestone 2 — Freeze and execute E1

#### Goal

Prove preconditions before cost, freeze the clean committed instrument once, and execute the single authorized E1 invocation.

#### Changes

Outside the restricted sandbox, export `SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME=/home/renanfranca/.codex` only for the command process. Confirm host-level `W_OK`, stable directory identity, ChatGPT login status, clean Git state, absence of `OPENAI_API_KEY` and `CODEX_API_KEY`, and absence of the campaign directory. Do not inspect credential files.

Run `npm run experiment:freeze -- --campaign foundation-e0-e2-gate2-20260809-r2`, inspect the canonical ignored freeze for expected commit and version fields, then run `npm run experiment:e1 -- --campaign foundation-e0-e2-gate2-20260809-r2` exactly once. Inspect the sanitized curated E1 artifact mechanically.

#### Validation

Before E1, the freeze exists and no reservation or budget ledger exists. After E1, exactly `reservations/e1.json` exists and the ledger contains only `e1`. G1 passes only for exact response `E1_AUTH_OK` with no provider error. Any command or evidence failure stops the campaign and forbids both E2 calls.

#### Acceptance Criteria

Either G1 is `PASS` and authorizes baseline E2 under this plan, or G1 is `ERROR` and the campaign is finalized as stopped with the causal sanitized error preserved. There is no E1 retry under any outcome.

### Milestone 3 — Execute conditional E2 and produce G2

#### Goal

Collect baseline and deep observability evidence only through the prespecified sequence, then generate a complete bounded recommendation.

#### Changes

If and only if G1 is `PASS`, run `npm run experiment:e2:baseline -- --campaign foundation-e0-e2-gate2-20260809-r2` exactly once. Inspect the curated baseline canary; stop if it is not `PASS`. If and only if it passes, run `npm run experiment:e2:deep -- --campaign foundation-e0-e2-gate2-20260809-r2` exactly once.

If both E2 conditions ran and produced their required artifacts, run `npm run experiment:report -- --campaign foundation-e0-e2-gate2-20260809-r2`. Inspect every generated document for canonical JSON, campaign/fingerprint consistency, path and credential leakage, raw-reasoning fields, complete ownership, capability limitations, and the bounded G2 recommendation.

#### Validation

The ledger contains the exact ordered subset permitted by reached gates and never exceeds three reservations. Each canary is checked against the synthetic workspace snapshots. `docs/experiments/` receives exactly four files only after complete E2 execution. Missing trace signals remain `INSUFFICIENT`; they are not converted into observed absence.

#### Acceptance Criteria

Later invocations never occur after a failed prerequisite. A complete run produces a valid G2 option but performs no follow-up architecture work. A stopped run retains ignored evidence and emits no partial public report.

### Milestone 4 — Reconcile and commit the result

#### Goal

Turn the observed campaign outcome into an auditable, sanitized historical record without changing the frozen evidence.

#### Changes

Update this ExecPlan and its index row immediately with the freeze commit, scientific configuration digest, reservation count, each reached gate, final recommendation or stopping reason, and limitations. If complete public reports exist, include only those four sanitized generated files. Never stage `.skill-evidence/`, `dist/`, credentials, or raw model reasoning.

Use `$commit-the-changes` to create one final documentation/evidence commit. Source and tests remain unchanged, so `$refactor-design` is not entered; there is no completed implementation shape to refactor.

#### Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `git diff --check`, and leakage searches over the intended staged files. Confirm exactly 45 tests, zero provider imports, canonical generated JSON where applicable, and a clean worktree after commit. Do not rerun any live command as validation.

#### Acceptance Criteria

The committed record distinguishes observed facts, configuration inference, missing evidence, and limitations; matches the ignored campaign artifacts; contains no sensitive material; and does not claim that G2 authorizes subsequent implementation.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Receive explicit operator authorization for at most one E1, one conditional baseline E2, and one conditional deep E2 invocation, with no retries.
- [x] Verify the proposed external login is host-writable and reports a ChatGPT login without reading credential content.
- [x] Milestone 1 started: create the living plan and reconcile prior plan statuses.
- [x] Milestone 1 validation complete: audit zero, 45 tests, offline provider imports zero, local `EXACT_SUPPORTED`, and tracing checkpoint passed.
- [x] Milestone 1 documentation committed at `f690f92`; the living readiness update will be committed before freeze.
- [ ] Milestone 2 freeze created on the exact committed revision.
- [ ] Milestone 2 E1 executed and G1 recorded.
- [ ] Milestone 3 conditional E2 sequence completed or stopped at its first failed gate.
- [ ] Milestone 3 complete reports and G2 generated when eligible.
- [ ] Milestone 4 final record validated and committed.

## Decisions

- Decision: use campaign ID `foundation-e0-e2-gate2-20260809-r2` and prohibit reuse of all earlier campaign IDs.
  Rationale: freeze and reservation exclusivity require a new immutable evidence lineage after instrument and dependency changes.
  Date/Author: 2026-08-09 / operator and planning agent

- Decision: authorize up to three calls as a conditional maximum, not as a target.
  Rationale: G1 and the baseline canary are stopping gates; consuming later calls after failure would violate the prespecified design.
  Date/Author: 2026-08-09 / operator

- Decision: designate `/home/renanfranca/.codex` as the external experiment login and run live commands outside the restricted sandbox.
  Rationale: the sandbox returns `EROFS`, while the host-level `W_OK` check passes and the Codex CLI reports a ChatGPT login. The harness still cannot establish authenticated-principal continuity.
  Date/Author: 2026-08-09 / operator and planning agent

- Decision: commit preparation documentation before freeze and commit results separately afterward.
  Rationale: the freeze requires a clean commit, while the living result record can only be completed after observation.
  Date/Author: 2026-08-09 / planning agent

## Risks and Mitigations

- Risk: sandbox writability is mistaken for host writability. Mitigation: require the exact host-level `W_OK` preflight immediately before freeze and E1; never weaken or bypass the harness check.
- Risk: the supplied directory is replaced or the login changes. Mitigation: bind device/inode identity in the freeze, repeat `codex login status`, and state that principal continuity remains unproven.
- Risk: a failed gate still consumes cost. Mitigation: reserve at most once per condition, preserve the error, stop, and never retry or adapt the frozen campaign.
- Risk: incomplete results are presented as capability evidence. Mitigation: prohibit partial public reports and mark every unobserved downstream claim unavailable.
- Risk: raw artifacts disclose sensitive content. Mitigation: keep `.skill-evidence/` ignored, inspect only sanitized projections, run leakage checks, and stage files explicitly.
- Risk: dependency or worktree drift invalidates comparability. Mitigation: validate before freeze and require the freeze comparison before every invocation.
- Risk: the report's recommendation is mistaken for authority. Mitigation: G2 may only name bounded options; follow-up work requires a separate plan and authorization.

## Validation Strategy

Preparation validation is offline and deterministic except for loopback-only tracing. Live execution is not repeated for validation: each authorized reservation is itself the unique observation. Narrow mechanical inspections occur after freeze and each condition; broad repository validation occurs before freeze and after final documentation reconciliation.

Every command runs from `/home/renanfranca/projects/skill-evidence`. Live commands receive only the explicit CODEX_HOME variable and an environment with `OPENAI_API_KEY` and `CODEX_API_KEY` removed. Command output and committed reports must be sanitized; raw local evidence is never added to Git.

## Documentation Impact

This file is the canonical record for the new campaign. `docs/execplans/README.md` tracks its current gate. ExecPlans 4 and 5 receive only factual final-commit reconciliation. ExecPlan 1 and its stopped campaign remain unchanged because historical evidence cannot be rewritten after instrument evolution.

`docs/experiments/` is created only by the existing report command after complete E2 execution. RFC 0001, ADR 0002, `docs/decisions/README.md`, `AGENTS.md`, source files, tests, and package metadata remain accurate and unchanged because this plan executes the existing frozen interface rather than changing architecture or behavior.

## Rollout and Recovery

There is no deployment. Before freeze, recover from any failure by correcting only preparation documentation or environment prerequisites and rerunning offline gates. After freeze, never modify conditions or reuse the campaign following drift. After a reservation, any error is a terminal observation for that condition and the campaign stops according to its gates.

Ignored campaign artifacts must remain preserved locally for audit. The final tracked record can be reverted as documentation, but reverting it does not erase, retry, or invalidate an already consumed provider invocation. Any G2 follow-up requires a new authorized ExecPlan.

## Lessons Learned

- The previous `EROFS` result was specific to the restricted sandbox. A host-level check against the same directory passed, showing why readiness must be evaluated in the actual execution environment.
- A broad three-call authorization remains safe only when represented as three exclusive, ordered reservations with mandatory stopping gates.
- The first sandboxed `npm ci` emitted its normal deprecation warnings but failed in npm's exit handler because it could not write `~/.npm/_logs`. After full host access was granted, `env TMPDIR=/tmp npm ci` reproduced the lockfile successfully, installed 848 packages, and reported zero vulnerabilities.
- Milestone 1 validation on 2026-08-09 reported zero audit findings across 967 dependencies, exactly 45 passing tests in 14 files, passing typecheck, lint, build, formatting, and diff checks, and offline verification with provider imports `0`. The deterministic qualifier returned `EXACT_SUPPORTED` with two supported exact repetitions and two unsupported non-persisted comparisons; the loopback-only tracing checkpoint passed runtime, typed, and integration checks.
