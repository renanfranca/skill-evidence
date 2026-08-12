# Qualify the Evaluation Author blindly — E5

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current throughout execution.

Safety boundary: only this planning document is authorized on 2026-08-11. Creating benchmark material, changing product or experiment code, reserving campaigns, invoking providers, adjudicating results, qualifying an Author condition, or promoting any normal product path requires later explicit authorization. Planning does not expose blind material and does not itself satisfy Gate G5.

The intended implementation executor is `gpt-5.6-terra` with `xhigh` reasoning. The E4 baseline is commit `916f8bbcc438d1b5aa30868fad4e4379fdf2ea43` on `feat/e4-evaluation-author-v0`. Before authorized implementation begins, create `feat/e5-blind-author-benchmark` from a clean commit containing that E4 baseline and this plan, then record the exact implementation baseline here. The normative THEORY was read in full at commit `572e963ea6f1207ab53c533592cb70a8239e221c`.

Planning status: `COMPLETE — EXECUTION NOT AUTHORIZED`.

## Purpose / Big Picture

E5 determines whether either of two exact Evaluation Author conditions can produce defensible Evaluation Blueprints on novel, hidden reference material. It compares the E4 quality baseline, `gpt-5.6-terra` with `xhigh` reasoning, against the lower-cost challenger `gpt-5.6-luna` with `max` reasoning. The comparison asks whether additional reasoning allows Luna to satisfy the same quality gates at a lower resource price, not whether either model is generally reliable.

The Author sees only the authorized skill snapshot, schema, THEORY-based instructions, and authorship protocol. It never sees the reference evaluation, expected lifecycle, scoring rubric labels, condition comparison, or another condition's output. Frozen adjudicated references and qualified reviewers measure semantic precision, recall, blocking behavior, evidence compatibility, and fabrication. A successful E5 result qualifies only the exact fingerprinted operational condition. It does not freeze a Blueprint, authorize a decision run, or prove the effective provider checkpoint.

The valid terminal conclusion includes:

```text
AUTOMATIC_AUTHOR_NOT_DEFENSIBLE
```

No adaptive retry, benchmark repair, threshold change, or case replacement may be used to obtain a favorable result.

## Existing Context

E4 is complete as development evidence. Its independently authorized R3 campaign made one real provider invocation with zero retries, returned a canonical `BLOCKED` Blueprint, passed all prespecified semantic and safety checks, and was classified `SUPPORTED_FOR_E5`. The sanitized report is `docs/experiments/e4-evaluation-author-canary-r3-20260810.json`.

R3 did not qualify the Author. Its Blueprint remains `NOT_QUALIFIED`, `DEVELOPMENT_AUTHORING`, and `decisionEligible: false`. The provider accepted and completed the requested Terra/xhigh operation but exposed no effective model identifier. Inspection of the pinned and currently latest `@openai/codex-sdk` 0.147.0 shows that `ThreadEvent` and `Turn` contain items, final response, and token usage but no model field. Promptfoo 0.122.0 builds Codex SDK response metadata from skill metadata only. E5 therefore qualifies an operationally requested condition and never promotes a successful request into an observation of the effective checkpoint.

Official OpenAI model guidance consulted on 2026-08-11 describes Terra as balancing intelligence and cost, Luna as optimized for cost-sensitive workloads, and both as supporting `xhigh` and `max` reasoning. Pricing is volatile and account billing through ChatGPT authentication is not established by API list prices. E5 may report a frozen API-equivalent estimate from observed token usage, but it must label that estimate as analytical rather than actual campaign cost.

RFC 0001 sections 52–55 and 75 require a blind Author benchmark against adjudicated reference evaluations, explicit uncertainty, and rejection of fabricated context. ADR 0002 requires bounded execution, prespecified retries and stopping, immutable instrument conditions, and terminal inconclusive outcomes. Those documents remain normative and unchanged.

## Scope

E5 includes:

- parameterizing the internal Author condition while preserving E4's Terra/xhigh default behavior;
- eight novel blind synthetic skill cases and frozen adjudicated reference evaluations;
- a qualified, condition-blind semantic review protocol;
- a deterministic offline benchmark verifier and canonical qualification report schema;
- exactly sixteen separately authorized benchmark invocations, one per case and condition;
- complete sanitized final candidates, judgments, metrics, limitations, and provenance;
- a condition-specific qualification result and a prespecified challenger-selection rule;
- deterministic tests and CI that make zero external provider calls.

E5 excludes:

- a public `skill-evidence` CLI;
- E6 Blueprint compilation, E7 oracle generation/qualification, or decision execution;
- `FROZEN`, `decisionEligible: true`, automatic claim promotion, or production rollout;
- reuse of V1, archaeological, E4 fixture, canary, contract, oracle, or expected-answer material;
- Sol, additional models, repeated samples, adaptive prompt changes, cost optimization, or reliability claims;
- App Server adoption or claims that the effective model checkpoint was observed;
- raw reasoning, credentials, or unsanitized local session artifacts.

## Definitions

- A **requested Author condition** is the requested model and reasoning plus the instruction, THEORY, schema, and protocol digests already represented by the E4 condition fingerprint.
- A **qualification condition** combines the requested Author condition with pinned Promptfoo, Codex SDK, Codex CLI, Node, authentication mode, sandbox, and relevant environment fingerprints.
- **Operational acceptance** means the pinned adapter submitted the requested configuration and the provider completed the call. It is not provider-reported model identity.
- An **effective model observation** is an independent provider or protocol field identifying the executed model. Under the current SDK/Promptfoo surface it is `null`.
- A **blind case** is a novel synthetic skill plus a hidden adjudicated reference evaluation. Only its authorized snapshot reaches the Author.
- An **atomic reference item** is one prespecified semantic claim, contract, activation region, evidence requirement, exclusion, blocker, or uncertainty expectation with criticality and accepted semantic alternatives.
- A **qualified reviewer** has passed the frozen reviewer-qualification probes before seeing benchmark outputs.
- A **campaign bundle** contains the eight cases, references, rubric, thresholds, counterbalanced schedule, software identities, budget, and canonical fingerprint frozen before collection.

## Desired End State and Internal Interfaces

Preserve `authorEvaluationBlueprint(input)` and its E4 default. Add an internal condition parameter only where explicitly supplied by E5:

```ts
interface AuthorConditionSpec {
  model: 'gpt-5.6-terra' | 'gpt-5.6-luna';
  reasoningEffort: 'xhigh' | 'max';
}

prepareAuthorInvocation(snapshot: SkillSnapshot, condition?: AuthorConditionSpec): PreparedAuthorInvocation
authorEvaluationBlueprint(input: AuthorInput & { condition?: AuthorConditionSpec }): Promise<AuthorRunResult>
validateAuthorBenchmarkBundle(value: unknown): AuthorBenchmarkValidation
scoreAuthorBenchmark(input: BlindAdjudicationInput): AuthorQualificationReport
```

Omitting `condition` must remain byte-for-byte equivalent in semantic behavior and fingerprints to E4 Terra/xhigh. Reject unsupported model/reasoning pairs rather than silently falling back.

Add a canonical `schemas/author-qualification-report.schema.json`. Its report records:

- purpose `AUTHOR_QUALIFICATION` and schema version;
- campaign, bundle, qualification-condition, packet, snapshot, reference, rubric, and policy fingerprints;
- requested model/reasoning, operational acceptance, effective model or `null`, and evidence kind;
- one immutable result for every scheduled case-condition pair;
- token usage, elapsed time, provider outcome, lifecycle, and sanitized candidate identity;
- blinded atomic judgments, disagreements, adjudications, and reviewer-qualification evidence;
- per-condition metrics, critical violations, limitations, and `QUALIFIED` or `NOT_QUALIFIED`;
- campaign result `QUALIFIED`, `NOT_QUALIFIED`, `INSUFFICIENT`, or `INVALIDATED`;
- selected condition or `null` and an explicit selection rationale;
- expiration conditions that make a prior qualification `STALE`.

Do not change schema-1 Blueprint lifecycle or retroactively modify E4 artifacts. A successful E5 report is the qualification record; activating that record in a later normal Author path requires separate authorization.

The planned internal commands are:

```text
npm run experiment:qualify:author-benchmark:offline -- --bundle <directory>

npm run experiment:benchmark:author -- --bundle <directory> --campaign <id> \
  --approve-provider-invocations 16

npm run experiment:score:author-benchmark -- --campaign <id> \
  --judgments <directory> --out <report.json>
```

The offline qualifier is allowed in CI and makes zero external calls. The benchmark command is never part of CI and requires a later explicit campaign authorization.

## Blind Benchmark Design

Create eight synthetic skills only after execution is authorized. Organize them into four behavioral strata, each containing one case whose reference lifecycle is `READY` and one whose reference lifecycle is `BLOCKED`:

1. bounded deterministic transformation;
2. repository or filesystem mutation with observable recovery behavior;
3. evidence-based analysis with valid alternatives and incompatible evidence risks;
4. authority-sensitive workflow with positive, negative, and near-boundary activation.

The paired lifecycle design prevents skill family from being perfectly confounded with blocking. Every case must contain observable contracts, activation boundaries, usage and stress families, required/prohibited effects, recovery paths, evidence compatibility expectations, and at least one accepted semantic alternative. `READY` references contain all decision-critical context. `BLOCKED` references omit at least one genuinely unavailable decision-critical fact and prescribe structured unresolved requirements without placeholder values.

No reference targets `DRAFT`. A complete Author should represent an underspecified skill as a complete `BLOCKED` Blueprint. `DRAFT`, `ERROR`, invalid JSON, fenced JSON, or provider failure is an observed Author failure for that scheduled sample.

Two independent reference curators first enumerate atomic items without seeing model output. A resolver adjudicates disagreements using THEORY and concrete skill evidence. Freeze all reference items with:

- stable opaque IDs unrelated to expected status;
- critical or noncritical classification;
- accepted semantic equivalents;
- prohibited incidental wording dependencies;
- compatible and incompatible evidence paths;
- expected blocker behavior where applicable;
- provenance to observable snapshot paths without leaking expected labels to the Author.

Commit the complete bundle and its canonical manifest before any benchmark call. The Author executes in an empty temporary workspace and receives only the packet created by product code. A packet-blindness verifier must prove that no reference, expected lifecycle, scoring threshold, condition label, oracle, or result path appears directly or through a digest-correlated identifier.

## Reviewer Qualification and Adjudication

Use two independent semantic reviewers and one resolver. Reviewers may not see requested model, reasoning, expected lifecycle, condition order, or aggregate scores until their initial atomic judgments are locked.

Before benchmark calls, qualify both reviewers on sixteen frozen development probes, four from each required family:

```text
known-valid
known-invalid
alternative-valid
unsupported-fluency
```

Each reviewer must achieve:

- 100% correct treatment of critical omissions, critical fabrications, incompatible mandatory evidence, and fluent unsupported claims;
- at least 90% correct noncritical atomic judgments;
- at least 90% inter-reviewer agreement before resolution;
- explicit `NEEDS_ADJUDICATION` rather than forced pass/fail on ambiguous alternatives.

Reviewer qualification failure blocks all sixteen provider calls. Reviewer instructions, probe set, expected labels held by the harness, resolution policy, and qualification results are fingerprinted. Any material reviewer or rubric change after collection invalidates the campaign rather than permitting rescoring under a new instrument.

After all model calls terminate, anonymize candidates using opaque sample IDs. Reviewers independently score semantic matches, inventions, over-specific wording, compatible evidence, blockers, and activation coverage. The resolver sees both locked judgments and the reference evidence, resolves only recorded disagreements, and writes a concrete rationale. Mechanical lifecycle, schema, packet-blindness, controlled-field, and reference-integrity checks are not overridable by reviewers.

## Conditions, Schedule, and Budget

The two conditions are fixed:

| Condition     | Requested model | Reasoning | Role                |
| ------------- | --------------- | --------- | ------------------- |
| `TERRA_XHIGH` | `gpt-5.6-terra` | `xhigh`   | E4 quality baseline |
| `LUNA_MAX`    | `gpt-5.6-luna`  | `max`     | cost challenger     |

Run each of the eight cases once under each condition: sixteen total invocations. Use one fresh thread and empty temporary workspace per invocation, cache disabled, concurrency one, `maxRetries: 0`, five-minute per-call timeout, read-only sandbox, approvals `never`, disabled network/web search/thread persistence/sharing/latest results/multi-agent, and the explicitly selected `/home/renanfranca/.codex` ChatGPT-authenticated home.

Derive a deterministic counterbalanced order from the frozen bundle fingerprint: Terra runs first for four cases and Luna first for four. Freeze that schedule before reservation. Create an atomic campaign reservation with total budget sixteen, then atomically consume one sample reservation immediately before each call. Never replace, repeat, or reorder a consumed sample.

Preflight must verify a clean exact commit, current bundle fingerprint, Node/npm/Promptfoo/SDK/CLI versions, writable authenticated Codex home, absent `OPENAI_API_KEY` and `CODEX_API_KEY`, no prior campaign, output-path exclusivity, packet blindness, and qualified reviewers. It must not make a provider call.

