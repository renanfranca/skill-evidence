# Qualify E3 Archaeological Regressions through Promptfoo

- Date: 2026-08-09
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Branch: `feat/e3-archaeological-regression-corpus`
- Planning baseline and branch point: `0e8975148041396b634ca7635f8e0ba03ddb728a`
- Status: complete; hosted PR gates pending

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while work advances.

Safety boundary: This task is limited to authorized, defensive offline maintenance of this repository. It uses only deterministic local providers and must not invoke a model, use credentials, configure an external endpoint, create a campaign or freeze, or produce decision evidence.

## Purpose / Big Picture

Implement RFC 0001 stage E3 as a conformance experiment that proves the six prescribed historical regression properties R1–R6 can be preserved while Promptfoo remains the generic runner, assertion engine, scorer, and grader invoker. The observable result is a canonical development report from `npm run experiment:qualify:archaeological` whose six rules pass through the pinned Promptfoo Node API and whose ownership rows show only the thin Skill Evidence control needed for preflight, blind input projection, and explicit domain-status normalization.

This plan replaces the rejected design that would have built a parallel archaeological evaluator. It produces inputs and policies that Promptfoo executes; Skill Evidence never reinterprets output prose, paths, or evidence after Promptfoo has graded them.

## Scope

In scope: structured development fixtures for RFC regressions R1–R6; deterministic local Promptfoo providers; serializable Promptfoo test definitions; versioned custom assertions or scoring functions only where built-ins are insufficient; capability preflight for known missing evidence; blind qualification-input projection; explicit normalization of structured Promptfoo metadata to RFC/ADR statuses; a canonical development qualifier; behavior-focused Vitest coverage; a new local integration checkpoint; and documentation reconciliation.

Out of scope: copying V1 runner, checks, events, Judge, process, or workspace architecture; creating `src/`, product schemas, a product CLI, a Blueprint, an Author, the E6 compiler, a generic assertion framework, a generic grader, a generic result aggregator, model calls, credentials, external network endpoints, live tracing, campaigns, freezes, decision cases, statistical claims, or changes to historical reports.

## Definitions

**Promptfoo conformance case** is a development-only known-valid or known-invalid fixture executed by Promptfoo to prove a required semantic property. **Thin control plane** is the smallest Skill Evidence responsibility Promptfoo cannot own: capability eligibility before execution, expectation-blind packet construction, and translation of enumerated assertion metadata into RFC/ADR states. **Domain-status normalization** reads only fixed metadata such as `skillEvidenceDisposition: 'INCONCLUSIVE'`; it must not parse prose, inspect paths, rerun assertions, or recompute scores. **Semantic grader** in E3 is a deterministic local provider used through Promptfoo's grader interface; it makes no model or network call.

The six RFC regressions are:

1. R1: an observed absolute executable path is not automatically an out-of-workspace write.
2. R2: relevant unknown events cannot be discarded silently, and an unavailable required observation cannot be treated as satisfied evidence.
3. R3: `No refactor was justified.` cannot fail merely because it omits the incidental phrase `no action`.
4. R4: qualification input cannot reveal expected status directly or indirectly.
5. R5: missing required evidence cannot be converted into `PASS` by a Judge.
6. R6: a directly observed critical violation remains `FAIL` despite favorable semantic judgment.

## Existing Context

RFC 0001 assigns generic evaluation, assertions, grader invocation, datasets, cache, concurrency, and provider lifecycle to Promptfoo. Its normative flow is `Evaluation Blueprint → deterministic compiler → serializable Promptfoo configuration → promptfoo.evaluate() → raw Promptfoo result → Skill Evidence normalization`. It reserves analysis and aggregation policy for Skill Evidence and explicitly authorizes E3 to reimplement properties R1–R6, not V1 architecture.

