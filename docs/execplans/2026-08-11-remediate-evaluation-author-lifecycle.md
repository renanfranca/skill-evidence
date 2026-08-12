# Remediate the Evaluation Author lifecycle semantics

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-11
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Planning baseline: `feat/e5-blind-author-benchmark` at `2eb06211b449d3f149764948f0ae3e77f673099b`
- Execution baseline: the clean commit that completes `2026-08-11-reconcile-e5-result-semantics.md`; record its exact SHA in `Progress` before changing code
- Intended branch: `feat/e5-author-lifecycle-remediation`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`

Safety boundary: this plan implements an opt-in development protocol and deterministic offline qualification only. It does not invoke a real provider, create a formal campaign reservation, reuse E5 R1 blind material, diagnose Luna/max operability, qualify an Author condition, promote normal Author use, or authorize E6.

## Purpose / Big Picture

Teach the Evaluation Author to distinguish information that is genuinely required to complete a Blueprint from evidence collection and oracle qualification that belong to later evaluation stages. Developers should be able to select protocol v2 explicitly and observe correct `READY`, `BLOCKED`, and `DRAFT` discrimination on fresh development fixtures while every historical v1 packet, digest, and condition fingerprint remains reproducible.

## Scope

Included: version Author instructions and protocol identity; add an opt-in protocol-v2 input; clarify blocker semantics; add fresh adaptable development fixtures and a deterministic local qualifier; expose an internal protocol selector on `experiment:author`; preserve v1 by default; update tests and operational documentation.

Excluded: Blueprint schema-3, changes to schema-1 or schema-2, semantic rescoring of E5, reuse of E5 cases or expected answers, model-backed calls, Luna/max timeout diagnosis, blind qualification, production promotion, E6 compiler work, oracle generation, decision execution, and claims of reliability. Luna/max operability is preserved as the separate planned work in `2026-08-12-diagnose-luna-max-author-operability.md`.

## Definitions

- **Author protocol v1** is the immutable E4/E5 packet, instructions, protocol digest, and default behavior already recorded in historical evidence.
- **Author protocol v2** is an opt-in instruction set that adds an explicit decision rule for blocker versus future evaluation work without changing the Blueprint JSON shape.
- **Genuine blocker** is a missing fact that prevents a defensible Blueprint from specifying a necessary claim, contract, boundary, evidence source, or qualification plan even conditionally.
- **Future evaluation work** is evidence collection, oracle qualification, dependency setup, or execution that the Blueprint can already prescribe without possessing its future result.
- **Development qualifier** is deterministic local evidence about packet construction and lifecycle mechanics; it does not qualify a model-backed Author.

## Existing Context

`src/author/instructions.ts` currently has one v1 instruction set. It tells the model to create a blocking unresolved requirement when absent decision-critical information prevents evidence from supporting a claim, but does not state the complementary rule: qualification and collection planned for later do not need to exist during authorship.

`deriveBlueprintLifecycle` in `src/blueprint/evaluation-blueprint.ts` already provides the required system control. Invalid or incomplete candidates become `DRAFT`; complete candidates with any model-supplied blocking unresolved requirement become `BLOCKED`; complete candidates without one become `READY`. The existing schemas already represent future work through `oracleQualificationPlan`, `evidencePlan`, contract preconditions, stopping conditions, untested risks, and nonblocking unresolved requirements.

E5 R1 found high critical-reference recall but systematic over-blocking: all four `READY` references became `BLOCKED`, and one unsupported critical blocker required already-qualified mechanical oracles where the skill required only an oracle qualification plan. Those aggregate findings motivate development but the exposed E5 cases cannot become qualification fixtures.

E5 R1 also found a distinct operational failure: all eight Luna/max calls ended as sanitized `TIMEOUT/ABORTED` results and produced no Blueprint. Seven reached the five-minute boundary and one ended after approximately 263 seconds. This evidence does not identify a semantic Author defect and is intentionally not investigated by this lifecycle plan. Official OpenAI documentation checked on 2026-08-12 states that GPT-5.6 Luna supports `max` reasoning and may be selected for Codex subagents. The E5 Author adapter also set `features.multi_agent: false`, so lack of Luna subagent support is not a supported explanation for these timeouts.

## Desired End State

Protocol v1 remains the exact default and reproduces its historical packet and fingerprints. Protocol v2 is selected only through an explicit internal input and has distinct instruction, protocol, packet, and condition fingerprints. Its instructions distinguish genuine missing authoring inputs from planned downstream work. A new zero-external-call qualifier demonstrates the distinction on fresh development material and reports only `SUPPORTED_FOR_DEVELOPMENT`. No existing Blueprint schema or E5 artifact changes. Completion records the stable protocol-v2 fingerprint as the input boundary for the separately authorized Luna/max operability investigation; it does not execute that investigation.

Internal interface additions:

```ts
type AuthorProtocolVersion = 1 | 2;

interface AuthorInput {
  campaignId: string;
  condition?: AuthorConditionSpec;
  invoke: AuthorInvoker;
  protocolVersion?: AuthorProtocolVersion;
  snapshot: SkillSnapshot;
}

