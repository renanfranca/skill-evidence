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

A subsequent pre-merge review found four remaining integrity gaps in the composed artifact: persisted lifecycle and content identity are not independently recomputed, schema-3 retains a second missing-evidence authority inherited from schema-1, and an observation that directly exhausts its measured property cannot form a path without an assessment. Milestones 5–8 reopen E21 to close only those v3 boundaries.

A final PR #9 review confirmed four additional persistence-boundary defects: provenance digests and fingerprints can diverge from repository-owned inputs, forged trusted references can survive as ordinary claims, a persisted Authoring Context can be semantically invalid, and a reusable capability identifier is incorrectly treated as a globally unique entity ID. Milestones 9–12 reopen E21 again to close these defects without changing schema-3 JSON shape, the CLI, or protocols v1/v2.

A final P2 finding found that semantically correct Authoring Context dependency diagnostics omit the `decisionContext` segment from their JSON Pointers. Milestone 13 briefly reopens E21 to correct only diagnostic routing; Blueprint validity, diagnostic codes, schemas, identities, and every protocol contract remain unchanged.

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

Persisted v3 Blueprints independently revalidate Authoring Context semantics, trusted claim membership, repository-derived provenance, lifecycle, and semantic identity. Exact packet bytes participate in `blueprintId`; reusable capability IDs may appear in several observation or assessment entities, while entity IDs remain globally unique. Composition policy v4 makes every earlier protocol-v3 Blueprint obsolete and preserves v1/v2 byte-identically.

Every invalid dependency in a persisted decision fact reports `AUTHORING_CONTEXT_INTEGRITY` at `/decisionContext/<field>/dependency/claimRequirementId`; population dependency diagnostics continue to point at `/population/target/dependency/claimRequirementId` or `/population/excluded/dependency/claimRequirementId`.

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

### Milestone 4 — Close final referential-integrity and provenance gaps

Reopen E21 before merge after exhaustive review found three observable gaps: an evidence requirement can omit or inconsistently pair its claim and contract, an assessment can consume no observation, and `campaignId` can be reread from mutable input after provider invocation. Make the composed validator enforce the same semantic integrity expected at the persistence boundary.