ADR 0002 requires capability preflight before Executor or Judge calls. Known absence of every eligible evidence path blocks a decision-critical run; missing observation discovered after an eligible preflight becomes `INCONCLUSIVE`; direct critical evidence becomes `FAIL`; loss of an advertised capability invalidates the run. These states are not interchangeable with Promptfoo's generic boolean assertion result, so the thin control plane may project explicit metadata without reevaluating the assertion.

The merged E0–E2 Foundation pins Promptfoo `0.122.0`, exposes `promptfoo.evaluate()` through existing deterministic local qualification, and provides temporary cache/database/log isolation in `experiments/isolation.ts`. `npm run experiment:verify` is the public provider-free checkpoint and must continue importing neither Promptfoo nor any provider. Promptfoo-backed development qualifications therefore remain separate commands.

The historical V1 branch was consulted only for provenance. Its incidents match R1–R6: path-role confusion, silent unknown events, literal semantic checks, expectation leakage, missing evidence reaching a favorable Judge, and favorable judgment overriding direct failure. No V1 implementation file is copied.

## Desired End State

`evaluations/refactor-design/archaeological/` contains a canonical structured fixture manifest and versioned JavaScript assertion, scoring, and deterministic provider files. It contains exactly R1–R6, with at least one known-valid and one discriminating known-invalid or boundary observation for each rule. Fixture prose is descriptive and never drives a result.

`experiments/qualify-archaeological.ts` owns the stable development-report contract and orchestration seam. `experiments/qualify-archaeological-worker.ts` imports Promptfoo only inside `withPromptfooIsolation`, runs the eligible serializable cases with deterministic local execution and grading providers, and returns sanitized facts. The parent never exposes temporary paths, raw prompts, expected labels, process IDs, or evaluator payloads.

The canonical schema-1 report contains `purpose: 'DEVELOPMENT'`, Promptfoo `0.122.0`, exactly six ordered rule rows, ownership for each rule, provider and grader call counts, `result: 'SUPPORTED_WITH_THIN_CONTROL_PLANE' | 'INSUFFICIENT' | 'BLOCKED'`, explicit limitations, and proof that known missing-evidence variants started neither execution nor grading. The favorable result requires every known-valid and known-invalid contrast to produce its prespecified disposition and every report fact to be internally consistent.

`npm run experiment:qualify:archaeological` builds and emits the canonical report. `npm run experiment:verify` remains byte-compatible in behavior and continues reporting zero provider imports. No public product API, product schema, direct dependency, freeze, campaign, RFC, ADR, or historical report changes.

## Milestones

### Milestone 1 — Qualify Promptfoo-owned assertion semantics

#### Goal

Prove R1, R3, and R6 through Promptfoo assertions and scoring rather than a parallel Skill Evidence evaluator.

#### Changes

- Add the canonical R1, R3, and R6 fixtures plus discriminating contrasts under `evaluations/refactor-design/archaeological/`.
- Add versioned assertion/scoring modules for structured path-role evidence, deterministic semantic grading, and critical-direct-evidence precedence. Promptfoo must execute every assertion and the R6 scoring function.
- Add the stable qualifier report seam and worker launcher in `experiments/qualify-archaeological.ts`; add worker execution in `experiments/qualify-archaeological-worker.ts` using `withPromptfooIsolation` and pinned `promptfoo.evaluate()`.
- Add behavior tests to the existing qualification behavior home `test/tracing-gate.test.ts`; do not mirror production files with a new test file.

#### Validation

- Command: `npm test`
- Expected result: each behavior first fails for the predicted missing public qualification or wrong Promptfoo disposition, then the full suite passes.
- Command: `npm run experiment:verify`
- Expected result: provider imports remain zero after no more than two TDD cycles and at milestone completion.

#### Acceptance Criteria

- R1 accepts an absolute executable observation and rejects an external write-target contrast.
- R3 accepts the RFC's canonical conclusion and a genuinely different valid paraphrase, then rejects an incompatible conclusion through a bounded deterministic local grader invoked by Promptfoo.
- R6 has a favorable semantic component and a failing direct-critical component; Promptfoo's versioned scoring function makes the case fail and exposes both component results.

