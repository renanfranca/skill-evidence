# ExecPlan 2 — Qualify Promptfoo tracing without changing the live instrument

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Evaluated repository base: `60c024062df5aa1c1eadf08ced3de9e61bb7536f`
- Pinned Promptfoo version: `0.122.0`
- Status: complete with `ALTERNATIVE_SUPPORTED`. No live invocation is authorized.

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, validation evidence, `Documentation Impact`, and `Lessons Learned` current as work advances.

## Purpose / Big Picture

Add one development-only command, `npm run experiment:qualify:tracing`, that determines whether pinned Promptfoo can recover a correlated loopback OTLP span under the exact frozen persistence condition or under one isolated public alternative. The command runs two fresh Node processes per condition, emits a sanitized canonical capability report, and terminates successfully whenever the evidence supports a defensible classification. Its report is development evidence only and cannot modify or authorize the E1/E2 instrument.

Safety boundary: this task is limited to authorized, defensive maintenance of this repository. It uses no login, OpenAI/Codex provider, external endpoint, credentials, or paid call.

## Scope

In scope: a qualifier worker and orchestrator under `experiments/`; exactly one new npm interface; four isolated attempts; deterministic local provider and assertions; loopback OTLP receiver; temporary per-process Promptfoo storage; canonical sanitized output; behavioral tests for aggregation, process isolation, repetition count, sanitization, and all aggregate results; plan and index reconciliation; local capability evidence.

Out of scope: E1/E2 execution, any live harness configuration change, freeze, campaign, `runId`, `docs/experiments/` report, private Promptfoo import, credential use, external provider or endpoint, paid call, promotion of `writeLatestResults=true`, or claims about Codex deep tracing, authenticated identity, absence of egress, and live readiness.

## Definitions

An **attempt** is one worker invocation in a fresh Node process and unique temporary storage. The **exact condition** uses `writeLatestResults=false`. The **alternative condition** uses `writeLatestResults=true`; current official documentation describes this option as persistence, but that current description is not retroactively treated as a stable 0.122.0 contract. A **correlated span** is the deterministic `deterministic.command` span posted with Promptfoo's supplied trace context and recovered through the returned evaluation's public runtime `getTraces()` method.

Attempt status is `SUPPORTED` when the correlated span is recovered, `UNSUPPORTED` when the public lifecycle completes sufficiently to show that it was not recovered, and `BLOCKED` when bind, process, package, or infrastructure failure prevents the observation. Aggregate status is `EXACT_SUPPORTED`, `ALTERNATIVE_SUPPORTED`, `INSUFFICIENT`, or `BLOCKED` according to the prespecified two-by-two matrix.

## Existing Context

At `60c0240`, `experiments/tracing-check.ts` and `experiment:verify:tracing` test only `writeLatestResults=false` and fail because the loopback receiver and `getTraces()` reach TraceStore tables without the database migrations triggered by the persisted evaluation path. The earlier hardening record observed success with temporary persistence, but that evidence did not match the frozen condition. Promptfoo 0.122.0 declares and exposes `getTraces()`; these type and runtime facts do not by themselves establish stable documentation or operational support.

## Desired End State

The new public development command launches exactly four fresh workers in deterministic order: two exact attempts followed by two alternative attempts. Every worker owns storage that is removed on completion. The final stdout is one canonical JSON value containing version, condition matrix, separate type/runtime/provider/receiver/summary/recovery facts, attempt statuses, limitations, and one aggregate result. Temporary paths and sensitive values are absent. A defensible negative result exits zero; malformed or unavailable worker evidence is represented as `BLOCKED` rather than silently retried.

## Milestones

### Milestone 1 — Specify the report and aggregation behavior

#### Goal

Establish the public report contract and all four aggregate classifications through behavior tests before implementation.

#### Changes

- [ ] Add behavior-focused qualifier cases to `test/tracing-gate.test.ts`.
- [ ] Add typed report and pure classification behavior in `experiments/qualify-tracing.ts`.
- [ ] Update this plan with RED/GREEN evidence.