Files: schema-3, `src/blueprint/evaluation-blueprint.ts`, `src/author/evaluation-author.ts`, and the existing behavior suite.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run typecheck
npm run lint
npm run experiment:verify
```

Acceptance: incomplete or inconsistent claim → contract → evidence chains cannot reach `READY`; every assessment consumes at least one observation from its path; all material `AuthorInput` provenance is captured before invocation; and composed validation rejects persisted semantic tampering.

### Milestone 5 — Register the normative reopening

Prespecify the four findings before changing product behavior. Update this living plan, ADR 0003, and the ExecPlan index while leaving RFC 0001 and ADR 0002 unchanged.

Files: this plan, `docs/decisions/0003-trusted-authoring-context-and-evidence-paths.md`, and `docs/execplans/README.md`.

Acceptance: the repository records the reopened state, the single missing-evidence authority, direct-only paths, and the lifecycle/content-identity integrity boundary before code changes.

### Milestone 6 — Protect persisted lifecycle and content identity

Share one lifecycle derivation and one `blueprintId` derivation between protocol-v3 composition and composed validation. Recompute completeness for persisted Blueprints without treating a correctly labelled `DRAFT` as invalid.

Files: `src/blueprint/evaluation-blueprint.ts`, `src/author/evaluation-author.ts`, and `test/evaluation-author.test.ts`.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: lifecycle tampering emits `LIFECYCLE_INTEGRITY`; semantic content tampering with a stale ID emits `BLUEPRINT_ID_INTEGRITY`; a genuinely incomplete `DRAFT` and an unmodified composed Blueprint remain valid artifacts.

### Milestone 7 — Unify missing-evidence authority and permit direct-only paths

Replace the inherited protocol-v3 policies contract with one that omits `missingEvidence`. Keep `assessments` required but permit an empty array, while every assessment that exists must consume an observation from the same path. Update model-facing instructions and increment the composition policy so v3 identities change automatically.

Files: `schemas/evaluation-blueprint.schema-3.json`, v3 types and validators, `src/author/instructions.ts`, ADR 0003, and the existing behavior suite.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: direct-only evidence can reach `READY`; a present assessment without valid inputs remains incomplete; a path without observations remains structurally invalid; protocol-v1/v2 identities remain unchanged.

### Milestone 8 — Requalify offline and close again

Add one fresh direct-only case to the deterministic protocol-v3 corpus, update operational documentation, pass the public checkpoint, run the post-GREEN design review, and execute the complete final validation sequence.

Files: `evaluations/refactor-design/e5-author-protocol-v3/`, the protocol-v3 qualifier, `AGENTS.md`, ADR 0003, this plan, and the ExecPlan index.

Acceptance: the qualifier performs seven local processes, reports `SUPPORTED_FOR_DEVELOPMENT`, makes zero external calls, and creates no model-backed campaign artifact.

### Milestone 9 — Register the final normative reopening

Prespecify the four confirmed PR #9 findings before changing product behavior. Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full, update ADR 0003, mark this plan and its index as reopened, and leave RFC 0001 plus ADR 0002 unchanged.

Files: this plan, `docs/decisions/0003-trusted-authoring-context-and-evidence-paths.md`, and `docs/execplans/README.md`.

Acceptance: the repository records persisted-context integrity, trusted-reference membership, derivable provenance, packet-bound identity, composition policy v4, and reusable capability semantics before behavior changes.

### Milestone 10 — Validate persisted context and trusted claims

Extract reusable semantic Authoring Context validation while preserving `isAuthoringContext` as its boolean wrapper, then apply the same validation at composed persistence. Reject nonexistent default scopes, population scopes, and dependencies. Reject every claim whose `claimRequirementId` is absent from the persisted context rather than converting it into an additional claim or lifecycle downgrade.

Files: `src/author/authoring-context.ts`, `src/author/evaluation-author.ts`, `src/blueprint/evaluation-blueprint.ts`, `src/author/author-protocol-v3.ts`, and `test/evaluation-author.test.ts`.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: a recomputed-ID Blueprint with an invalid persisted scope emits `AUTHORING_CONTEXT_INTEGRITY`; a forged claim requirement emits `UNKNOWN_SYSTEM_REFERENCE`; both fail composed validation even when their other derived fields are coherent.

### Milestone 11 — Make provenance and packet-bound identity derivable

Centralize the protocol-v3 descriptor, composition policy, and fingerprint derivations. Recompute the instructions, THEORY, Blueprint schemas, candidate schema, protocol, and composition-policy digests plus condition, instrument, and Authoring Context fingerprints during composed validation. Add `packetFingerprint` to the semantic identity input and increment the v3 composition policy to version 4.

Files: `src/author/author-protocol-v3.ts`, `src/author/evaluation-author.ts`, `src/blueprint/evaluation-blueprint.ts`, and `test/evaluation-author.test.ts`.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
```

Acceptance: divergent derivable provenance emits `AUTHOR_PROVENANCE_INTEGRITY`; changing only `packetFingerprint` without recomputing identity emits `BLUEPRINT_ID_INTEGRITY`; `campaignId` and `observedModel` remain execution provenance outside semantic identity.

### Milestone 12 — Preserve reusable capabilities and requalify offline

Exclude `capability.id` from global entity-ID uniqueness while retaining duplicate detection for claims, contracts, requirements, paths, observations, and assessments. Add one deterministic `READY` qualifier case that reuses a capability across two observations, reconcile operational documentation, run the post-GREEN design review, and complete the full offline validation sequence.