### Milestone 2 — Qualify the Skill Evidence control boundary

#### Goal

Protect R2, R4, and R5 without taking generic execution or grading away from Promptfoo.

#### Changes

- Add R2 fixtures for a known unavailable required capability and for a relevant unknown event returned after eligible execution. The first is excluded before Promptfoo; the second uses explicit assertion metadata and normalizes to `INCONCLUSIVE` without prose inference.
- Add R4 blind qualification fixtures. Send the grader only an opaque digest ID, observable packet, and allowed rubric/oracle; retain expected status and purpose only in the local comparison record. Inspect the captured evaluator-visible payload mechanically for forbidden fields and label-derived IDs.
- Add R5 fixtures for known missing evidence and late missing evidence. Both start zero grader calls; the first is `BLOCKED`, the second `INCONCLUSIVE`, and neither can become Promptfoo `PASS`.
- Add behavior tests through the stable qualifier seam and keep the complete suite plus public provider-free checkpoint green.

#### Validation

- Command: `npm test`
- Expected result: each rule first fails for an unintended provider/grader call, expectation leakage, or favorable missing-evidence result, then the full suite passes.
- Command: `npm run experiment:verify`
- Expected result: offline verification remains provider-free after no more than two cycles and at milestone completion.

#### Acceptance Criteria

- Known unavailable critical evidence is blocked before execution; late relevant unknown observation is `INCONCLUSIVE`.
- The evaluator-visible R4 packet contains no expected status, purpose, semantic label, or label-derived ID.
- R5 variants invoke no grader and cannot pass.
- Normalization reads only enumerated structured metadata and never reevaluates evidence.

### Milestone 3 — Publish the bounded development qualifier

#### Goal

Expose the complete six-rule conformance matrix as a safe local integration checkpoint.

#### Changes

- Add `experiment:qualify:archaeological` to `package.json` and include `evaluations/` in Prettier check/format scripts without changing dependencies.
- Complete report classification, consistency checks, sanitization, canonical rendering, fixed limitations, and fail-closed handling of worker or fixture defects.
- Run the real local qualifier and record its exact Promptfoo version, six rule results, ownership, call counts, and bounded conclusion in this plan.
- Keep `experiment:verify` unchanged except for tests proving the new command did not contaminate its zero-import boundary.

#### Validation

- Command: `npm test`
- Expected result: all behavior tests pass.
- Command: `npm run experiment:verify`
- Expected result: `offline verification passed; provider imports: 0`.
- Command: `npm run experiment:qualify:archaeological`
- Expected result: canonical schema-1 `SUPPORTED_WITH_THIN_CONTROL_PLANE` for Promptfoo `0.122.0`, six passing rule rows, no external provider call, and explicit limitations.

#### Acceptance Criteria

- The qualifier is deterministic, local, sanitized, canonical, and nonzero on any failed contrast or consistency check.
- Promptfoo owns execution/assertion/scoring facts; Skill Evidence owns only the rows explicitly assigned to its control plane.
- No raw payload, temporary path, credential, expected label, process ID, or model-derived content appears in stdout.

### Milestone 4 — Review, reconcile, and validate

#### Goal

Consolidate the green design, reconcile canonical documentation, preserve historical evidence, and finish the complete repository validation.

#### Changes

- Enter `$refactor-design` only after all behavior, `npm test`, `npm run experiment:verify`, and the archaeological qualifier are green. Return to behavior TDD if the review discovers missing behavior.
- Update this plan and `docs/execplans/README.md` with progress, design findings, validation, and final status.
- Review `AGENTS.md`, RFC 0001, ADR 0002, package scripts, and earlier ExecPlans as canonical sources. Update only changed public operations; record concrete no-change reasons for the rest.
- Preserve all eight `docs/experiments/*.json` files byte-for-byte and keep `dist/`, `.skill-evidence/`, and `coverage/` untracked.

#### Validation

