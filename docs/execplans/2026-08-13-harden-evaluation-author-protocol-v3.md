# Harden the Evaluation Author protocol v3

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-13
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Baseline: `main` at merge commit `95d9cd3`
- Branch: `feat/e21-author-protocol-v3`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`
- Predecessor: completed ExecPlan 20 and consumed campaign `e20-terra-xhigh-locale-catalog-20260813-r1`

Safety boundary: this is authorized defensive development in this repository. E21 uses deterministic local providers only. It does not authorize or execute a model-backed campaign, qualify an Author condition, or repeat E5, E18, E19, or E20.

## Purpose / Big Picture

Deliver an opt-in Author protocol v3 that cannot turn trusted missing decision context into `READY` through a model-selected boolean and that can describe direct observations separately from semantic or qualitative assessment. A developer can observe the new behavior through the internal Author API, CLI validation, schema-3, and a deterministic offline qualifier.

The first green implementation exposed normative gaps before merge: claim criticality remained model-controlled, required-evidence coverage was incomplete, path interpretation was ambiguous, composition could reread mutable inputs, and its identities did not cover every material instrument component. This revision closes those gaps without implementing the future compiler, capability preflight, execution, aggregation, or decision system.

## Scope

Included: trusted Authoring Context; schema-3 and candidate schema; system-owned blockers and reserved IDs; evidence paths; protocol-v3 packet and fingerprints; internal CLI support; deterministic qualification; CI and documentation.

Excluded: any provider-backed call; Author qualification; E22 cases; capability-matrix implementation; compiler or decision runs; changes to protocols v1/v2, historical reports, RFC 0001, or ADR 0002.

## Definitions

- **Authoring Context:** system-trusted facts about the intended evaluation decision and population, independently fingerprinted from the Author condition.
- **Required absent fact:** a fact declared necessary for the intended claims but not supplied; it deterministically produces a blocker.
- **System blocker:** an unresolved requirement derived from trusted context, not from model judgment.
- **Evidence path:** one sufficient alternative composed of conjunctive observation plans and their assessment procedures.
- **Observation plan:** a specification of what will be captured; it is not a claim that evidence has already been collected or that the capability is eligible.

## Existing Context

Protocol v2 clarifies future-work versus authoring blockers but still lets the model assign `blocking`. E20 recognized four missing facts and marked them nonblocking, producing `READY`. Schema-1/2 also uses one `evidenceType` enum and a validator-specific mandatory-`DIRECT` rule; E19 described an appropriate semantic check but omitted the separately required direct entry, producing `DRAFT`.

RFC 0001 requires structured unknowns, makes decision-field necessity claim-dependent, and keeps `READY` relative to the permitted stage. ADR 0002 assigns capability eligibility and alternative-path resolution to a later preflight. ADR 0003 records the v3 representation that preserves both boundaries.

## Desired End State

V1 remains the default and v1/v2 reproduce their exact identities. V3 requires valid trusted context before invocation, composes schema-3 deterministically, rejects reserved-ID spoofing, distinguishes system and Author requirements, models evidence paths, and produces only `DRAFT`, `BLOCKED`, or `READY` under system policy. The offline qualifier reports `SUPPORTED_FOR_DEVELOPMENT` with zero external calls and explicitly does not qualify model behavior.

Trusted claim requirements map one-to-one to claims and control mandatory, decision-critical, population, and initial status fields. Evidence requirements expose one path structure containing every observation, assessment, capability, evidence kind, and source. Inputs are frozen before invocation; composed validation is mandatory; condition, packet, context, and instrument identities name precise and non-overlapping boundaries.

## Milestones

### Milestone 1 — Introduce schema-3 and trusted context

Add schema-3, Authoring Context validation, protocol-v3 packet construction, separate context fingerprinting, and API/CLI gates. Preserve exact v1/v2 outputs.

Files: `schemas/`, `src/author/evaluation-author.ts`, `src/author/instructions.ts`, `src/cli.ts`, and `test/evaluation-author.test.ts`.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run typecheck
npm run experiment:verify
```

Acceptance: invalid or misplaced context fails before provider invocation; v1/v2 identities are unchanged; valid v3 packets are blind and fingerprinted.

### Milestone 2 — Compose protected blockers and evidence paths

Compose context fields and canonical system blockers, protect the reserved namespace across candidate IDs, validate exact system-blocker correspondence, implement schema-3 evidence paths, and derive lifecycle with `DRAFT` precedence.

