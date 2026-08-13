# Contrast Terra/xhigh on the frozen E19 packet

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-13
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Baseline: `main` at merge commit `cc7203d`
- Branch: `feat/e20-terra-xhigh-controlled-contrast`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`
- Predecessor: completed ExecPlan 19 and consumed campaign `e19-luna-max-locale-catalog-20260813-r1`

Safety boundary: this work is authorized defensive development in this repository. Offline preparation, tests, commits, push, CI, and preflight do not authorize a provider invocation. The model-backed call requires later authorization naming the exact E20 campaign, campaign fingerprint, commit, 1,800-second timeout, and budget `1`. E5, E18, and E19 must never be repeated.

## Purpose / Big Picture

Determine whether Terra/xhigh handles the exact protocol-v2 Author instrument that Luna/max completed but failed mechanically in E19. E20 holds the skill snapshot, model-facing packet, protocol, schema, instructions, oracle, and time limits fixed while changing only the requested model condition and campaign identity.

This is a controlled development diagnosis, not model qualification. It can show that Terra passes or fails the current instrument and can support a shared-instrument-failure hypothesis if Terra reproduces Luna's exact evidence-taxonomy error. It cannot prove a general intelligence limit, model superiority, or automatic Author reliability.

## Scope

Included: merge and historical closure of PR #7; one new E20 campaign and reservation; the unchanged E18/E19 locale-catalog skill and E19 oracle; Terra/xhigh with a 1,800-second Promptfoo timeout; deterministic campaign, review, resolution, and reporting support; one separately authorized call without retry; sanitized reporting and CI.

Excluded: any E5/E18/E19 rerun; clarification or modification of the `DIRECT`, `SEMANTIC`, or `JUDGMENT` taxonomy before collection; Luna rerun; Sol or another model; more than one Terra call; automatic Author qualification; general model-ranking claims; raw reasoning, invalid raw responses, credentials, or local artifacts in Git.

## Definitions

- **Frozen packet contrast:** E19 and E20 share identical skill bytes, snapshot, protocol, schema, instructions, packet, oracle, and timeout configuration. Only condition and campaign identities differ.
- **Current instrument:** the unmodified protocol-v2 Author packet and deterministic Blueprint validator used by E19.
- **Shared evidence-taxonomy failure:** Terra reproduces `MANDATORY_DIRECT_EVIDENCE_MISSING` for `contract_no_entries` because its required evidence is classified as `SEMANTIC`, matching E19's observed candidate.
- **TERRA_PASSES_CURRENT_INSTRUMENT:** Terra completes with a canonical `BLOCKED` Blueprint and every critical semantic review item is accepted.
- **TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT:** Terra times out, returns invalid output, produces an inappropriate lifecycle, or has another critical mechanical or resolved semantic failure.
- **INSUFFICIENT:** authentication, model access, rate limit, process, infrastructure, workspace, or persistence failure prevents the planned measurement.

## Existing Context

E19 used Luna/max on the locale-entry-catalog snapshot under protocol v2. The single invocation completed in 569,958 milliseconds and produced a schema-valid candidate with a genuine decision-context blocker. The model associated `contract_no_entries` with required `SEMANTIC` evidence, while the validator requires `DIRECT` evidence for every contract linked to a mandatory claim. That generated `MANDATORY_DIRECT_EVIDENCE_MISSING` at `/contracts/4/evidenceRequired`, derived lifecycle `DRAFT`, and terminal `NOT_VIABLE_FOR_AUTHOR`.

The schema exposes `DIRECT`, `SEMANTIC`, and `JUDGMENT` as enum values, and THEORY explains those evidence classes, but the Author instructions do not explicitly define their operational distinction. Consequently, E19 alone cannot distinguish model error from instrument sub-specification. A same-packet Terra contrast is informative only if reporting preserves that attribution limit.

The current operability and review services in `src/qualification/` recognize exact E18/E19 campaign IDs and contain Luna- or E19-specific condition and workflow guards. The Author core already supports explicit Terra/xhigh under protocol v2 and uses schema-2 for both explicit conditions.

## Desired End State

The repository can prepare, preflight, reserve, collect, optionally review, and report campaign `e20-terra-xhigh-locale-catalog-20260813-r1` while leaving all historical E18/E19 behavior and artifacts unchanged. Offline qualification traverses E18, E19, and E20 through nine deterministic local Codex processes with zero external calls.

Before the live call, hosted CI and a literal-SHA preflight prove exact packet identity and absence of E20 artifacts. After exact authorization, at most one Terra/xhigh call reaches a terminal state and can never be repeated. The report uses only the four prespecified diagnostic conclusions and never qualifies Terra.

## Milestones

### Milestone 1 — Freeze E20 and preserve the packet contrast

Add `evaluations/refactor-design/e5-author-operability/terra-xhigh-controlled-r1/campaign-preparation.json` referencing the unchanged locale skill and E19 oracle. Generalize the exact campaign profile to accept Terra/xhigh without broadening arbitrary model/reasoning combinations. Prove packet, snapshot, schema, instruction, protocol, oracle, and timeouts equal E19 while condition and campaign fingerprints differ.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts
npm run typecheck
npm run experiment:verify
```