- Run in order: `npm ci`; `npm audit --json`; `npm run typecheck`; `npm run lint`; `npm test`; `npm run prettier:check`; `npm run build`; `npm run experiment:verify`; `npm run experiment:qualify:archaeological`; `npm run experiment:qualify:codex-otel`; `npm run experiment:qualify:tracing`; `npm run experiment:verify:tracing`; `git diff --check`; `git status --short`.
- Run `sha256sum docs/experiments/*.json` and compare all eight files with the baseline digests recorded in `Validation Strategy`.
- Expected result: audit has zero vulnerabilities; all tests and formatting pass; the provider-free checkpoint reports zero imports; all three qualifiers return their favorable bounded result; loopback tracing passes; historical digests match; status contains only intended E3 files.

#### Acceptance Criteria

- Every milestone behavior and final command is green.
- Documentation and this living plan match the implemented responsibility boundary.
- No model session, external provider, credential access, campaign, freeze, or decision artifact occurs.

### Milestone 5 — Remediate formal-review findings

#### Goal

Remove an incidental literal dependency from R3 and make the Promptfoo configurations demonstrably serializable at the evaluation boundary.

#### Changes

- Add a second, genuinely different valid R3 conclusion while retaining the RFC's canonical conclusion and the incompatible contrast.
- Move deterministic execution and grader providers to versioned `file://` modules under `evaluations/refactor-design/archaeological/providers/`.
- Canonically serialize and reconstruct every Promptfoo configuration before evaluation; reject unsupported values instead of silently dropping them.
- Derive execution and grader call counts from Promptfoo result rows under the one-provider/one-assertion corpus invariant, and make the R4 grader reject forbidden evaluator-visible content itself.
- Reconcile this plan and its index without changing RFC 0001, ADR 0002, report schema, dependencies, or historical reports.

#### Validation

- Command: `npm test`
- Expected result: R3 reports `PASS`, `PASS`, `FAIL`; non-serializable configuration is rejected; the complete suite passes.
- Commands: `npm run typecheck`; `npm run lint`; `npm run prettier:check`; `npm run build`; `npm run experiment:verify`; `npm run experiment:qualify:archaeological`; `git diff --check`.
- Expected result: every command passes, the provider-free checkpoint remains at zero imports, and the qualifier reports 11 execution calls and 4 grader calls.

#### Acceptance Criteria

- No Promptfoo configuration passed by this corpus contains a function or another non-JSON value.
- The R3 oracle evaluates only the delimited output and demonstrates bounded acceptance of two prespecified equivalent conclusions.
- The R4 provider mechanically rejects leaked expected labels in its actual grader prompt.
- CI and a repeated formal review are green before merge.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full before the initial plan and again before this revision.
- [x] Confirm Gate 2 completion, merge PR #1 with commit provenance preserved, and branch from merged `main` at `0e897514`.
- [x] Inspect RFC 0001 R1–R6, Promptfoo ownership, compiler flow, and ADR 0002 preflight/status semantics.
- [x] Reject the parallel-evaluator design and receive explicit approval for a Promptfoo conformance corpus limited to R1–R6.
- [x] Revise this living ExecPlan before implementation.
- [x] Milestone 1 started.
- [x] Milestone 1 completed: R1, R3, and R6 pass their discriminating Promptfoo assertions, local grader, and scoring cases; 51 tests and the provider-free checkpoint are green.
- [x] Milestone 2 started.
- [x] Milestone 2 completed: R2, R4, and R5 preserve preflight, blind projection, and structured normalization boundaries; 54 tests and the provider-free checkpoint are green.
- [x] Milestone 3 started.
- [x] Milestone 3 completed: the public command emitted canonical schema-1 `SUPPORTED_WITH_THIN_CONTROL_PLANE` for Promptfoo `0.122.0`, six ordered rule rows, 10 execution calls, 3 grader calls, and fixed limitations; 60 tests and the offline checkpoint are green.
- [x] Milestone 4 started.
- [x] Complete the post-GREEN design review: return three fail-closed gaps to behavior TDD, consolidate the shared R2/R5 preflight-normalization transformation, and replace mutable completion sentinels with the isolation callback's explicit result.
- [x] Milestone 4 completed: all repository checks, the new archaeological qualifier, both prior local qualifiers, loopback tracing verification, and all eight historical-report digests passed on 2026-08-09.
- [x] Milestone 5 started after formal review identified literal R3 calibration and function-bearing Promptfoo configurations.
- [x] Implement R3 calibration as two valid formulations plus one invalid contrast, with the provider reading only Promptfoo's user `<Output>` segment.
- [x] Replace all function-bearing configuration values with versioned `file://` providers and strict canonical JSON round-trips.
- [x] Complete post-GREEN design review with no additional material refactor: providers retain immutable constructor configuration, invocation data stays local, and the serialization boundary is exercised by runtime and tests.
- [x] Milestone 5 completed: clean install, audit, 62 tests, static checks, all local checkpoints, historical digests, and worktree checks passed; hosted CI and repeated formal review remain merge gates.