prepareAuthorInvocation(
  snapshot: SkillSnapshot,
  condition?: AuthorConditionSpec,
  protocolVersion?: AuthorProtocolVersion,
): PreparedAuthorInvocation;
```

Omission of `protocolVersion` must remain semantically and fingerprint-equivalent to v1. `PreparedAuthorInvocation` records the selected version. The internal CLI accepts `--author-protocol 1|2`, defaults to `1`, and rejects any other value before reservation or invocation.

## Milestones

### Milestone 1 — Version the protocol without changing v1

Use behavior-focused TDD in `test/evaluation-author.test.ts`. First prove the existing v1 instruction, packet, schema, protocol, and condition fingerprints remain exact when the version is omitted or explicitly `1`. Then version the instruction lookup and digest construction, add `AuthorProtocolVersion`, thread the optional version through preparation and authorship, and reject unsupported versions before invoking the provider.

Protocol v2 must add these normative rules:

- block only when a missing fact prevents a defensible section from being specified, including conditionally;
- do not block merely because evidence must be collected, an oracle must be qualified, or a dependency must be available before a future evaluation or decision run;
- represent future work in evidence/oracle plans, contract preconditions, stopping conditions, untested risks, or nonblocking unresolved requirements;
- never require an oracle to be already qualified during Blueprint authorship when a complete qualification plan can be written;
- never invent missing policy, authority, expected answers, thresholds, or external state to reach `READY`.

Update `src/cli.ts` to parse `--author-protocol 1|2`, default to v1, include the selected version in preparation, and preserve existing approval and reservation gates. Update `AGENTS.md` only to document the optional flag and its non-qualification status.

Acceptance: v1 fixtures and fingerprints are unchanged; v2 has distinct instruction/protocol/packet/condition fingerprints but the same applicable schema digest; invalid versions produce a usage error with zero invocations and no reservation.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run typecheck
npm run experiment:verify
```

### Milestone 2 — Add fresh lifecycle-remediation development evidence

Create a new adaptable corpus under `evaluations/refactor-design/e5-author-remediation/`, with no content, IDs, contracts, expected answers, or oracle material copied from E5 R1. Keep expected lifecycle and mechanical checks outside each nested skill snapshot.

Cover at least these eight behaviors:

1. future oracle qualification with a complete plan is `READY`;
2. evidence to collect during evaluation is `READY`;
3. a skill-specified conditional contract is `READY`;
4. an explicit nonblocking future dependency does not promote to `BLOCKED`;
5. genuinely absent authority policy is `BLOCKED`;
6. genuinely absent behavior needed to define a contract is `BLOCKED`;
7. structural or semantic incompleteness remains `DRAFT`;
8. absent context is exposed rather than invented to manufacture `READY`.

Add `experiment:qualify:author-lifecycle` through Promptfoo with a deterministic local provider, serialized configuration, cache disabled, concurrency one, and exactly eight local results. Inspect the actual Author packet for v2 rules and forbidden expected-state/oracle leakage. The canonical report records purpose `DEVELOPMENT`, local/external call counts, exact expected and actual states, fingerprints, limitations, and `SUPPORTED_FOR_DEVELOPMENT`, `INSUFFICIENT`, or `BLOCKED`.

Acceptance: all eight cases match; external calls are zero; provider imports remain zero at `experiment:verify`; the report explicitly says it does not qualify Terra, Luna, protocol-v2 model behavior, or automatic authorship.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:qualify:author-lifecycle
npm run experiment:verify
```

### Milestone 3 — Review design and reconcile documentation

After the focused suite, full suite, and public checkpoint are green, execute `refactor-design`. Review version selection, digest construction, packet assembly, legacy compatibility, and fixture ownership for mixed responsibilities or hidden temporal coupling. If review finds missing behavior, return to TDD; apply only behavior-preserving refactors during the design pass.

Update this ExecPlan continuously, mark its index status, document the new command and opt-in CLI flag in `AGENTS.md`, and explain why RFC 0001, ADR 0002, existing schemas, E4/E5 reports, and E5 benchmark material remain unchanged.

Acceptance: v1 remains the default, v2 remains development-only, documentation exposes no implied provider authorization, and no frozen E5 path changed.

### Milestone 4 — Final deterministic validation

Run the complete sequence without a real provider:

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
npm run experiment:qualify:author-lifecycle
npm run experiment:qualify:author-benchmark:offline -- --bundle evaluations/refactor-design/e5-author-benchmark
npm run experiment:qualify:author-benchmark:runner
git diff --check
git status --short
```

Acceptance: audit is zero; all tests and deterministic qualifiers pass; public provider imports remain zero; every new reservation or artifact exists only under temporary roots; `docs/experiments/e5-author-benchmark-20260811-r1*`, its bundle, preparation, schemas, and historical E4 artifacts are unchanged.

At handoff, record the exact protocol-v2 instruction, protocol, schema, packet, and condition fingerprints needed by ExecPlan 18. Do not mark Luna/max operability resolved and do not authorize its diagnostic canary from this milestone.

## Progress