#### Validation

- [ ] Command: `npm test`
- [ ] Expected result: the full Vitest suite passes and explicitly covers all four aggregate statuses.
- [ ] Command: `npm run experiment:verify`
- [ ] Expected result: offline checkpoint remains green with zero provider imports.

#### Acceptance Criteria

- [ ] Exactly two attempts per condition are required.
- [ ] Mixed outcomes or infrastructure blocks aggregate to `BLOCKED`.
- [ ] No public condition recovering a span aggregates to `INSUFFICIENT`.

### Milestone 2 — Execute isolated real workers

#### Goal

Run the pinned Promptfoo lifecycle in fresh processes with unique temporary storage and emit sanitized canonical evidence.

#### Changes

- [ ] Add `experiments/qualify-tracing-worker.ts` with deterministic provider, loopback receiver, prompt, assertion, and separate observed facts.
- [ ] Complete `experiments/qualify-tracing.ts` as the child-process orchestrator and canonical CLI.
- [ ] Add only `experiment:qualify:tracing` to `package.json`.
- [ ] Preserve `experiments/tracing-check.ts`, live configuration, freeze, budget, canary, reporting, and live commands unchanged.

#### Validation

- [ ] Command: `npm test`
- [ ] Expected result: behavior tests prove four fresh launches, two repetitions, sanitization, canonical output, and classification.
- [ ] Command: `npm run experiment:qualify:tracing`
- [ ] Expected result: a canonical report is emitted and the process exits zero with a defensible aggregate result.
- [ ] Command: `npm run experiment:verify`
- [ ] Expected result: offline checkpoint remains provider-free.

#### Acceptance Criteria

- [ ] No worker reuses a Node process or temporary storage.
- [ ] No login, paid provider, external endpoint, credential, or private Promptfoo import is configured.
- [ ] The report contains no temporary filesystem path.

### Milestone 3 — Review, reconcile, and close the qualification

#### Goal

Record the complete matrix and bounded technical inference, perform the post-GREEN structural review, and finish all validations without promoting an alternative.

#### Changes

- [ ] Record commit, exact commands, attempt matrix, limitations, and migrations/TraceStore inference in this plan.
- [ ] Update ExecPlan 1 only with a pointer to the result; do not authorize E1.
- [ ] Update `docs/execplans/README.md`; leave RFC 0001, ADR 0002, `docs/decisions/README.md`, `AGENTS.md`, and `docs/experiments/` unchanged with recorded justification.
- [ ] Run `$refactor-design` after behavior, tests, and both public checkpoints meet their entry gates.

#### Validation

- [ ] Run in order: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `npm run experiment:qualify:tracing`, `npm run experiment:verify:tracing`, `git diff --check`, `git status --short`.
- [ ] Expected result: all general validations and the qualifier pass; the existing exact-condition tracing checkpoint may fail only in agreement with both exact-condition rows.

#### Acceptance Criteria

- [ ] The capability report is complete and auditable.
- [ ] Any alternative remains a future candidate requiring a separate plan, scientific configuration, fingerprint, freeze, qualification, and authorization.
- [ ] No live artifact or invocation exists.

## Progress