If one sample fails or times out, record it and continue the frozen schedule unless the failure is classified as global authentication failure, global model unavailability, security-boundary failure, or infrastructure corruption. A global failure stops remaining calls and yields `INSUFFICIENT`; exposed material cannot be used in a replacement qualification campaign. A blindness, freeze, reservation, or schedule violation yields `INVALIDATED`.

Record usage and elapsed time when available. Freeze the official API price reference used for an API-equivalent estimate, but label actual ChatGPT-account cost `UNKNOWN`. The hard budget is invocation count, not dollars.

## Metrics, Qualification Gates, and Selection

Compute semantic matches over atomic reference items after adjudication. Report counts and denominators, not percentages alone. Do not average away critical failures.

A condition is `QUALIFIED` only when all gates pass:

1. all eight scheduled invocations complete with structurally valid pure-JSON candidates and canonical Blueprints;
2. lifecycle matches the reference in 8/8 cases;
3. critical claim recall, critical contract recall, and compatible critical evidence coverage are each 100%;
4. decision-context fabrication, critical invented contracts, prompt-injection compliance, and controlled-field overwrite are all zero;
5. every reference blocker is represented correctly in all four `BLOCKED` cases, with no fabricated blocker in `READY` cases;
6. macro precision and macro recall across noncritical claims and contracts are each at least 90%;
7. positive, negative, and near-boundary activation coverage are each at least 7/8 cases where the region is applicable;
8. usage and stress remain semantically distinct, valid alternatives are accepted, prohibited effects and recovery paths are preserved, and no critical reviewer disagreement remains unresolved;
9. all instrumentation, blindness, freeze, schedule, reservation, and provenance checks pass.

Selection minimizes cost subject to qualification:

- if Luna/max qualifies, select Luna/max even if Terra/xhigh also qualifies;
- otherwise, if Terra/xhigh qualifies, select Terra/xhigh;
- otherwise select no condition and report `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE`.

Do not lower thresholds because Luna is cheaper or select Terra because it has a higher unprespecified aggregate score. Report comparative semantic metrics, tokens, latency, and API-equivalent estimates descriptively; E5 does not claim statistical superiority or general reliability from one sample per case.

## Milestones

### Milestone 0 — Preserve the authorization boundary

Create only this plan and its index entry. Record E4 R3 evidence, the SDK/Promptfoo model-identity limitation, chosen conditions, breadth, gates, and future authorization boundary. Commit no E5 code, fixture, reference, reservation, or experiment result.

Acceptance: repository diff contains documentation only; `Progress` leaves every execution activity unchecked.

### Milestone 1 — Parameterize the Author condition

After explicit implementation authorization, create the E5 branch and use behavior-focused TDD to introduce the condition parameter, preserve the exact E4 default, reject unsupported pairs, and fingerprint qualification environment separately from the Author content condition. Add the report schema and deterministic canonicalization.

Acceptance: E4 behavior and fingerprints remain stable when no condition is supplied; Terra/xhigh and Luna/max produce distinct deterministic condition fingerprints; effective model remains explicitly nullable and operational acceptance never masquerades as observation.

### Milestone 2 — Build and qualify the blind instrument

After explicit material authorization, create the eight novel cases, dual-curated references, reviewer rubric, sixteen qualification probes, frozen schedule, bundle validator, scoring engine, and provider-free offline command. Do not inspect outputs because none exist yet.

Acceptance: references are complete and internally consistent; both reviewers qualify; packet-blindness and expectation-blindness checks pass; the canonical bundle fingerprint is frozen in a clean commit.

### Milestone 3 — Freeze and authorize the campaign

Run the full offline validation and `refactor-design`, reconcile documentation, and create a clean preparation commit. Record exact versions, fingerprints, reservations, budgets, stop rules, reviewer identities, output locations, and sanitized-report policy. Obtain separate explicit authorization for exactly sixteen calls.

Acceptance: preflight passes without provider access; no reservation or model call exists before authorization.

### Milestone 4 — Execute the fixed blind schedule

Reserve the sixteen-call campaign atomically and run the frozen counterbalanced schedule once. Preserve every terminal result, including errors. Do not score, inspect aggregate condition performance, modify the instrument, or adapt remaining calls during collection.

Acceptance: each started sample consumed one reservation; no retry occurred; execution stopped only under a prespecified global stop; all available final candidates and provenance are preserved without raw reasoning.

### Milestone 5 — Blind review, adjudicate, and classify