Files: `src/blueprint/evaluation-blueprint.ts`, schema-3, Author composition, and the existing behavior suite.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run typecheck
npm run lint
npm run experiment:verify
```

Acceptance: required absent facts cannot become `READY`; nonrequired absence does not block; assessment without an observation is incomplete; capability availability is not inferred during authorship.

### Milestone 3 — Qualify offline and close

Create fresh development fixtures and `experiment:qualify:author-protocol-v3`, add it to CI, run post-GREEN design review, reconcile documentation, validate fully, commit, push, and open a PR.

Files: `evaluations/refactor-design/e5-author-protocol-v3/`, one qualification service under `src/author/`, `package.json`, CI, `AGENTS.md`, this plan, and the ExecPlan index.

Validation:

```text
npm audit --json
npx vitest run test/evaluation-author.test.ts
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
npm run experiment:qualify:author-protocol-v3
git diff --check
```

Acceptance: all local and hosted gates pass, zero external calls occur, no campaign reservation exists, and the handoff explicitly reserves model-backed validation for E22.

## Progress

- [x] Consult THEORY commit `572e963` in full and reconcile RFC 0001 plus ADR 0002.
- [x] Merge PR #8 and create `feat/e21-author-protocol-v3` from `main` at `95d9cd3`.
- [x] Record ADR 0003 and prespecify E21 before product behavior changes.
- [x] Complete Milestone 1: schema-3, trusted context, fingerprints, API, and CLI gates.
- [x] Complete Milestone 2: protected blockers, reserved IDs, evidence paths, and lifecycle precedence.
- [x] Complete Milestone 3: fresh fixtures, six-call local qualifier, CI, design review, and documentation.
- [x] Confirm PR #9 hosted validation green for implementation/documentation commit `3c8d412`.
- [x] Reopen E21 after normative review found gaps in claim authority, evidence coverage, type versioning, freeze, identity, and composed validation.
- [x] Revise ADR 0003 and the living plan before corrective behavior changes.
- [x] Implement atomic trusted claims and complete evidence-path contracts through behavior TDD.
- [x] Enforce frozen composition, discriminated Blueprint types, precise identities, and mandatory composed validation.
- [x] Requalify offline and complete the post-GREEN design review; the six-call local corpus remains `SUPPORTED_FOR_DEVELOPMENT` with zero external calls.
- [x] Restore every final local validation gate after the behavior and design commits.
- [ ] Push the corrected branch and confirm hosted CI.

## Decisions

- Decision: introduce schema-3 rather than place absence strings into schema-2 fields.
  Rationale: absence and supplied values have different semantics and provenance; placeholders would fabricate knowledge.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: separate observation from assessment instead of preserving the schema-1/2 evidence enum.
  Rationale: E19 exposed representation ambiguity, while THEORY chooses evidence by property and ADR 0002 permits conjunctive and alternative evidence paths.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: reserve only `system:authoring-context:` and validate exact blocker correspondence.
  Rationale: the narrow namespace prevents current collisions without unnecessarily reserving unrelated IDs; namespace spelling alone is not authority.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: keep live capability eligibility outside Author lifecycle.
  Rationale: ADR 0002 assigns that decision to a versioned capability preflight; the Author specifies required observation paths without claiming availability.
  Date/Author: 2026-08-13 / planning agent.

- Decision: bundle every schema dependency into the protocol-v3 model-facing candidate schema.
  Rationale: network-disabled authorship cannot resolve repository-local schema URIs; isolated compilation now guards that the packet is self-contained.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: use one atomic trusted claim requirement per system-required claim.
  Rationale: equal claim types do not establish semantic equivalence, and allowing one claim to satisfy several requirements would silently collapse distinct obligations.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: make the path structure the sole representation of evidence kind, source, and capability requirements.
  Rationale: parallel projections created redundant fields that could disagree and expanded E21 toward a preflight implementation.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: scope missing-evidence semantics to an eligible execution.
  Rationale: capability ineligibility, missing eligible evidence, lost qualified capability, and observed violation have different ADR 0002 outcomes; claim mandatory controls acceptance rather than selecting those outcomes.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: give incomplete authorship precedence over legitimate blockers.
  Rationale: `BLOCKED` is meaningful only after the Blueprint completely represents the intended design; coexisting semantic gaps remain `DRAFT`.
  Date/Author: 2026-08-13 / user and planning agent.

## Risks and Mitigations

- Risk: every absent field becomes blocking. Mitigation: require explicit `REQUIRED_ABSENT`; `NOT_REQUIRED` carries rationale and creates no blocker.
- Risk: a model spoofs system blockers. Mitigation: candidate schema rejects reserved IDs globally and composition validates an exact system-derived set.
- Risk: schema-3 claims collected evidence exists. Mitigation: name observations as plans and defer capability eligibility plus collection to later stages.
- Risk: a large schema migration changes historical evidence. Mitigation: v3 is opt-in; v1/v2 schemas, packets, fingerprints, and validators remain unchanged.
- Risk: offline qualification is described as model evidence. Mitigation: use deterministic candidates, zero external calls, and explicit `SUPPORTED_FOR_DEVELOPMENT` limitations.
- Risk: E21 expands indefinitely into future runtime policy. Mitigation: freeze its boundary at representation, composition, identity, validation, and authoring lifecycle; defer capability catalogs, preflight, compiler, execution, aggregation, and decisions.
- Risk: requirement-level prose contradicts path-level evidence. Mitigation: persist evidence kind, source, and capability only in observation and assessment steps under one `observabilityRequirement`.
- Risk: mutable inputs diverge from their fingerprints while a provider invocation is pending. Mitigation: compose and identify exclusively from canonical frozen copies prepared before invocation.
- Risk: protocol descriptor and its digest diverge. Mitigation: packet construction and `protocolDigest` now use one authoritative transformation; post-GREEN design review verified this consolidation.

## Validation Strategy

Use behavior-focused quiet TDD through the public Author API and CLI. Run the full Author suite per cycle and `experiment:verify` at least every two cycles. After all behavior and the public checkpoint are green, run `refactor-design`, reconcile canonical documentation, and execute the complete validation sequence. No live command belongs to E21.

The normative hardening completed 53 focused Author tests and 174 repository tests. `npm audit --json` reported zero vulnerabilities; typecheck, lint, Prettier, build, the provider-free checkpoint, archaeological qualifier, Author/provider/lifecycle/operability qualifiers, and the six-call protocol-v3 qualifier all passed. Every qualifier used deterministic local processes and zero external provider calls. Post-GREEN design review classified the duplicated protocol descriptor as a design risk and consolidated packet construction with `protocolDigest`; the focused suite and provider-free checkpoint remained green afterward.

## Documentation Impact

- ADR 0003: canonical v3 policy.
- This ExecPlan and `docs/execplans/README.md`: living implementation and handoff status.
- `AGENTS.md`: protocol-v3 CLI, offline qualifier, and E22 boundary.
- RFC 0001 and ADR 0002: unchanged because v3 implements their existing lifecycle and capability boundaries.
- E5/E18/E19/E20 reports and plans: immutable historical evidence.
- RFC 0001 and ADR 0002 remain unchanged because the correction preserves their existing claim, evidence, and phase semantics rather than introducing new runtime policy.

## Rollout and Recovery

There is no deployment or provider campaign. V3 is opt-in and can be reverted without affecting v1/v2. If schema-3 reveals a normative contradiction, stop before model-backed validation, record it in this plan, and revise ADR 0003 explicitly rather than weakening historical rules.

## Lessons Learned

- A system-controlled lifecycle is incomplete protection if the model still controls the facts from which lifecycle is derived.
- Capturing an output and interpreting it semantically are compatible stages, not mutually exclusive evidence categories.
- `READY` for authoring does not establish capability eligibility or decision readiness.
- A schema can validate correctly inside the repository yet still be incomplete as a model-facing artifact when its external references are not bundled.
- System blocker derivation and integrity validation must share one canonical mapping; duplicating field-to-ID mappings makes provenance enforcement fragile.
- A mechanically green lifecycle does not prove the Blueprint preserves enough semantics for future consumers.
- `mandatory`, `decisionCritical`, and critical evidence govern different stages and cannot share one convenience boolean.
- Adding projections for every future consumer makes the schema less reliable; one canonical path representation is the stronger boundary.
- Validation of a composed `DRAFT` must protect every system-owned value while permitting the precise incompleteness that caused `DRAFT`; completeness cardinality becomes mandatory before `BLOCKED` or `READY`.
- The exact prompt bytes handed to the Author invoker are a defensible fingerprint boundary; claiming to observe the provider's internal prompt would require separate adapter/provider evidence.