## Decisions

- Decision: use Promptfoo as the only generic runner, assertion engine, scorer, and grader invoker.
  Rationale: RFC 0001 explicitly delegates those responsibilities and requires custom infrastructure to be justified by demonstrated insufficiency.
  Date/Author: 2026-08-09 / operator and planning agent

- Decision: implement E3 as a Promptfoo conformance experiment before the E6 product compiler.
  Rationale: hand-authored serializable configurations can qualify R1–R6 now without pulling compiler behavior forward in the roadmap.
  Date/Author: 2026-08-09 / operator and planning agent

- Decision: retain a thin Skill Evidence control plane for capability preflight, blind packet projection, and explicit domain-status normalization.
  Rationale: ADR 0002 requires `BLOCKED`, `INCONCLUSIVE`, and `INVALIDATED` semantics that Promptfoo's generic boolean result does not express by itself; the projection must remain mechanical and structured.
  Date/Author: 2026-08-09 / operator and planning agent

- Decision: implement exactly RFC regressions R1–R6, using later incidents only as provenance rather than new rule IDs.
  Rationale: this is the prespecified initial E3 contract and avoids adaptive expansion.
  Date/Author: 2026-08-09 / operator

- Decision: keep `experiment:verify` provider-free and introduce a separate Promptfoo-backed qualifier.
  Rationale: the repository profile makes zero Promptfoo imports a public safety contract, while local integration qualification necessarily imports the pinned package.
  Date/Author: 2026-08-09 / planning agent

- Decision: classify structurally invalid or internally contradictory worker evidence as `BLOCKED`, and classify well-formed disposition mismatches as `INSUFFICIENT`.
  Rationale: a transport or corpus-integrity defect cannot support a conclusion, while an honestly observed failed contrast is valid evidence that Promptfoo conformance remains insufficient.
  Date/Author: 2026-08-09 / implementation agent

- Decision: preserve the completed E3 plan as the living record and add a remediation milestone instead of creating a second plan for the same feature.
  Rationale: the review findings correct claims and implementation boundaries established by this plan, while historical experiment reports remain untouched.
  Date/Author: 2026-08-09 / operator and implementation agent

- Decision: use versioned local `file://` providers and canonical JSON round-trips at the Promptfoo boundary.
  Rationale: Promptfoo 0.122.0 natively loads JavaScript provider modules by file reference, so configuration remains data while Promptfoo retains provider lifecycle ownership.
  Date/Author: 2026-08-09 / implementation agent

- Decision: derive corpus call counts from Promptfoo result rows after removing mutable closure counters.
  Rationale: each eligible case has exactly one execution provider and R3/R4 each have exactly one `llm-rubric`; disabled cache and concurrency one make the fixed corpus invariant explicit without hidden process state.
  Date/Author: 2026-08-09 / implementation agent

## Risks and Mitigations