Files: protocol-v3 validators, `test/evaluation-author.test.ts`, `src/author/qualify-author-protocol-v3.ts`, `evaluations/refactor-design/e5-author-protocol-v3/`, `AGENTS.md`, ADR 0003, this plan, and the ExecPlan index.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: capability reuse remains `READY`; a duplicate observation ID remains `DRAFT`; the qualifier performs eight local processes, reports `SUPPORTED_FOR_DEVELOPMENT`, makes zero external calls, and creates no campaign artifact.

### Milestone 13 — Correct Authoring Context diagnostic paths

Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full and prespecify the P2 finding before changing code. Add one behavior-focused regression that mutates each of the six `decisionContext` facts with an unknown claim-requirement dependency and distinguishes the complete JSON Pointer from the historically truncated pointer. Construct semantic-validation paths as complete JSON Pointers and append the dependency suffix directly. Do not change validation semantics, diagnostic codes, schemas, identities, lifecycle, fingerprints, or protocol compatibility.

Files: `src/author/authoring-context.ts`, `test/evaluation-author.test.ts`, this plan, and the ExecPlan index.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: all six invalid decision dependencies emit `AUTHORING_CONTEXT_INTEGRITY` at `/decisionContext/<field>/dependency/claimRequirementId`; no truncated `/<field>/dependency/claimRequirementId` is emitted; 63 focused tests and 184 repository tests pass; the protocol-v3 qualifier remains `SUPPORTED_FOR_DEVELOPMENT` with eight local calls and zero external calls; no campaign artifact or reservation is created.

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
- [x] Push the corrected branch and confirm hosted CI run `31757170973` green at commit `46a1d70`.
- [x] Reopen E21 after final review found evidence-chain, assessment-cardinality, composed-validation, and campaign-provenance gaps.
- [x] Complete Milestone 4 through behavior TDD: evidence endpoints and pairs, assessment inputs, frozen campaign provenance, and composed semantic validation.
- [x] Repeat the post-GREEN design review and retain one shared semantic validator for candidate and composed boundaries.
- [x] Restore every final local gate with 54 focused Author tests, 175 repository tests, zero audit findings, and all deterministic qualifiers green.
- [x] Push Milestone 4 and confirm hosted CI run `31760681349` green at commit `bb8c2fa`.
- [x] Reopen E21 after pre-merge review found lifecycle, content-identity, missing-evidence-authority, and direct-only representation gaps.
- [x] Prespecify Milestones 5–8 in ADR 0003, this living plan, and the ExecPlan index before code changes.
- [x] Complete shared lifecycle and content-identity integrity through behavior TDD; 56 focused tests and the provider-free checkpoint pass.
- [x] Complete single-authority missing-evidence semantics and direct-only paths through behavior TDD; 58 focused tests and the provider-free checkpoint pass.
- [x] Requalify protocol v3 with seven local processes and pass the public checkpoint with zero external calls.
- [x] Complete documentation reconciliation and final validation after a post-GREEN design review found no justified behavior-preserving refactor.
- [x] Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full for the final PR #9 reopening.
- [x] Prespecify Milestones 9–12 in ADR 0003, this living plan, and the ExecPlan index before code changes.
- [x] Complete persisted Authoring Context and trusted-reference integrity through behavior TDD; 60 focused tests and the provider-free checkpoint pass.
- [x] Complete derivable provenance, packet-bound identity, and reusable capability semantics through behavior TDD; 62 focused tests and the provider-free checkpoint pass.
- [x] Requalify protocol v3 with eight local processes and pass the public checkpoint with zero external calls.
- [x] Complete post-GREEN design review, documentation reconciliation, and final offline validation with 62 focused tests, 183 repository tests, and every prescribed gate green.
- [x] Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full and prespecify Milestone 13 before code changes.
- [x] Demonstrate the truncated `decisionContext` dependency paths through one behavior-focused RED test, then restore GREEN without changing validation semantics; 63 focused tests and the provider-free checkpoint pass.
- [x] Complete the scoped post-GREEN design review; explicit complete pointers remove the fragile dotted-label transformation without introducing another justified refactor.
- [x] Complete final validation and documentation reconciliation with 63 focused tests, 184 repository tests, every prescribed gate green, and no new campaign artifact or reservation.

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

