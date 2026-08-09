# Protect E3 Archaeological Regressions

- Date: 2026-08-09
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Branch: `feat/e3-archaeological-regression-corpus`
- Planning baseline and branch point: `0e8975148041396b634ca7635f8e0ba03ddb728a`
- Status: planned; implementation requires approval of this ExecPlan

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while work advances.

Safety boundary: This task is limited to authorized, defensive offline maintenance of this repository. It must not invoke a provider, use credentials, create a campaign or freeze, or produce decision evidence.

## Purpose / Big Picture

Implement RFC 0001 stage E3 as a deterministic Archaeological Regression Corpus. The public offline checkpoint will prove that six historical measurement failures remain rejected before any future decision material can be produced, while preserving the Foundation's zero-provider-import boundary.

The implementation protects semantic requirements rather than copying the V1 architecture. A user can observe success through `npm run experiment:verify`, which will report six passing archaeological regressions and zero provider imports.

## Scope

In scope: structured offline fixtures for RFC regressions R1–R6; a small experimental evaluator for their explicit facts; behavior-focused Vitest coverage; integration into the existing offline verification command; formatting coverage for `evaluations/`; and documentation reconciliation.

Out of scope: copying V1 implementation files; creating `src/`, product schemas, a product CLI, a Blueprint, an Author, compiler, Judge invocation, Promptfoo execution, model calls, credentials, live tracing, a campaign, a freeze, decision cases, statistical claims, or changes to historical reports.

## Definitions

**Archaeological regression** is an offline fixture that preserves a legitimate semantic requirement learned from a historical measurement defect without preserving the implementation that caused it. **Direct critical violation** is independently checkable evidence of a prohibited effect and overrides a favorable semantic judgment. **Required-evidence availability** states whether the selected surface can observe the fact needed by a claim; unavailable evidence is `INSUFFICIENT`, while a required observation that should be available but is missing makes the case `INCONCLUSIVE`. **Blind qualification packet** is the projection visible to an evaluator; expected status and semantic labels remain in the local oracle projection only.

The six RFC regressions are:

1. R1: an observed absolute executable path is not automatically an out-of-workspace write.
2. R2: relevant unknown events cannot be discarded silently, and a fact unavailable from the selected surface cannot satisfy required evidence.
3. R3: `No refactor was justified.` cannot fail merely because it does not contain the incidental phrase `no action`.
4. R4: qualification input cannot reveal expected status directly or indirectly.
5. R5: a Judge cannot turn missing required evidence into `PASS`.
6. R6: a directly observed critical violation resolves to `FAIL` even when semantic judgment is favorable.

## Existing Context

RFC 0001 sections 12, 13, and 73 authorize consulting V1 only to reconstruct these six failure classes and require E3 to run offline before future decision material. The merged E0–E2 Foundation exposes `verifyOffline` through `npm run experiment:verify`; it currently checks pinned dependencies, safety invariants, and zero Promptfoo imports.

The historical branch `origin/feat/skill-evidence-v1` was inspected without copying it. Its records show the concrete defects behind the RFC list: absolute executable paths and `/dev/null` were misclassified as writes; a relevant `todo_list` event made observability incomplete; a literal `no action` check rejected a semantically valid conclusion; calibration labels could reveal expectations; missing evidence could reach a favorable Judge; and favorable judgment could conflict with direct critical evidence. Foundation campaigns also confirmed that evaluator gates must fail closed, but their reports remain immutable and outside E3 fixtures.

Current TypeScript belongs in `experiments/`, tests in `test/`, and evaluation fixtures in `evaluations/refactor-design/`. No `src/` or product schema exists. The baseline has 48 passing tests in 14 files and `experiment:verify` reports zero provider imports.

## Desired End State

`evaluations/refactor-design/archaeological/cases.json` is the canonical fixture set and contains exactly one structured entry for each ID R1–R6. Fixtures record enumerated observations and expected dispositions; prose is explanatory only and never drives evaluation. Loading rejects malformed, duplicate, missing, or unknown regression IDs.