- Risk: the qualifier becomes a second evaluator. Mitigation: Promptfoo executes all eligible assertions and scoring; Skill Evidence normalization reads only fixed disposition metadata and cannot inspect raw semantics.
- Risk: E3 accidentally implements the E6 compiler. Mitigation: use hand-authored serializable development configurations and expose no general Blueprint-to-Promptfoo API.
- Risk: a custom assertion hides generic framework duplication. Mitigation: add one versioned file only where built-ins cannot preserve the RFC property, and record ownership explicitly in the report.
- Risk: R3 replaces literal matching with a hard-coded favorable answer. Mitigation: run known-valid and known-invalid semantic contrasts through the same deterministic local grader interface.
- Risk: a rubric phrase accidentally satisfies the R3 grader. Mitigation: extract and normalize only the Promptfoo `<Output>` segment, use a rubric without fixture literals, and calibrate two valid outputs plus one invalid output.
- Risk: R4 leaks expectations through IDs or prompts. Mitigation: derive opaque IDs from canonical observable inputs and inspect the complete evaluator-visible packet mechanically.
- Risk: R2 or R5 starts a call despite known missing evidence. Mitigation: count execution and grader calls and require zero before a favorable qualification.
- Risk: domain normalization silently reevaluates assertions. Mitigation: accept only enumerated assertion metadata and test that changing prose without metadata cannot change the projected status.
- Risk: the local qualifier writes persistent Promptfoo state. Mitigation: run inside `withPromptfooIsolation`, disable cache, telemetry, updates, sharing, and latest-result persistence, then remove temporary storage.
- Risk: historical campaign evidence changes during formatting. Mitigation: keep reports outside formatter write scope and compare all eight SHA-256 digests in final validation.
- Risk: JSON serialization silently drops a function. Mitigation: use the repository's strict canonical serializer, then parse its output before every `promptfoo.evaluate()` call.

## Validation Strategy

Each behavior uses `$tdd-behavior-autonomous-quiet`: add one observable test through the stable qualifier/report seam, predict and confirm RED, implement minimum GREEN, run the entire `npm test` suite, and run `npm run experiment:verify` after no more than two cycles and at every milestone boundary. The Promptfoo-backed qualifier becomes an additional public integration checkpoint as soon as its first vertical slice exists. Only after R1–R6, the full suite, both public checkpoints, and all milestone criteria are green may `$refactor-design` run.

The immutable historical-report baseline is, in filename order: R2 capability `db7f2f847c9acc03f1f91a2cd68afa2d5c23f539c31008dc0b5fcd41c446ff14`; R2 E1 `5a395aec76ce3575a93655f1f1c19cfa96f137d0c4fc1c847edaac8a2aa3999b`; R2 G2 `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`; R2 ownership `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395`; R3 capability `f3add9719f72a420681c7c428718c7cf983f596e4f2d06a3052f1f9fa0585b24`; R3 E1 `332de02dd1780517da45b728f4e4e527e208423b9729f0a5adffc97df46090ad`; R3 G2 `c0f2ac8eb15d9b844f9eef530982e1a357888a63fb0f9743f26a2aa1114dfc4b`; R3 ownership `75fa290ab044082ddcccfd519d0ed3c7594c186b66c5b26a7c6cf1db9fa90395`.

## Documentation Impact

This file is the canonical living implementation record, and `docs/execplans/README.md` tracks its status. `package.json` is the canonical command surface and gains the archaeological qualifier plus formatting coverage for `evaluations/`.

`AGENTS.md` gains the separate archaeological qualification command because code, tests, fixtures, commands, safety boundaries, and workflow stay in their prescribed locations. RFC 0001 remains normative and unchanged because the design delegates generic execution and assertions to Promptfoo while implementing only its named R1–R6 properties. ADR 0002 remains accurate because preflight and domain statuses retain their prescribed behavior. Earlier ExecPlans and all experiment reports remain historical evidence and are never regenerated or formatted.

## Rollout and Recovery