- [x] Repository confirmed clean at `60c024062df5aa1c1eadf08ced3de9e61bb7536f`.
- [x] THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` read in full.
- [x] Applicable repository and workflow instructions read.
- [x] Milestone 1 started.
- [x] Milestone 1 completed: 35 Vitest cases pass, including the four prespecified aggregate classifications; `experiment:verify` remains provider-free.
- [x] Milestone 2 started.
- [x] Milestone 2 completed: the sandbox produced four `BLOCKED` attempts because loopback bind was denied; the externally authorized loopback-only rerun produced the complete consistent matrix below.
- [x] Milestone 3 started.
- [x] Post-GREEN `$refactor-design` completed: one duplicated-matrix projection risk was consolidated; the frozen checkpoint/qualifier duplication was intentionally left separate to preserve the live boundary.
- [x] Milestone 3 completed: documentation reconciled, final validation recorded, and no live artifact or instrument change created.

## Decisions

- Decision: keep the qualifier separate from `tracing-check.ts` and every live command.
  Rationale: the work measures a development capability and must not mutate the frozen decision instrument.
  Date/Author: 2026-08-08 / user and Codex.

- Decision: use new Node processes, not repeated calls in one process.
  Rationale: Promptfoo holds module-level database and TraceStore state, so process reuse would contaminate nominal repetitions.
  Date/Author: 2026-08-08 / user and Codex.

- Decision: classify from recovered correlated spans and preserve intermediate facts separately.
  Rationale: method presence, provider completion, receiver acceptance, summary availability, and trace recovery answer different evidence questions.
  Date/Author: 2026-08-08 / user and Codex.

- Decision: classify the pinned package as `ALTERNATIVE_SUPPORTED` without promoting `writeLatestResults=true`.
  Rationale: both exact-condition attempts failed to recover a span while both isolated persistence attempts recovered it; RFC 0001 and ADR 0002 require instrument evolution to remain out of band and requalified after material change.
  Date/Author: 2026-08-08 / qualification evidence.

## Risks and Mitigations

- Risk: the sandbox denies `127.0.0.1` bind. Mitigation: mark attempts blocked, then repeat only loopback checkpoints with external authorization.
- Risk: Promptfoo logs expose temporary paths. Mitigation: child stdout is parsed as a single report channel, stderr is not copied into the report, and any bounded diagnostic is sanitized.
- Risk: process-global Promptfoo state contaminates repetitions. Mitigation: one worker process and unique temporary storage per attempt.
- Risk: current documentation is projected backward onto 0.122.0. Mitigation: record current documentation and pinned type/runtime/integration facts separately.
- Risk: alternative success is mistaken for authorization. Mitigation: classify it only as a candidate and keep ExecPlan 1 blocked.

## Validation Strategy

Each behavior begins with a failing test at the qualifier report/orchestrator boundary, runs the full Vitest suite, receives the minimum implementation, and reruns `experiment:verify` at least every two cycles. The real qualifier is the public development checkpoint. The final ordered validation preserves the expected exact-condition failure as evidence only when it matches the report matrix.

## Documentation Impact

`docs/execplans/2026-08-08-qualify-promptfoo-tracing.md` is the canonical execution and capability record for this work. `docs/execplans/2026-08-08-theory-first-promptfoo-foundation-e0-e2.md` remains the canonical RFC-scoped live plan and receives only a result pointer. `docs/execplans/2026-08-08-pre-live-instrument-hardening-record.md` preserves the closed historical record. `docs/execplans/README.md` distinguishes their roles. RFC 0001, ADR 0002, and `docs/decisions/README.md` remain unchanged because no architecture or bounded-evaluation rule changes. `AGENTS.md` remains accurate because it already defines both existing checkpoints; the new command is development-only and documented here. No generated documentation or `docs/experiments/` artifact is created.

## Rollout and Recovery

There is no deployment. Revert the new command, worker, orchestrator, tests, and ExecPlan 2 together if qualification cannot produce defensible evidence. Never change the live freeze or reuse a campaign to recover from a qualification failure. A blocked process result remains evidence of an unavailable environment, not tracing support or lack of support.

## Lessons Learned

- Promptfoo 0.122.0 exposes `getTraces()` in both its pinned declaration and runtime evaluation object under both tested conditions.
- With `writeLatestResults=false`, the deterministic provider completed and the summary remained available, but the receiver rejected the OTLP span and `getTraces()` recovered nothing in both fresh processes.
- With `writeLatestResults=true`, the receiver accepted the span and `getTraces()` recovered the correlated `deterministic.command` span in both fresh processes.
- Inspection of the pinned public-entry implementation supports a bounded technical inference: `evaluate()` runs database migrations only when `writeLatestResults` is true, while the OTLP receiver and `Eval.getTraces()` use the same SQLite-backed TraceStore. The exact-condition failures are therefore consistent with missing TraceStore tables. This is an implementation inference from pinned source plus observed behavior, not a stable API contract.
- The current Promptfoo Node API documentation describes `writeLatestResults` as persistence. That current description is recorded separately and is not treated as retroactive stable-contract evidence for 0.122.0.
- The design review first exposed a defect in the aggregate representation: two rows did not guarantee distinct repetitions. Behavior TDD now requires repetitions `1` and `2` for each condition and blocks contradictory status/evidence combinations.
- Post-fix design review classified the two independent projections of condition attempts as a design risk and consolidated them without changing the public report. Reusing tracing code from the frozen live checkpoint was classified `No action`, because that would couple development qualification to the live contract.

## Qualification Record

Evaluated repository commit: `60c024062df5aa1c1eadf08ced3de9e61bb7536f`, with only this ExecPlan's development qualifier changes uncommitted. Pinned Promptfoo: `0.122.0`. Commands were `npm run experiment:qualify:tracing` inside the sandbox, which defensibly returned `BLOCKED` because every attempt was denied loopback bind, followed by the same command outside the sandbox with authorization limited to `127.0.0.1` bind.

| `writeLatestResults` | Repetition | Typed `getTraces()` | Runtime `getTraces()` | Provider completed | Receiver accepted span | Summary available | Correlated span recovered | Attempt result |
| -------------------- | ---------: | ------------------- | --------------------- | ------------------ | ---------------------- | ----------------- | ------------------------- | -------------- |
| `false`              |          1 | yes                 | yes                   | yes                | no                     | yes               | no                        | `UNSUPPORTED`  |
| `false`              |          2 | yes                 | yes                   | yes                | no                     | yes               | no                        | `UNSUPPORTED`  |
| `true`               |          1 | yes                 | yes                   | yes                | yes                    | yes               | yes                       | `SUPPORTED`    |
| `true`               |          2 | yes                 | yes                   | yes                | yes                    | yes               | yes                       | `SUPPORTED`    |

Aggregate result: `ALTERNATIVE_SUPPORTED`. `writeLatestResults=true` is only a candidate for a later authorized plan. Promotion requires a new scientific configuration, capability fingerprint, freeze, qualification, and explicit authorization before any E1 call. This result supports no claim about Codex deep tracing, authenticated-account continuity, absence of egress, paid-provider behavior, skill contribution, or live readiness.

## Final Validation Evidence

The final ordered validation ran on 2026-08-08. The first sandboxed `npm ci` left `node_modules` incomplete despite returning zero; the required exact install was repeated with external authorization and completed successfully. The complete sequence was then restarted after formatting, as required.

- `npm ci`: passed outside the sandbox with the pinned lockfile; only upstream deprecation warnings were emitted.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed 40 tests in 14 files.
- `npm run prettier:check`: passed.
- `npm run build`: passed.
- `npm run experiment:verify`: passed with zero provider imports.
- `npm run experiment:qualify:tracing`: passed outside the sandbox for loopback bind and emitted `ALTERNATIVE_SUPPORTED` with the four rows recorded above.
- `npm run experiment:verify:tracing`: failed as explicitly permitted. Its `writeLatestResults=false` receiver returned HTTP 500 during TraceStore access and `getTraces()` recovered no correlated span, exactly matching both frozen-condition qualifier rows.
- `git diff --check`: passed.
- `git status --short`: showed only the eight intended modified or new source, test, package, and ExecPlan files; no `dist/`, `.skill-evidence/`, `coverage/`, freeze, campaign, `runId`, or experiment report appeared.

RFC 0001, ADR 0002, `docs/decisions/README.md`, and `AGENTS.md` were inspected and left unchanged: the qualifier introduces no architectural decision, does not change bounded-evaluation semantics, and does not change the existing checkpoint descriptions. `docs/experiments/` remains absent because this is development qualification, not a live campaign.