`experiments/archaeological.ts` exposes a development-only `verifyArchaeologicalRegressions(root)` boundary returning `{ passed: 6, total: 6 }` only when every rule holds. The implementation uses explicit observation roles, evidence availability, qualified semantic assessment, and precedence rules; it does not infer a write from a path string, semantic satisfaction from wording, or evidence from fluent prose.

`verifyOffline` always executes the corpus, retains `providerImports: 0`, and adds `archaeologicalRegressions: 6` to `OfflineVerificationResult`. The CLI prints `offline verification passed; archaeological regressions: 6; provider imports: 0`. A corpus failure makes the command nonzero before any provider import or invocation. No public product API, schema, direct dependency, report, freeze, RFC, or ADR changes.

## Milestones

### Milestone 1 — Establish the canonical corpus contract

#### Goal

Create the six-case fixture boundary and reject drift in its identity or shape.

#### Changes

- Add `evaluations/refactor-design/archaeological/cases.json` with exactly R1–R6, structured observations, local oracle expectations, source provenance to RFC 0001, and no copied V1 code or prompt material.
- Add the fixture loader and discriminated development types in `experiments/archaeological.ts`; validate required fields, allowed enumerations, unique IDs, and exact six-case completeness without introducing a product JSON schema.
- Add `test/archaeological-regressions.test.ts` through the exported verifier boundary. First prove RED for the missing boundary, then cover malformed, duplicate, missing, and unknown cases using temporary fixture roots.
- Extend Prettier scripts in `package.json` to include `evaluations/`; update the lockfile only if npm changes package metadata mechanically, with no dependency change.

#### Validation

- Command: `npm test`
- Expected result: corpus-contract tests fail before implementation for the predicted missing or permissive behavior, then the full suite passes.
- Command: `npm run experiment:verify`
- Expected result: the existing public checkpoint remains green and provider imports remain zero after no more than two TDD cycles.

#### Acceptance Criteria

- Exactly R1–R6 load in deterministic order; malformed, duplicate, missing, or extra IDs fail closed.
- Fixture facts are structured and evaluation never derives status from explanatory prose.

### Milestone 2 — Protect path, observability, and semantic-equivalence rules

#### Goal

Reimplement R1–R3 as explicit semantic properties independent of the V1 file and class structure.

#### Changes

- Make R1 distinguish an observed executable role from an observed write-target role before considering workspace boundaries; the absolute executable fixture must not become a write violation.
- Make R2 return `INCONCLUSIVE` for an unrecognized relevant event on an otherwise adopted surface and `INSUFFICIENT` when the surface cannot expose a required fact; neither path may return satisfied evidence.
- Make R3 accept the fixture's qualified semantic assessment plus passing direct effects without exact-string matching; the final message remains observable context, not the oracle.
- Add one behavior-focused test per rule through `verifyArchaeologicalRegressions`, running the complete suite for each RED and GREEN cycle.

#### Validation

- Command: `npm test`
- Expected result: each rule first fails for its predicted legacy disposition and then all tests pass.
- Command: `npm run experiment:verify`
- Expected result: public offline verification passes after no more than two cycles and at milestone completion, with zero provider imports.

#### Acceptance Criteria

- R1 cannot manufacture a write from an executable path.
- R2 distinguishes unrecognized observation from unavailable capability and never promotes either to satisfaction.
- R3 accepts semantic equivalence without depending on the literal phrase `no action`.

### Milestone 3 — Protect evaluator blindness and evidence precedence

#### Goal

Reimplement R4–R6 so evaluator output cannot override the evidence boundary.

#### Changes

- Make R4 project a blind qualification packet containing only a digest ID and observable input; expected status, purpose, oracle label, and label-derived identifiers remain exclusively in the local expectation projection.
- Make R5 stop before semantic evaluation when decision-critical required evidence is missing and resolve the case as `INCONCLUSIVE`; the fixture must prove the Judge callback was not invoked.
- Make R6 resolve a direct critical violation as `FAIL` regardless of a supplied favorable semantic judgment.
- Add one behavior-focused test per rule through the exported verifier; inspect canonical projections rather than helper topology.

#### Validation

- Command: `npm test`
- Expected result: each rule first fails for expectation leakage, an invoked Judge, or favorable precedence respectively, then the full suite passes.
- Command: `npm run experiment:verify`
- Expected result: the public checkpoint remains green after no more than two cycles and at milestone completion.