- Decision: require every evidence requirement to name at least one claim and one contract, with pairwise claim/contract consistency.
  Rationale: separate reciprocal references do not establish the RFC chain when a requirement links a claim to a contract that does not declare that claim.
  Date/Author: 2026-08-13 / user and implementation agent.

- Decision: freeze `campaignId` with the other prepared invocation inputs.
  Rationale: provenance must not depend on a mutable request object after the provider await boundary.
  Date/Author: 2026-08-13 / user and implementation agent.

- Decision: recompute protocol-v3 lifecycle and content identity at the composed persistence boundary.
  Rationale: system ownership is not preserved when a persisted lifecycle or ID is trusted merely because its shape is valid.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: make `evidencePlan[].missingEvidenceSemantics` the only protocol-v3 missing-evidence authority.
  Rationale: retaining `policies.missingEvidence` creates two normative values that can disagree; protocol-v1/v2 retain their historical contract.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: permit direct-only paths with an explicit empty `assessments` array.
  Rationale: direct observation can exhaust the property being measured; an assessment is required only when interpretation remains necessary.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: treat persisted Authoring Context and every trusted claim reference as independently validated system input.
  Rationale: recomputing lifecycle or identity cannot legitimize a context with dangling scopes or a claim that cites a requirement the trusted context never declared.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: derive protocol-v3 provenance from repository-owned descriptor, schemas, instructions, THEORY, and composition policy at both composition and persistence boundaries.
  Rationale: storing fingerprints without recomputation protects neither reproducibility nor the exact instrument that authored the Blueprint.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: include `packetFingerprint` but exclude `campaignId` and `observedModel` from protocol-v3 semantic identity.
  Rationale: exact packet bytes are derivable Author input, while campaign and observed-model values are execution provenance that an isolated Blueprint cannot authenticate.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: make capability IDs reusable references rather than globally unique entity IDs.
  Rationale: several observation or assessment entities can legitimately require the same named capability; only entity identities must remain globally unique.
  Date/Author: 2026-08-14 / user and implementation agent.

- Decision: represent semantic-validation locations as complete JSON Pointers before appending nested dependency segments.
  Rationale: deriving a pointer from dotted labels loses the enclosing `decisionContext` object and makes otherwise correct diagnostics point at nonexistent top-level fields.
  Date/Author: 2026-08-14 / user and implementation agent.

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
- Risk: locally reciprocal evidence references conceal an invalid end-to-end chain. Mitigation: enforce nonempty endpoints, contract/claim pair consistency, and the same semantic checks at the composed boundary.
- Risk: an assessment with no inputs appears valid because another assessment covers the path observations. Mitigation: require at least one in-path `observationId` for every assessment.
- Risk: mutable run provenance changes while the provider is pending. Mitigation: prepare and freeze `campaignId` before invocation and never reread it from `AuthorInput` afterward.
- Risk: a legitimate incomplete `DRAFT` is rejected while verifying lifecycle. Mitigation: derive completeness separately from integrity and invalidate only a mismatch between persisted and derived lifecycle.
- Risk: composition and validation diverge again. Mitigation: use the same lifecycle and content-identity functions at both boundaries.
- Risk: direct-only is used where interpretation is necessary. Mitigation: protocol instructions constrain it to observations that exhaust the measured property; later qualification and freeze remain responsible for judging semantic adequacy.
- Risk: new v3 identities invalidate pre-merge artifacts. Mitigation: increment the composition policy and regenerate opt-in v3 artifacts; preserve protocol-v1/v2 byte for byte.
- Risk: a structurally valid persisted context names nonexistent scopes or dependencies. Mitigation: expose one semantic validator and apply it both before invocation and at composed persistence.
- Risk: a forged trusted requirement becomes an ordinary noncritical claim. Mitigation: reject every non-null `claimRequirementId` absent from the persisted context with `UNKNOWN_SYSTEM_REFERENCE`.
- Risk: copied or edited provenance values remain internally self-consistent but name the wrong instrument. Mitigation: independently recompute every repository-derived digest and compound fingerprint and emit `AUTHOR_PROVENANCE_INTEGRITY` on divergence.
- Risk: adding packet identity accidentally changes historical protocols or conflates unverifiable runtime metadata. Mitigation: change only protocol-v3 identity, keep campaign and observed-model provenance outside it, and retain exact v1/v2 regression assertions.
- Risk: relaxing capability uniqueness masks duplicate evidence entities. Mitigation: remove only capability IDs from the global entity set and keep observation, assessment, path, claim, contract, and requirement duplicate checks.
- Risk: correcting diagnostic paths accidentally changes validation outcomes or public contracts. Mitigation: assert only `BlueprintDiagnostic.path`, leave codes and validity unchanged, and limit production changes to explicit pointer construction.