Anonymize completed outputs, collect locked independent judgments, resolve recorded disagreements, run mechanical checks, compute prespecified metrics, and apply qualification and selection rules exactly once. Produce a canonical full report and a sanitized public report.

Acceptance: result is one of `QUALIFIED`, `NOT_QUALIFIED`, `INSUFFICIENT`, or `INVALIDATED`; selected condition follows the fixed rule; no normal Author path or decision eligibility is promoted.

### Milestone 6 — Reconcile and validate

Update this plan, index, AGENTS.md, operational commands, risks, and lessons. Preserve historical reports. Run final deterministic validation without repeating any real call. Commit small intentional changes with `commit-the-changes`. Push and pull request remain out of scope unless separately requested.

## Test Plan

Keep E5 behavior in a cohesive suite rather than mirroring production files. Cover:

- default E4 condition and fingerprint preservation;
- supported and rejected condition pairs;
- qualification-condition fingerprint changes for every material dependency;
- requested, operationally accepted, and effective model evidence separation;
- canonical bundle ordering and fingerprinting;
- duplicate IDs, broken references, empty atomic sets, lifecycle imbalance, and leaked expected labels;
- four behavioral strata with one `READY` and one `BLOCKED` case each;
- packet exclusion of references, lifecycle, rubric, thresholds, conditions, oracles, and historical material;
- reviewer probe qualification, disagreement locking, and adjudication provenance;
- deterministic counterbalancing and one reservation per sample;
- provider error, timeout, invalid/fenced JSON, global stops, no retry, and no replacement;
- every critical override and every numeric gate boundary;
- Luna-first, Terra-fallback, and no-defensible-condition selection;
- `INSUFFICIENT` versus `NOT_QUALIFIED` versus `INVALIDATED` precedence;
- `effectiveModel: null` without inferred confirmation;
- historical E0–E4 report preservation and provider-free CI.

Future final validation, without model-backed repetition:

```text
npm ci
npm audit --json
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
npm run experiment:qualify:archaeological
npm run experiment:qualify:author
npm run experiment:qualify:author-provider
npm run experiment:qualify:author-benchmark:offline -- --bundle <frozen-bundle>
npm run experiment:qualify:codex-otel
npm run experiment:qualify:tracing
npm run experiment:verify:tracing
git diff --check
git status --short
```

## Progress

- [x] Read THEORY in full at `572e963ea6f1207ab53c533592cb70a8239e221c`.
- [x] Reconcile E4 R3 as real development evidence supporting E5 planning.
- [x] Verify that pinned/latest Codex SDK and Promptfoo do not expose an effective model field on this surface.
- [x] Prespecify Terra/xhigh versus Luna/max, eight cases, and sixteen benchmark calls.
- [x] Create this planning-only ExecPlan and index entry.
- [ ] Receive explicit authorization to implement E5 code.
- [ ] Create the E5 branch and record its exact baseline.
- [ ] Complete Milestone 1.
- [ ] Receive explicit authorization to create blind material.
- [ ] Complete Milestone 2.
- [ ] Complete Milestone 3 and obtain explicit sixteen-call authorization.
- [ ] Complete Milestone 4 exactly once.
- [ ] Complete Milestone 5.
- [ ] Complete Milestone 6.

## Decisions

- Decision: planning is the only currently authorized E5 action.
  Rationale: blind material, implementation, qualification, and provider cost are materially distinct actions that require later authorization.
  Date/Author: 2026-08-11 / user and planning agent.
- Decision: compare Terra/xhigh with Luna/max rather than Sol.
  Rationale: Terra preserves the successful E4 development baseline, while Luna/max tests a materially cheaper condition without making Sol's higher cost necessary for the first qualification attempt.
  Date/Author: 2026-08-11 / user.
- Decision: use eight cases and sixteen calls with no repetitions.
  Rationale: four paired behavioral strata provide bounded breadth while avoiding adaptive sampling and excessive cost.
  Date/Author: 2026-08-11 / user.
- Decision: qualify the requested operational condition while preserving effective model identity as unknown.
  Rationale: the latest SDK and Promptfoo surface do not expose an effective model field; successful configuration submission is evidence of operational acceptance, not checkpoint identity.
  Date/Author: 2026-08-11 / user and planning agent.
- Decision: select Luna whenever it satisfies the same fixed quality gates.
  Rationale: cost minimization occurs only after qualification, preventing price from compensating for a critical quality failure.
  Date/Author: 2026-08-11 / planning agent.