#### Acceptance Criteria

- The serialized evaluator-visible packet contains no expected status, purpose, oracle label, or semantically revealing ID.
- Missing critical evidence starts no Judge and cannot pass.
- A direct critical violation remains authoritative.

### Milestone 4 — Promote E3 into the offline gate and reconcile documentation

#### Goal

Make the six regressions a mandatory public offline checkpoint, review the green design, reconcile canonical sources, and complete validation.

#### Changes

- Update `experiments/verify.ts`, `experiments/cli.ts`, and `test/offline-verification.test.ts` so offline verification loads the repository corpus, reports exactly six passes, and still proves the injected Promptfoo loader was never called.
- After all behavior, `npm test`, and `npm run experiment:verify` are green, run `$refactor-design`; return to behavior TDD if it discovers missing behavior, otherwise apply only justified behavior-preserving changes.
- Update this plan and `docs/execplans/README.md` with progress and validation. Review `AGENTS.md`, RFC 0001, ADR 0002, and package scripts as canonical sources; update only those whose contract changed and record concrete no-change reasons for the rest.
- Preserve all eight `docs/experiments/*.json` files byte-for-byte and keep `dist/`, `.skill-evidence/`, and `coverage/` untracked.

#### Validation

- Run in order: `npm ci`; `npm audit --json`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run prettier:check`; `npm run build`; `npm run experiment:verify`; `npm run experiment:qualify:codex-otel`; `npm run experiment:qualify:tracing`; `npm run experiment:verify:tracing`; `git diff --check`; `git status --short`.
- Run `sha256sum docs/experiments/*.json` and compare all eight files with the baseline digests recorded in `Validation Strategy`.
- Expected result: audit has zero vulnerabilities; all tests and formatting pass; the public output reports six regressions and zero provider imports; both qualifiers are `EXACT_SUPPORTED`; loopback tracing passes; historical digests match; status contains only intended E3 files.

#### Acceptance Criteria

- E3 is mandatory in the existing provider-free public checkpoint and any regression failure makes it nonzero.
- No Promptfoo or provider import, model session, credential access, campaign, freeze, or decision artifact occurs.
- Documentation and the living plan match the implemented behavior.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Confirm Gate 2 completion, merge PR #1 with commit provenance preserved, and branch from merged `main` at `0e897514`.
- [x] Inspect RFC 0001 R1–R6 and E3 plus the historical V1 records without copying implementation.
- [x] Create this living ExecPlan before implementation.
- [ ] Receive approval to execute this ExecPlan.
- [ ] Milestone 1 started.
- [ ] Milestone 1 completed.
- [ ] Milestone 2 started.
- [ ] Milestone 2 completed.
- [ ] Milestone 3 started.
- [ ] Milestone 3 completed.
- [ ] Milestone 4 started.
- [ ] Milestone 4 completed.

## Decisions

- Decision: implement E3 before any product CLI, Blueprint, Author, compiler, or decision evaluation.
  Rationale: RFC 0001 makes E3 the separate post-G2 gate and requires all necessary historical regressions to pass before future decision material.
  Date/Author: 2026-08-09 / operator authorization and planning agent

- Decision: implement exactly RFC regressions R1–R6 and no additional Foundation incidents in this first corpus.
  Rationale: the six rules are the prespecified initial E3 contract; adding post-result cases without a separate decision would expand the gate adaptively.
  Date/Author: 2026-08-09 / planning agent

- Decision: place TypeScript in `experiments/`, Vitest behavior in `test/`, and structured fixtures in `evaluations/refactor-design/archaeological/`.
  Rationale: E3 remains an experiment, and the repository profile explicitly reserves these locations while prohibiting premature product scaffolding.
  Date/Author: 2026-08-09 / planning agent

- Decision: integrate E3 into `experiment:verify` instead of adding another command.
  Rationale: the existing command is the provider-free public checkpoint; making the corpus mandatory prevents a future operator from validating the Foundation while accidentally omitting E3.
  Date/Author: 2026-08-09 / planning agent

- Decision: represent semantic judgment and evidence availability as explicit structured inputs rather than infer them from prose.
  Rationale: the THEORY forbids a Judge from manufacturing missing evidence and treats exact strings as valid only when textual identity is a real external obligation.
  Date/Author: 2026-08-09 / planning agent

## Risks and Mitigations

- Risk: V1 architecture is copied under the label of regression protection. Mitigation: copy no V1 file; implement only the six RFC properties behind a new minimal experimental boundary.
- Risk: fixtures merely assert hard-coded expected labels. Mitigation: each case contains discriminating structured facts, and tests include counterexamples that would reproduce the historical false disposition.
- Risk: R3 replaces a bad literal check with another prose heuristic. Mitigation: consume a qualified semantic assessment explicitly and keep the message non-authoritative.
- Risk: R4 leaks expectations through IDs or purpose fields. Mitigation: derive the public ID from canonical observable input and test the complete serialized packet for forbidden expectation material.
- Risk: R5 or R6 lets fluent judgment override evidence. Mitigation: do not invoke judgment when critical evidence is missing and apply direct-critical-failure precedence before semantic status.
- Risk: offline verification accidentally imports Promptfoo. Mitigation: preserve and extend the existing injected-loader assertion and run `experiment:verify` at every milestone.
- Risk: historical campaign evidence changes during formatting. Mitigation: keep reports outside formatter write scope and compare all eight SHA-256 digests in final validation.

## Validation Strategy

Each behavior uses `$tdd-behavior-autonomous-quiet`: add one observable test, predict and confirm RED, implement minimum GREEN, run the entire `npm test` suite, and run `npm run experiment:verify` after no more than two cycles and at every milestone boundary. Only after all six behaviors and both gates are green may `$refactor-design` run. A design finding that changes behavior returns to TDD before review resumes.

The public checkpoint is `npm run experiment:verify`. Its success must be observable as `offline verification passed; archaeological regressions: 6; provider imports: 0`; no test-only seam is sufficient. Final validation follows the exact repository sequence listed in Milestone 4 and records concrete outcomes here.

The immutable historical-report baseline is, in filename order: R2 capability `db7f2f847c9acc03f1f91a2cd68afa2d5c23f539c31008dc0b5fcd41c446ff14`; R2 E1 `5a395aec76ce3575a93655f1f1c19cfa96f137d0c4fc1c847edaac8a2aa3999b`; R2 G2 `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`; R2 ownership `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395`; R3 capability `f3add9719f72a420681c7c428718c7cf983f596e4f2d06a3052f1f9fa0585b24`; R3 E1 `332de02dd1780517da45b728f4e4e527e208423b9729f0a5adffc97df46090ad`; R3 G2 `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`; R3 ownership `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395`.

## Documentation Impact

This file is the canonical living implementation plan, and `docs/execplans/README.md` must track its status. `package.json` is the canonical command and formatter surface; its `experiment:verify` behavior changes and `evaluations/` becomes formatted input.

`AGENTS.md` remains accurate because code, tests, fixtures, commands, and workflow stay in their prescribed locations. RFC 0001 remains normative and unchanged because this plan implements its existing R1–R6 and E3 contract. ADR 0002 remains accurate because missing evidence still blocks or yields bounded inconclusiveness, while infrastructure development remains offline and out of band. Historical ExecPlans and experiment reports remain unchanged because E3 protects semantic properties rather than revising prior evidence.

## Rollout and Recovery

There is no deployment or live rollout. Land the corpus, verifier, tests, package formatting coverage, and documentation together so `experiment:verify` never observes a partial gate. Recovery is a normal revert of the E3 commit; never rewrite historical reports or reuse a failed verification as decision evidence. Any expansion beyond R1–R6 requires a separate prespecified update to this living plan or a later ExecPlan before implementation.

## Lessons Learned

- The merged Foundation supplies capability evidence but not regression semantics; E3 is the explicit bridge before Author or decision work.
- The V1 records confirm that correct precedence can amplify a bad detector: direct evidence must remain authoritative, but the detector producing it must itself be qualified by boundary regressions.
- Semantic equivalence and missing evidence are separate problems. A qualified semantic assessment can recognize valid alternative wording, but it still cannot fill an observation the selected surface never exposed.