Acceptance: E18/E19 remain valid and byte-unchanged; E20 alone is accepted as the frozen Terra profile; no provider call or real reservation occurs.

### Milestone 2 — Derive diagnostic conclusions and generalize review

Replace Luna/E19 hard-coding in collection and review orchestration with the exact campaign profile's condition and diagnostic policy. Preserve E19 viability semantics. Add E20 classification for pass, exact shared taxonomy failure, other instrument failure, and insufficient external evidence. Reuse E19's condition-blind oracle and disagreement-only semantic review only for canonical `BLOCKED` Blueprints.

Validation:

```text
npx vitest run test/evaluation-author.test.ts test/evaluation-author-operability.test.ts
npm run typecheck
npm run lint
npm run experiment:qualify:author-operability
```

Acceptance: conclusions are derived mechanically; a shared taxonomy classification requires the exact contract/evidence mismatch rather than any generic DRAFT; reviewer packets contain no model, condition, timing, E19 result, or expected conclusion.

### Milestone 3 — Qualify offline, review design, and freeze

Extend the deterministic qualifier to three exact campaigns and nine local Promptfoo/Codex SDK processes, including E20 completion, timeout, process failure, and the review workflow. Run post-GREEN `refactor-design`, complete validation, update canonical documentation, create small commits, push a new PR, and require hosted CI green. Run preflight against the final literal SHA with `/home/renanfranca/.codex`, then stop for authorization.

Validation:

```text
npm audit --json
npx vitest run test/evaluation-author.test.ts test/evaluation-author-operability.test.ts
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
npm run experiment:qualify:archaeological
npm run experiment:qualify:author
npm run experiment:qualify:author-provider
npm run experiment:qualify:author-lifecycle
npm run experiment:qualify:author-operability
git diff --check
```

Acceptance: every offline and hosted gate is green, E20 reservation/output/report are absent, and the handoff names the exact campaign, campaign fingerprint, SHA, timeout, and budget.

### Milestone 4 — Execute once and review only if eligible

Only after exact authorization, atomically reserve E20 and invoke Terra/xhigh once with zero retry. If the result is a canonical `BLOCKED` Blueprint, create independent reviewer packets and use a resolver only for disagreements. Otherwise derive the terminal conclusion mechanically without reviewer exposure. Persist one sanitized report.

Acceptance: one reservation, at most one invocation, zero retry, append-only artifacts, and one of the four prespecified conclusions.

### Milestone 5 — Close without another call

Archive only sanitized evidence, update this plan, its index, AGENTS.md, and the PR, and run deterministic validation without invoking E20. Merge of the E20 PR remains a separate user decision.

## Progress

- [x] Consult THEORY commit `572e963` in full.
- [x] Merge PR #7 and create `feat/e20-terra-xhigh-controlled-contrast` from `main` at `cc7203d`.
- [x] Prespecify E20 as diagnostic-only with one Terra/xhigh call and the unchanged E19 instrument.
- [x] Complete Milestone 1: freeze the exact E20 Terra/xhigh profile and prove model-facing packet identity with E19.
- [x] Complete Milestone 2: derive the diagnostic matrix, exact shared-taxonomy finding, and generalized blinded review/scoring.
- [x] Complete the offline implementation and validation portion of Milestone 3: audit zero, 163 tests, nine-process local qualification, build, lint, formatting, and provider-free checkpoints green.
- [x] Publish draft PR #8 and observe hosted CI green on implementation commit `00769d1337142f13c71712a94c152bdda45be828`.
- [ ] Complete Milestone 3 and exact preflight.
- [ ] Receive exact one-call authorization.
- [ ] Complete Milestone 4 once.
- [ ] Complete Milestone 5.

## Decisions

- Decision: merge E19 before starting E20 and use a new PR.
  Rationale: E19 is terminal historical evidence; separating E20 preserves provenance and prevents a later Terra result from rewriting Luna's campaign narrative.
  Date/Author: 2026-08-13 / user.

- Decision: keep E20 diagnostic-only even if Terra passes.
  Rationale: one adapted scenario can compare behavior under a frozen instrument but cannot establish reliability, qualification, or general model superiority.
  Date/Author: 2026-08-13 / user.

- Decision: do not clarify the evidence taxonomy before Terra collection.
  Rationale: changing instructions would remove the controlled contrast needed to diagnose whether Terra handles the same under-specified packet differently.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: reuse the E19 oracle and 1,800-second ceiling byte-for-byte.
  Rationale: oracle or timing changes would introduce additional explanatory variables unrelated to the requested model-condition contrast.
  Date/Author: 2026-08-13 / planning agent.

