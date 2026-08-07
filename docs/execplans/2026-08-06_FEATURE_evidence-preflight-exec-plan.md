# Harden Evidence Preflight

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and
Mitigations`, and `Lessons Learned` current as implementation advances.

## Purpose / Big Picture

Make model-session authorization depend on deterministic, complete, and
auditable evidence. A user will be able to create a canonical `preflight.json`
without model calls, then run a bounded fake or real flow only when the plan,
inputs, models, sandbox, evidence schemas, and credit authorization still match.
Incomplete evidence will stop before a judge session, while critical direct
evidence will remain authoritative over a favorable semantic verdict.

## Scope

In scope are the public `preflight` command, the strengthened `run` command,
strict schemas for preflight, judge input, and Evidence v2, positive evidence
records for every contract check, session-role usage and credit accounting,
development-versus-decision case isolation, four unseen decision cases, judge
calibration examples, fake nine-session validation, and README reconciliation.

Out of scope are a real model pilot, human review execution, archive execution,
Git commit or push, generalization to other skills, causal contribution,
version comparison, repeated-run stability, broader robustness, implicit skill
activation, and languages other than TypeScript. `THEORY.md` at commit
`c1fb47c40b806596d89fa3196e53967f20c8926c` remains normative and is not edited.

Safety boundary: this task is limited to authorized, defensive maintenance of
this repository. It does not run a real model session or bypass sandboxing,
approval, or cost controls.

## Definitions

- Preflight is a deterministic, model-free artifact proving that a particular
  plan is currently eligible to start its bounded session flow.
- Judge input is the canonical sanitized evidence packet for one decision case.
- Evidence v2 is the strict canonical run record that adds check-level evidence,
  per-session usage, cache tokens, roles, credits, and explicit scope metadata.
- A development case is visible regression material that may validate the tool
  but cannot influence the evaluation decision.
- A decision case is an unseen usage or stress case whose result may influence
  eligibility; exactly four are permitted in this pilot.
- A session ledger records input, cached input, output, role, and charged credits
  separately for every calibration, executor, and judge session.
- Credit enforcement occurs between sessions. A session already started cannot
  be interrupted retroactively by the limit.

## Existing Context

Commit `dc7a9dd` provides a TypeScript/Node 24 CLI with `check`, `plan`, `run`,
`review`, `archive`, and `render`. `src/runner.ts` currently validates plan and
skill fingerprints inside `run`, always calls a judge after each executor, and
writes loosely-schemaed Evidence v1 with aggregate input/output usage. The four
bundled cases under `evaluations/refactor-design/cases` are the already observed
pilot population. `test/core.test.ts` mixes stable-domain and CLI-adjacent tests;
new behavior will be specified through the CLI, canonical artifacts, or stable
domain contracts rather than new internal-helper tests.

Canonical sources are `schemas/*.schema.json` for machine interfaces,
`evaluations/refactor-design/evaluation.json` plus referenced case and contract
files for evaluation inputs, `README.md` for user workflow, this living plan for
implementation decisions, and upstream `THEORY.md@c1fb47c...` for evaluation
theory.

## Desired End State

`skill-evidence preflight --plan <plan.json> --out <preflight.json>` writes a
strict canonical artifact with stable checks in `PASS`, `FAIL`, `INCONCLUSIVE`,
or `ERROR`. Every check states its contract, phase, severity, observed facts,
evidence type, digest, reference, and temporal position where relevant. It
detects drift in the engine, schemas, evaluation, target skill, and configured
models; it also verifies executor sandbox settings (`workspace-write`, network
off, no writable roots, and no `/tmp` or `$TMPDIR` exception).

`skill-evidence run --plan ... --preflight ... --approve-sessions 9
--max-credits <limit>` accepts only a matching eligible preflight. It checks the
credit ceiling immediately before every next session, records a role-separated
ledger including cached tokens, creates a strict sanitized `judge-input.json`
only from complete positive evidence, and does not invoke the judge when proof
is missing. Four development cases remain regression-only; four new decision
cases, split two usage/two stress, alone feed eligibility. Evidence v1 continues
to render, but confirmation accepts only Evidence v2.

## Milestones

### Milestone 1 - Establish strict preflight and evidence contracts

#### Goal

Add canonical public artifacts and prove missing versus complete judge evidence,
direct critical precedence, and precise sandbox/path auditing.

#### Changes

- [x] Add `schemas/preflight.schema.json`, `schemas/judge-input.schema.json`, and
      strict Evidence v2 support in `schemas/evidence.schema.json` and public
      TypeScript types.
- [x] Add the public `preflight` CLI path and canonical artifact writer.
- [x] Materialize check evidence and gate judge packet creation on completeness.
- [x] Keep absolute executables distinct from actual external write targets.
- [x] Update this plan during each behavior cycle; README changes wait until the
      public workflow settles.

#### Validation

- [x] Command: `npm test` after every behavior cycle.
- [x] Command after cycles 2 and 4: `node dist/cli.js preflight --plan <fixture-plan> --out <temporary-output>`.
- [x] Expected result: missing proof makes the case inconclusive without a judge;
      complete proof yields schema-valid canonical judge input; direct critical
      failures override favorable semantic output.

#### Acceptance Criteria

- [x] Behaviors 1 through 4 are each introduced by one failing public-path test.
- [x] Strict artifacts reject unknown or missing fields.

### Milestone 2 - Bind preflight and authorization to immutable inputs

#### Goal

Refuse every relevant drift and require explicit session and credit authority
before the fake flow can start.

#### Changes

- [x] Fingerprint engine source/build, schemas, evaluation inputs, original
      skill, filtered skill snapshot, and executor/judge model configuration.
- [x] Encode sandbox/network/writable-root invariants and unknown relevant event
      handling in preflight.
- [x] Add `--preflight` and `--max-credits` to `run` and implement the per-session
      ledger and between-session credit gate.
- [x] Preserve all canonical inputs, outputs, cached tokens, roles, and credits.

#### Validation

- [x] Command: `npm test` after every behavior cycle.
- [x] Commands after cycles 6 and 8: build plus public `preflight` and fake `run`
      checkpoints.
- [x] Expected result: drift blocks before sessions, eligible preflight permits a
      fake start, and insufficient remaining credits block the next session.

#### Acceptance Criteria

- [x] Behaviors 5 through 8 are each introduced by one failing public-path test.
- [x] No real Codex executable is invoked.

### Milestone 3 - Separate development material from unseen decisions

#### Goal

Move the observed four cases out of the decision population, add four novel
decision cases, and strengthen calibration against invalid and unsupported
answers.

#### Changes

- [x] Extend evaluation/case schemas with explicit development/decision purpose.
- [x] Reclassify the four current cases as development/regression only.
- [x] Add two new usage and two new stress decision fixtures, prompts, contracts,
      oracles, and valid/invalid/alternative/unsupported qualification examples.
- [x] Keep all declared out-of-scope claims `NOT_EVALUATED`.
- [x] Ensure the single future calibration qualifies all examples while the
      executor and judge receive no hidden decision answers in this implementation.

#### Validation

- [x] Command: `npm test` after every behavior cycle.
- [x] Commands after cycles 10 and 12: `node dist/cli.js check evaluations/refactor-design`
      and public fake-flow checkpoints.
- [x] Expected result: development cases cannot change eligibility, exactly four
      new decision cases feed use/stress evaluation, and calibration rejects both
      invalid behavior and fluent claims without evidence.

#### Acceptance Criteria

- [x] Behaviors 9 through 12 are each introduced by one failing public-path test.
- [x] Decision fixtures are novel and have not been sent to any model.

### Milestone 4 - Complete fake flow and reconcile documentation

#### Goal

Prove the complete nine-session fake journey, Evidence v2 lifecycle boundary,
and final documented workflow without review, archive, or real sessions.

#### Changes

- [x] Exercise calibration, four executors, up to four judges, review readiness,
      and archive readiness through fakes without executing review or archive.
- [x] Preserve Evidence v1 rendering and reject v1 confirmation.
- [x] Reconcile `README.md`, schemas, and this ExecPlan with actual behavior.

#### Validation

- [x] Command: `npm run lint`.
- [x] Command: `npm run typecheck`.
- [x] Command: `npm test`.
- [x] Command: `npm run prettier:check`.
- [x] Command: `npm run build`.
- [x] Command: `node dist/cli.js check evaluations/refactor-design`.
- [x] Command: `node dist/cli.js plan evaluations/refactor-design --model gpt-5.6-luna --reasoning-effort max --judge-model gpt-5.6-terra --judge-reasoning-effort xhigh --out .skill-evidence/next-plan.json`.
- [x] Command: `node dist/cli.js preflight --plan .skill-evidence/next-plan.json --out .skill-evidence/next-preflight.json`.
- [x] Expected result: all commands pass; preflight is deterministic and eligible;
      no model session, human review, archive, commit, or push occurs.

#### Acceptance Criteria

- [x] Behavior 13 begins red and the fake flow completes nine sessions.
- [x] The full matrix is green and canonical documentation agrees with it.

## Progress

- [x] Create and register this ExecPlan as active before code changes.
- [x] Start Milestone 1.
- [x] Complete behavior 1: missing required evidence blocks judge creation.
- [x] Complete behavior 2: complete evidence creates canonical valid judge input.
- [x] Complete behavior 3: critical direct result overrides favorable judge.
- [x] Complete behavior 4: sandbox/path audit distinguishes executable and write.
- [x] Complete behavior 5: reject engine/schema/evaluation/skill/model drift.
- [x] Complete behavior 6: eligible preflight authorizes fake flow without models.
- [x] Complete behavior 7: ledger separates input/cache/output/role/credits.
- [x] Complete behavior 8: credit ceiling blocks before the next session.
- [x] Complete behavior 9: render Evidence v1; require v2 for confirmation.
- [x] Complete behavior 10: development cases cannot influence the decision.
- [x] Complete behavior 11: four unseen decision cases feed use/stress only.
- [x] Complete behavior 12: calibration rejects invalid and unsupported fluency.
- [x] Complete behavior 13: fake nine-session flow reaches review/archive readiness.
- [x] Complete Milestones 1 through 4.
- [x] Reconcile README and schemas with final behavior.
- [x] Run final validation with zero real sessions.

## Decisions

- Decision: retain one sequential behavior suite and observe through CLI,
  canonical files, or existing stable domain contracts rather than mirror new
  production modules with test files.
  Rationale: the requested TDD profile protects public behavior across internal
  refactors.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: use `gpt-5.6-luna/max` only as plan metadata for future executors and
  `gpt-5.6-terra/xhigh` only as future calibration/judge metadata.
  Rationale: implementation acceptance explicitly forbids real sessions.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: represent projected cost in integer microcredits in enforcement code
  and decimal credits at the CLI/artifact boundary.
  Rationale: integer comparison prevents floating-point boundary errors while
  keeping the user-facing limit legible.
  Date/Author: 2026-08-06 / Codex.
- Decision: keep the prior four cases in `developmentCases` and expose only the
  four new case references through the decision `cases` collection.
  Rationale: plan sizing, execution, and eligibility then structurally exclude
  already-observed regression material while retaining it for local validation.
  Date/Author: 2026-08-06 / Codex.
- Decision: materialize an observability evidence record for every decision
  contract and refuse judge-packet creation whenever a relevant event is unknown.
  Rationale: contracts that do not explicitly request trajectory evidence still
  cannot be judged safely from an incomplete executor stream.
  Date/Author: 2026-08-06 / Codex.

## Risks and Mitigations

- Risk: a permissive schema creates the appearance of proof without a complete
  evidence chain.
  Mitigation: use `additionalProperties: false`, explicit required fields,
  digest verification, and end-to-end schema validation.
- Risk: preflight passes and inputs drift before `run`.
  Mitigation: bind all fingerprints and model settings into preflight, then
  revalidate them immediately before every run.
- Risk: incomplete observability reaches the judge and receives a plausible
  verdict.
  Mitigation: make completeness a local prerequisite for writing judge input or
  invoking the judge.
- Risk: cost estimates differ from final provider billing.
  Mitigation: record projected credits deterministically per session, expose the
  assumption, enforce between sessions, and never claim retroactive interruption.
- Risk: decision cases leak during implementation.
  Mitigation: use only the local fake executable; do not invoke Codex or another
  model with case contents.
- Risk: development cases accidentally affect eligibility.
  Mitigation: encode purpose in schema and derive decisions exclusively from the
  decision subset.

## Validation Strategy

For each ordered behavior, add one test at the highest stable observation point,
run `npm test` to prove the expected red, implement the smallest green change,
and refactor only after green. After every second cycle, build and execute a
public CLI checkpoint. Final validation runs lint, typecheck, all tests, Prettier,
build, `check`, `plan`, and `preflight`. Environment variables select only the
bundled fake executable during run tests; no validation command may invoke real
models.

Final evidence on 2026-08-06: lint, typecheck, 27 behavior tests, Prettier, and
build passed. Public `check`, Luna/Terra `plan`, and `preflight` passed with six
preflight checks and deterministic byte-identical output. A public CLI run using
only `test/fixtures/fake-codex.mjs` completed one calibration, four executors,
and four judges; Evidence v2 recorded nine sessions, 18 cached input tokens,
3.33 credits, four passing decision cases, four canonical judge packets, and an
eligible recommendation. It produced a report but no `review.json`; no archive,
real model call, commit, or push was performed.

## Documentation Impact

`README.md` documents `preflight`, required run approvals, sandbox
invariants, Evidence v1/v2 lifecycle behavior, decision/development isolation,
the per-session credit ledger, projected 3.33-credit budget, and the fact that a
credit ceiling is checked only between sessions. `schemas/*.schema.json` remain
the canonical machine contracts and become strict for all new artifacts.
`evaluations/refactor-design/evaluation.json` remains the canonical bounded
evaluation definition. Upstream `THEORY.md@c1fb47c...` remains accurate and
unchanged because this work operationalizes rather than revises it.

## Rollout and Recovery

Keep the package private and use fake execution for this change. The new
preflight is additive at creation time and intentionally mandatory at run time;
operators can recover by regenerating a preflight from an unchanged plan.
Generated local artifacts remain under ignored `.skill-evidence/`. Reverting the
implementation and this active plan restores v1 behavior; no target repository,
remote, archive, review, or model account is mutated automatically.

## Lessons Learned

- The v1 runner already contains the direct-result precedence rule and the
  absolute-executable path fix, but they are covered partly through helper-level
  tests. This cycle must preserve them through stable public behavior.
- The v1 `evidence.schema.json` intentionally permits nested arbitrary objects;
  the implemented schema retains that v1 render branch and adds a strict v2
  branch for new confirmations.
- Adding an explicit Vitest configuration initially broadened discovery into
  fixture `node:test` files and preserved failed local workspaces. Restricting
  discovery to `test/**/*.test.ts` keeps the repository suite behavior-focused.
- Sharing one successful fake run across independent assertions keeps the full
  suite fast while each behavior remains observed through the canonical run
  artifacts and stable public APIs.
- Post-GREEN design review found hidden invocation state in environment variables
  used to pass session roles and calibration probes. Passing those values
  directly into each subprocess environment removed cross-session coupling while
  preserving the fake and public CLI behavior.