- [x] Consult THEORY commit `572e963`, RFC 0001 E5/E6 boundaries, current Author protocol, schemas, lifecycle derivation, and E5 findings.
- [x] Choose protocol v2 with unchanged schemas as the minimum remediation hypothesis.
- [x] Create this planned ExecPlan and its index entry.
- [x] Preserve Luna/max operability as separate ExecPlan 18 work and record that E5 disabled multi-agent.
- [ ] Complete the E5 result-semantics reconciliation and record its exact clean baseline.
- [ ] Create `feat/e5-author-lifecycle-remediation` from that baseline.
- [ ] Complete Milestone 1 through behavior-focused TDD.
- [ ] Complete Milestone 2 with zero external calls.
- [ ] Complete post-GREEN design review and documentation reconciliation.
- [ ] Complete final deterministic validation and intentional commits.

## Decisions

- Decision: preserve protocol v1 as the default and introduce v2 only by explicit selection.
  Rationale: historical E4/E5 evidence depends on exact packet and condition identities; remediation creates a new condition rather than rewriting the old one.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: preserve Blueprint schemas 1 and 2.
  Rationale: the existing shape already represents blocking and nonblocking requirements plus downstream qualification work; E5 first supports testing clearer semantics, not a schema migration.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: qualify protocol mechanics offline before any model-backed canary.
  Rationale: deterministic evidence can prove compatibility, packet identity, and lifecycle plumbing without implying model quality or spending provider calls.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: never use E5 R1 cases as remediation acceptance fixtures.
  Rationale: observed cases are development evidence now, but tuning and approving against their expected answers would not establish generalization.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: keep Luna/max operability separate and hand off only after protocol v2 has a stable fingerprint.
  Rationale: lifecycle semantics and runtime completion are distinct claims, and protocol v2 changes the exact prompt condition whose operability matters for future use.
  Date/Author: 2026-08-12 / user and planning agent.

## Risks and Mitigations

- Risk: v2 silently changes historical v1 identities. Mitigation: default v1, exact digest/fingerprint regression assertions, and frozen-path diff checks.
- Risk: prompt clarification is mistaken for demonstrated model improvement. Mitigation: local qualifier reports development mechanics only; model-backed claims require fresh evidence.
- Risk: fixtures encode the exposed E5 benchmark. Mitigation: use new domains, IDs, wording, contracts, and expected states; prohibit copying any E5 reference or candidate.
- Risk: future-work language becomes a blanket reason for `READY`. Mitigation: retain genuine blockers when missing facts prevent defensible claims, contracts, boundaries, or qualification plans.
- Risk: schema-3 is added speculatively. Mitigation: keep it out of scope until fresh evidence shows the existing representation remains inadequate.
- Risk: an internal CLI option is interpreted as authorization. Mitigation: preserve approval/reservation checks and document that every real invocation remains separately authorized.
- Risk: E6 begins despite an unqualified Author. Mitigation: this plan produces only `SUPPORTED_FOR_DEVELOPMENT`; E6 and fresh blind qualification remain separate gates.
- Risk: completing lifecycle remediation is mistaken for resolving Luna/max's eight timeouts. Mitigation: keep timeout diagnosis out of this plan, record the protocol-v2 handoff fingerprints, and retain ExecPlan 18 as a separate authorization boundary.

## Validation Strategy

Follow `tdd-behavior-autonomous-quiet`: predict and observe RED through the stable Author preparation and execution interfaces, implement the minimum GREEN behavior, and run the full relevant suite plus `experiment:verify` at most every two cycles. After all behavior is green, use `refactor-design`, reconcile canonical documentation, then run the complete deterministic sequence once more. Never substitute local deterministic outputs for model-backed qualification.

## Documentation Impact

- This ExecPlan and `docs/execplans/README.md`: living progress, decisions, evidence, and final status.
- `AGENTS.md`: document protocol selection and the new offline qualifier while preserving separate provider authorization.
- `package.json`: add only the deterministic lifecycle qualifier command.
- RFC 0001 and ADR 0002: unchanged; v2 implements their existing distinction among authoring, evidence collection, oracle qualification, and decision execution.
- Blueprint schemas 1 and 2: unchanged.
- E4/E5 reports, benchmark bundle, preparation, adjudication, and scoring artifacts: immutable.

## Rollout and Recovery

There is no deployment or normal-path promotion. Land the protocol and qualifier in small commits using `commit-the-changes`. Because v1 remains default, recovery is a normal revert of v2-specific commits. A future real canary or blind campaign needs novel material, a separate ExecPlan, a new condition fingerprint, and explicit authorization; E5 R1 can never be repeated.

## Lessons Learned

- E5 showed that high reference recall can coexist with incorrect lifecycle semantics; lifecycle must be tested as its own contract.
- A future oracle qualification requirement is part of a complete evaluation design, not proof that the Blueprint itself is incomplete.
- Versioning instructions without rewriting schemas preserves historical evidence while allowing a falsifiable remediation hypothesis.
- Offline packet and lifecycle qualification can establish implementation correctness, but only fresh model-backed evidence can establish Author improvement.
- Official Luna subagent support does not explain E5 R1 because the Author adapter disabled multi-agent; timeout attribution remains open and requires separate observable evidence.