- Decision: require the exact `contract_no_entries` plus required `SEMANTIC` evidence linkage before emitting `SHARED_INSTRUMENT_FAILURE_SUPPORTED`.
  Rationale: a generic DRAFT or another missing-direct-evidence diagnostic would not reproduce Luna's observed mechanism and must remain `TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT` with unresolved attribution.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: centralize each frozen campaign's condition, timing, oracle, and diagnostic policy in one exact profile.
  Rationale: repeated campaign-ID branches made E18/E19/E20 behavior depend on synchronized literals across collection and review; one typed profile preserves the same observable contracts while preventing policy drift.
  Date/Author: 2026-08-13 / implementation agent after post-GREEN design review.

## Risks and Mitigations

- Risk: Terra success is described as proof of Luna's intelligence ceiling. Mitigation: allow only `TERRA_PASSES_CURRENT_INSTRUMENT` and explicitly retain instrument sub-specification as an alternative explanation.
- Risk: any Terra DRAFT is mislabeled as the same Luna failure. Mitigation: shared-failure classification requires the exact mandatory contract, missing-direct-evidence diagnostic, and `SEMANTIC` evidence linkage observed in E19.
- Risk: changing the runner changes E19 history. Mitigation: retain exact campaign profiles and regression assertions for every historical outcome.
- Risk: reviewers infer model identity or desired comparison. Mitigation: reuse condition-blind packets and exclude model, reasoning, elapsed time, campaign labels, prior result, and overall expected conclusion.
- Risk: a provider failure becomes evidence about Terra quality. Mitigation: classify authentication, access, rate, process, infrastructure, and persistence failures as `INSUFFICIENT`.
- Risk: a favorable single result promotes Terra. Mitigation: preserve `NOT_QUALIFIED`, `decisionEligible: false`, and diagnostic-only reporting.

## Validation Strategy

Use behavior-focused RED/GREEN cycles through the campaign service and CLI, with the provider-free checkpoint at least every two cycles. Qualify long timeouts through deterministic local processes without wall-clock waits. After complete behavior and public checkpoint GREEN, perform the structural design review and full ordered validation. The live call occurs only after hosted CI, exact preflight, and separate authorization; final validation never repeats it.

## Documentation Impact

- This ExecPlan and `docs/execplans/README.md`: canonical status, decisions, evidence, and handoff.
- `AGENTS.md` and `package.json`: exact E20 preflight/live/review operations and consumed-campaign warning after execution.
- `.github/workflows/ci.yml`: existing operability qualifier automatically exercises E20 after its local corpus expands; no secrets or live commands are added.
- `docs/experiments/`: sanitized E20 report only after the terminal call.
- RFC 0001 and ADR 0002: unchanged because E20 diagnoses an existing evidence classification and does not change normative lifecycle or missing-evidence policy.
- E5, E18, and E19 plans, fixtures, reports, reservations, and outputs: immutable historical evidence.

## Rollout and Recovery

There is no deployment. Before reservation, E20 changes can be reverted normally. After reservation, preserve the result and never reuse the campaign. Provider or infrastructure failure remains `INSUFFICIENT` and requires a separately planned campaign; no result authorizes a retry or taxonomy change inside E20.

## Lessons Learned

- A model can describe an appropriate observable check yet fail a lexical evidence taxonomy required by the validator.
- A same-packet alternative-model contrast is useful for attribution diagnosis only when reporting preserves instruction and evaluator ambiguity.
- Instrument correction must follow, rather than precede, this contrast if the comparison is to remain controlled.
- Explicit Terra and Luna conditions both use schema-2, so changing the provider condition changes the condition fingerprint while leaving schema and model-facing packet fingerprints identical.
- A controlled contrast needs an exact failure signature as well as a shared packet; otherwise unrelated DRAFT outcomes would be overinterpreted as evidence about the same instrument defect.

## Offline Validation Evidence

On 2026-08-13, before any E20 reservation or external call, the focused Author suites passed 58 tests and the complete repository passed 163 tests. `npm audit` reported zero vulnerabilities. Typecheck, lint, Prettier, build, `experiment:verify`, and the archaeological, Author, provider, lifecycle, and operability qualifiers all passed. The E18–E20 operability qualifier traversed nine local Promptfoo/Codex SDK processes, reported both review workflows qualified, and made zero external provider calls. The post-GREEN design review centralized frozen campaign policy without changing behavior. Draft PR #8 passed every hosted CI step at implementation commit `00769d1337142f13c71712a94c152bdda45be828`. E20 reservation, output, and report paths were absent. The campaign fingerprint is `9ee8ae89e362ca931f6f4d8fda0b097995b7b03e2d09ec26c2bfc475e12f9672`; the final documentation CI and exact literal-SHA preflight remain pending.