## Validation Strategy

Use behavior-focused quiet TDD through the public Author API and CLI. Run the full Author suite per cycle and `experiment:verify` at least every two cycles. After all behavior and the public checkpoint are green, run `refactor-design`, reconcile canonical documentation, and execute the complete validation sequence. No live command belongs to E21.

The previous closure completed 54 focused Author tests and 175 repository tests with every local gate green, but that evidence is only the baseline for Milestones 5–8. Final validation on 2026-08-14 passed in the prescribed order: `npm audit --json` reported zero vulnerabilities; 58 focused Author tests and the complete repository suite passed; typecheck, lint, Prettier, build, the provider-free checkpoint, archaeological qualifier, Author qualifier, provider qualifier, lifecycle qualifier, operability qualifier, the seven-process protocol-v3 qualifier, and `git diff --check` were all green. The protocol-v3 qualifier reported `SUPPORTED_FOR_DEVELOPMENT`, seven local provider calls, and zero external calls. Post-GREEN design review classified the shared lifecycle/identity derivations as cohesive policy and found no concrete temporal-coupling, mutable-state, fragile-mapping, or duplicated-transformation risk that justified another refactor. That evidence is now only the baseline for Milestones 9–12; the reopened work must repeat the specified offline sequence and supersede it with an eight-process protocol-v3 qualification.

Final Milestones 9–12 validation on 2026-08-14 passed in the prescribed order. `npm audit --json` reported zero vulnerabilities; 62 focused Author tests and 183 repository tests passed; typecheck, lint, Prettier, build, the provider-free checkpoint, archaeological qualifier, Author qualifier, provider qualifier, lifecycle qualifier, operability qualifier, the eight-process protocol-v3 qualifier, and `git diff --check` were all green. The protocol-v3 qualifier reported `SUPPORTED_FOR_DEVELOPMENT`, eight local provider calls, zero external calls, and the reusable-capability case as `READY`. Post-GREEN design review classified two design risks and removed both: the historical digest routine can now accept only protocols v1/v2, and entity-ID collection explicitly excludes reusable capabilities. Focused tests and the provider-free public checkpoint remained green after the refactor. No model-backed campaign, reservation, or repository-local run artifact was created.

That evidence is the baseline for Milestone 13. The reopened work must first prove the incorrect observable pointer through RED, restore GREEN with a routing-only correction, repeat the provider-free public checkpoint and post-GREEN design review, then supersede the baseline with the complete prescribed offline sequence.