There is no deployment or live rollout. Land fixtures, versioned assertion/scoring files, qualifier, tests, package command, and documentation together. Recovery is a normal revert of the E3 implementation; never rewrite historical reports or use a failed development qualification as decision evidence. Any expansion beyond R1–R6 or promotion into product Blueprint/compiler code requires a later authorized ExecPlan.

## Lessons Learned

- The original E3 design incorrectly treated regression protection as authorization to build another evaluator. The RFC instead makes Promptfoo the default owner of execution, assertions, and graders.
- Promptfoo's `GradingResult` exposes boolean pass/fail plus component results and arbitrary structured metadata. This is enough for Promptfoo to own scoring while Skill Evidence preserves bounded RFC/ADR dispositions mechanically.
- E3 can qualify hand-authored serializable configurations without implementing the E6 compiler early.
- The first public checkpoint after R1 and R3 found that Vitest transpilation accepted fixture variables typed as `unknown` while the strict Promptfoo Node API requires `VarValue`. The fixture contract now uses Promptfoo's erased type-only import, preserving the offline runtime boundary while making `npm run build` authoritative for integration typing.
- The Milestone 2 checkpoint found that an R4 fixture lookup could leave `observable` undefined at the Promptfoo API boundary. The projection now rejects that malformed input before execution instead of relying on a fixture assumption.
- The post-GREEN review found three consistency gaps that required renewed behavior TDD: malformed IPC evidence could throw, favorable rows could contradict fixed provider-call counts, and absent disposition metadata could fall back to Promptfoo's generic boolean. All now fail closed.
- R2 and R5 share one preflight-plus-structured-normalization transformation, while their Promptfoo assertion modules remain distinct domain policies. Returning the complete isolation result directly also removes an empty array that previously doubled as hidden completion state.
- Formal review found that R3's only passing fixture repeated the exact literal recognized by its grader and that the in-memory providers made the claimed Promptfoo configurations non-serializable. Milestone 5 reopens the implementation to correct both findings before merge.
- Promptfoo 0.122.0 presents an `llm-rubric` prompt as serialized chat messages whose system message contains examples. A deterministic grader must select the final user message before extracting `<Output>` or it can accidentally grade a framework example.

## Outcomes

E3 now has a deterministic, local Promptfoo conformance corpus for RFC regressions R1–R6. Promptfoo remains the sole generic execution, assertion, scoring, and grader engine. Skill Evidence contributes only capability preflight, expectation-blind input projection, and strict structured disposition normalization. After formal-review remediation, the canonical result is `SUPPORTED_WITH_THIN_CONTROL_PLANE` for Promptfoo `0.122.0`, with 11 execution-provider calls and 4 grader calls. R3 produces `PASS`, `PASS`, `FAIL`, and every Promptfoo configuration crosses a strict canonical JSON boundary before evaluation.

The original final validation passed with npm audit reporting zero vulnerabilities; strict typecheck and lint; 60 Vitest tests; Prettier; build; provider-free offline verification; archaeological qualification; Codex OTEL `EXACT_SUPPORTED`; Promptfoo tracing `EXACT_SUPPORTED`; loopback tracing verification; `git diff --check`; and exact preservation of all eight historical report SHA-256 digests.

Milestone 5 repeated a clean install and audit with zero vulnerabilities; typecheck; lint; 62 Vitest tests; Prettier; build; provider-free offline verification; archaeological `SUPPORTED_WITH_THIN_CONTROL_PLANE`; Codex OTEL `EXACT_SUPPORTED`; isolated Promptfoo tracing `EXACT_SUPPORTED`; loopback tracing verification; `git diff --check`; and all eight historical digests. One tracing attempt overlapped a second validation process and returned `BLOCKED`; immediate isolated repetition returned the prescribed `EXACT_SUPPORTED`, identifying local process interference rather than a product regression. No model session, external provider, campaign, freeze, decision artifact, RFC change, ADR change, or historical report rewrite occurred.