- Decision: target only `READY` and `BLOCKED` references.
  Rationale: `DRAFT` represents incomplete authorship rather than a desired answer to an underspecified skill; complete authorship should represent missing context as structured blockers.
  Date/Author: 2026-08-11 / planning agent.
- Decision: do not activate a successful qualification in the normal Author path during E5.
  Rationale: E5 produces evidence and a condition-specific qualification record; rollout and later compiler integration remain separate promotions.
  Date/Author: 2026-08-11 / planning agent.

## Risks and Mitigations

- Risk: the benchmark is called blind while references leak through packets, workspaces, IDs, or condition order. Mitigation: empty workspace, explicit packet allowlist, opaque IDs, counterbalanced frozen order, and structural leakage checks before reservation.
- Risk: synthetic references reward incidental wording. Mitigation: atomic semantic requirements, accepted alternatives, dual curation, and explicit rejection of wording-only judgments.
- Risk: reviewers become an unqualified Judge. Mitigation: sixteen prespecified probes, two independent reviewers, agreement thresholds, locked judgments, and evidence-based adjudication before any benchmark use.
- Risk: one case family determines lifecycle performance. Mitigation: pair one `READY` and one `BLOCKED` case inside each of four behavioral strata.
- Risk: operational acceptance is reported as effective model identity. Mitigation: distinct fields and evidence kinds, nullable effective identity, and no inference from requested configuration.
- Risk: a cheaper condition passes through averaging despite a critical defect. Mitigation: critical failures override all aggregates; selection considers cost only after every quality gate passes.
- Risk: provider failure tempts replacement or retry. Mitigation: atomic per-sample reservations, terminal outcomes, frozen schedule, and no reuse of exposed material.
- Risk: incomplete collection is mistaken for a failed quality qualification. Mitigation: operational incompleteness yields `INSUFFICIENT`; complete evidence below thresholds yields `NOT_QUALIFIED`.
- Risk: E5 silently expands into E6/E7 or production. Mitigation: no compiler, oracle generation, `FROZEN`, decision eligibility, public CLI, or normal-path activation.
- Risk: API list prices are mistaken for actual ChatGPT cost. Mitigation: label token-price calculations API-equivalent and report actual account cost as unknown.

## Validation Strategy

Future implementation follows `tdd-behavior-autonomous-quiet`. Tests lead each stable observable contract; the full relevant suite and provider-free checkpoint run at least every two cycles. Deterministic offline instrument qualification precedes any expensive collection. `refactor-design` runs only after behavior, offline qualification, full tests, and public checkpoints are green.

The evidence ladder is:

```text
behavior tests
→ provider-free bundle and rubric qualification
→ clean frozen campaign commit
→ explicit sixteen-call authorization
→ fixed blind collection
→ condition-blind adjudication
→ mechanical scoring and terminal classification
→ final offline validation
```

No lower rung substitutes for a higher rung, and no real call substitutes for qualified adjudication.

## Documentation Impact

- This plan and `docs/execplans/README.md` are the only files changed under the current authorization.
- Future implementation updates AGENTS.md with E5 commands and explicit model-backed exclusions from CI.
- RFC 0001 and ADR 0002 remain unchanged unless implementation discovers a normative contradiction.
- Historical E0–E4 plans and reports remain byte-for-byte preserved.
- Official model guidance is a dated operational source, not normative evidence about Author quality.

## Rollout and Recovery

There is no deployment. Before any benchmark call, implementation commits and blind material may be reverted normally, subject to preserving already exposed reference provenance. After the first sample reservation or call, the campaign becomes append-only. A failed or invalidated campaign is preserved and cannot be repaired by reusing its cases. New material, a new campaign, and new authorization are required.

A qualified condition becomes `STALE` when any model/reasoning request, instruction, THEORY commit, schema, protocol, Promptfoo, Codex SDK/CLI, rubric, qualification policy, or relevant environment condition changes materially. Staleness never triggers automatic requalification.

## Lessons Learned

- E4 R3 established that one real successful Author call can support planning without qualifying reliability.
- Requested and effective model identity are different facts; the current SDK surface exposes only enough evidence to characterize the requested operational condition.
- A lower-cost condition should be selected only after it clears the same noncompensatory quality gates.
- Breadth across paired behavioral strata is more useful than repeating one adaptable development canary.
- A complete `BLOCKED` Blueprint is a success case for honest authorship, not an incomplete `DRAFT`.
- Blindness is an enforceable data-flow property, not merely an instruction to the model or reviewer.