Milestone 13 validation on 2026-08-14 passed in the prescribed order. `npm audit --json` reported zero vulnerabilities; 63 focused Author tests and 184 repository tests passed; typecheck, lint, Prettier, build, the provider-free checkpoint, archaeological qualifier, Author qualifier, provider qualifier, lifecycle qualifier, operability qualifier, the eight-process protocol-v3 qualifier, and `git diff --check` were all green. The protocol-v3 qualifier remained `SUPPORTED_FOR_DEVELOPMENT` with eight local provider calls and zero external calls. The repository-local artifact file set remained unchanged, and no model-backed campaign or reservation was created. Post-GREEN design review found no further refactor justified beyond replacing the dotted-label transformation with complete JSON Pointers.

## Documentation Impact

- ADR 0003: records nonempty evidence endpoints, pairwise chain consistency, lifecycle/content-identity verification, direct-only paths, one protocol-v3 missing-evidence authority, persisted-context validation, derivable provenance, packet-bound identity, and reusable capabilities.
- This ExecPlan and `docs/execplans/README.md`: living implementation and handoff status.
- `AGENTS.md`: protocol-v3 CLI, offline qualifier, and E22 boundary.
- RFC 0001 and ADR 0002: unchanged because v3 implements their existing lifecycle and capability boundaries.
- E5/E18/E19/E20 reports and plans: immutable historical evidence.
- RFC 0001 and ADR 0002 remain unchanged because the correction preserves their existing claim, evidence, and phase semantics rather than introducing new runtime policy.
- ADR 0003, RFC 0001, ADR 0002, schemas, and `AGENTS.md` remain unchanged for Milestone 13 because Authoring Context validation semantics and operational counts are already correct; only diagnostic routing changes.

## Rollout and Recovery

There is no deployment or provider campaign. V3 is opt-in and can be reverted without affecting v1/v2. If schema-3 reveals a normative contradiction, stop before model-backed validation, record it in this plan, and revise ADR 0003 explicitly rather than weakening historical rules.

Protocol-v3 Blueprints produced before composition policy v4 are stale because packet identity and independently derivable provenance changed. Regenerate them before any future E22 preparation. Protocol-v1/v2 artifacts require no migration.

Milestone 13 requires no migration: valid Blueprints are byte-identical, while invalid persisted artifacts receive a corrected diagnostic location.

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
- Bidirectional claim↔requirement and contract↔requirement checks are insufficient without validating the claim↔contract relationship represented by the same requirement.
- Union coverage of observations does not prove that each conjunctive assessment has an interpretable input.
- Freezing model-facing inputs is not enough when run provenance is also persisted after an asynchronous boundary.
- A system-derived value is not protected merely because only the compositor normally writes it; the persistence validator must independently derive and compare it.
- Inheriting an older schema fragment can silently retain a second normative authority even when the new protocol has introduced a more precise field.
- Lifecycle integrity needs completeness diagnostics even for persisted `DRAFT` artifacts, but those diagnostics describe why the artifact is `DRAFT`; they do not by themselves make a correctly labelled draft invalid.
- Requiring every direct observation to appear in an assessment accidentally made assessment mandatory; the correct cardinality is zero or more assessments, with at least one in-path observation reference for each assessment that exists.
- Content-derived lifecycle and identity need independent checks at the persistence boundary; constraining normal composition alone does not detect later artifact mutation.
- The direct-only qualifier case exercised both schema cardinality and lifecycle derivation without adding a new evidence category or weakening assessment input integrity.
- Persisted provenance fields are only integrity evidence when the validator can independently rederive them from repository-owned inputs; shape validation and mutually consistent stored hashes are insufficient.
- Exact packet bytes belong in protocol-v3 content identity even though execution labels and observed model metadata remain unverifiable provenance outside that identity.
- Capability identifiers and entity identifiers occupy different domains: reusing a requirement capability is legitimate, while reusing an observation or assessment identity remains incomplete authorship.
- Diagnostic paths are public locations, not display labels; constructing complete JSON Pointers at the source prevents enclosing-object context from being lost during later string transformations.
