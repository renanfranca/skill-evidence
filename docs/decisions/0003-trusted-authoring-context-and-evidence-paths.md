# ADR 0003: Trusted Authoring Context and Evidence Paths

- Date: 2026-08-13
- Status: accepted
- Complements: [RFC 0001](0001-theory-first-promptfoo-foundation.md) and [ADR 0002](0002-bounded-evaluation-and-out-of-band-instrument-evolution.md)

## Context

Evaluation Author protocol v2 left two material decisions encoded in one model response. First, the model chose whether missing decision information was blocking. Second, the Blueprint `evidenceType` enum treated direct observation, semantic assessment, and qualitative judgment as if they were mutually exclusive evidence sources.

Development campaigns E19 and E20 exposed different consequences. Luna/max planned a semantic assessment for a captured response and failed the schema-1/2 validator's separate mandatory-`DIRECT` rule. Terra/xhigh identified absent decision context but marked every unresolved requirement nonblocking, indirectly producing `READY`. Neither result establishes a general model limitation; together they identify ambiguity in the instrument.

RFC 0001 says that decision information must not be invented, that field requirements depend on the intended claims, and that `READY` is relative to the permitted stage. ADR 0002 separately assigns live capability eligibility to a later preflight and allows conjunctions and alternative evidence paths. A new protocol must preserve those distinctions.

## Decision

### 1. Trusted authoring context

Protocol v3 receives a system-trusted, fingerprinted Authoring Context. Every decision-context and evaluation-population fact is explicitly one of:

- `SUPPLIED`, with a value and source;
- `REQUIRED_ABSENT`, with status, reason, evidence needed, and source;
- `NOT_REQUIRED`, with a rationale and source.

The system, not the model, composes these facts into the Blueprint. Only `REQUIRED_ABSENT` creates a blocking unresolved requirement. Missing information is not automatically blocking, because necessity depends on the declared decision and claims.

The persistence boundary reapplies the same semantic Authoring Context validation used before invocation. `defaultScopeId`, every trusted claim population scope, and every missing-fact dependency must resolve to entities declared by that context. A context that is merely structurally valid but contains a dangling scope or dependency is invalid and produces `AUTHORING_CONTEXT_INTEGRITY` in composed validation.

### 2. System-owned unresolved requirements

`system:authoring-context:` is reserved for system-generated blocker IDs. A protocol-v3 candidate using that prefix in any ID is structurally invalid. Author requirements and system requirements have distinct origins in the composed Blueprint.

Every `REQUIRED_ABSENT` fact has exactly one canonical, blocking system requirement. `SUPPLIED` and `NOT_REQUIRED` facts have none. Namespace spelling alone does not confer authority: composed validation checks the exact correspondence between context facts and system requirements.

### 3. Evidence paths

Protocol v3 separates observation from assessment:

- an observation plan names an independently inspectable output, state, action, constraint, temporal relation, or provenance fact and the capability needed to capture it;
- an assessment plan names the `STRUCTURED_DETERMINISTIC_INFERENCE`, `SEMANTIC`, or `JUDGMENT` procedure applied to observations;
- observations in one path are conjunctive;
- distinct paths are alternatives.

A required path must name at least one observation, but the observation need not already exist during authorship. A complete plan does not assert that its required capability is currently available or decision-eligible. ADR 0002's capability preflight makes that later determination.

The schema-1/2 `MANDATORY_DIRECT_EVIDENCE_MISSING` rule remains historical behavior. Protocol v3 does not promote that representation-specific rule to a universal interpretation of THEORY.

Protocol v3 represents each evidence requirement through one `observabilityRequirement` whose paths are alternatives. Every observation and assessment inside the selected path is conjunctive. Observations declare the capability and evidence origin required to capture a directly inspectable fact. Assessments declare the capability, assessment origin, and observation IDs required to interpret those facts. This path structure is the only source of evidence-kind, source, and observability semantics; protocol v3 does not persist parallel prose or derived mirrors that could disagree with it.

Every evidence requirement names at least one claim and one contract. Every named contract declares every claim paired with it by that requirement, and claims, contracts, and requirements preserve reciprocal references. A path may contain no assessments when its direct observations exhaust the measured property. Every assessment that is present names at least one observation from its own path. These cardinality and consistency rules make the RFC chain `claim → contract → required evidence → path` deterministic for later consumers.

The capability preflight defined by ADR 0002 remains a later responsibility. A path is eligible only when every observation and assessment capability in that path is eligible for its declared purpose. Protocol v3 records that requirement without claiming that any capability is available.

`evidencePlan[].missingEvidenceSemantics` is the sole protocol-v3 authority for evidence that remains missing or ambiguous after an eligible path was selected for execution, which yields `INCONCLUSIVE`. Protocol v3 does not persist the schema-1/2 global `policies.missingEvidence` mirror. Missing-evidence semantics do not encode capability ineligibility. Before execution, no eligible path for a decision-critical claim yields preflight `BLOCKED`; the same condition for a non-critical claim yields `NOT_EVALUATED`. Failure to preserve a capability declared eligible invalidates the run, while a directly observed contract violation is `FAIL`. Claim `mandatory` governs favorable acceptance and does not select among these phase-specific outcomes.

### 4. Trusted claim requirements

Decision criticality, mandatory acceptance, and evidence criticality are distinct. Protocol v3 receives atomic, system-trusted claim requirements. Each trusted requirement corresponds to exactly one Author claim, and each Author claim may satisfy at most one trusted requirement. Equal claim types do not authorize consolidation because claims of one type may express different obligations, populations, conditions, or evidence needs.

The system derives `mandatory`, `decisionCritical`, population scopes, and initial `NOT_EVALUATED` status from the trusted requirement. Additional claims discovered by the Author are permitted but remain non-mandatory and non-decision-critical. The Author still proposes evidence criticality; qualification and a later freeze must review that proposal before decision use.

System-owned missing facts name either a decision-wide dependency or one trusted claim requirement. Composition preserves that dependency and derives affected claim IDs when the corresponding claim exists. Missing or multiply satisfied trusted requirements are incomplete authorship, not authority for the model to weaken the decision.

Every non-null Author claim `claimRequirementId` must name a trusted claim requirement in the persisted Authoring Context. An unknown value is a forged trusted reference and remains `UNKNOWN_SYSTEM_REFERENCE`; it is rejected unconditionally rather than converted into an additional Author-discovered claim or downgraded to `DRAFT`. Other persisted context-semantic failures use `AUTHORING_CONTEXT_INTEGRITY`.

### 5. Lifecycle precedence

Protocol v3 applies lifecycle precedence in this order:

1. invalid JSON, candidate structure, or system composition produces run `ERROR` without a Blueprint;
2. structurally valid but incomplete authorship produces `DRAFT`, even when a legitimate blocker is also present;
3. a complete Blueprint with at least one blocking unresolved requirement produces `BLOCKED`;
4. a complete Blueprint without blockers produces `READY`.

`READY` remains limited to development authorship and does not establish capability eligibility, Author qualification, or decision eligibility.

The composed persistence boundary independently recalculates lifecycle from semantic completeness and blockers. A persisted state that differs from the derived state is invalid. It also recalculates `blueprintId` from frozen semantic content, instrument, Authoring Context, and snapshot identities; this is deterministic content identity, not a claim of external authenticity.

### 6. Versioning and identity

Protocol v3 uses Evaluation Blueprint schema-3. Protocols v1 and v2, their schemas, packets, fingerprints, and historical evidence remain unchanged.

The protocol-v3 condition fingerprint identifies the reusable Author request contract: requested model, reasoning, instructions, THEORY, protocol descriptor, candidate schema, and Authoring Context schema. It excludes run-specific context values and skill content. The Authoring Context receives a separate fingerprint. The packet fingerprint identifies the exact UTF-8 prompt string handed to the Author invoker; it does not claim to observe transformations inside Promptfoo, the Codex SDK, or the provider. A separate Author instrument fingerprint adds the final Blueprint schema and versioned composition policy. The instrument, context, snapshot, and composed semantic content contribute to `blueprintId`.

The protocol-v3 descriptor, composition policy, and all compound fingerprint derivations have one canonical implementation shared by composition and validation. The persistence boundary recomputes current digests for instructions, THEORY, every Blueprint schema, the candidate schema, protocol descriptor, and composition policy, then recomputes `conditionFingerprint`, `authorInstrumentFingerprint`, and `authoringContextFingerprint`. Any mismatch produces `AUTHOR_PROVENANCE_INTEGRITY`.

Composition policy v4 adds `packetFingerprint` to `blueprintId`, binding semantic identity to the exact model-facing packet. Earlier protocol-v3 Blueprints are obsolete and must be regenerated. `campaignId` and `observedModel` remain outside semantic identity because they are execution provenance and cannot be verified from an isolated Blueprint. Protocol-v1/v2 identity remains byte-identical.

### 7. Identifier domains

`capability.id` identifies a reusable required capability, not the observation or assessment entity that references it. The same capability ID may therefore appear in several observations or assessments. Claims, contracts, unresolved requirements, observability requirements, paths, observations, and assessments remain globally unique entities; duplicate IDs in those domains continue to make authorship incomplete.

## Consequences

- A model cannot promote known missing decision context by changing a blocker boolean.
- A semantic assessment of captured output is representable without pretending that capture and interpretation are competing evidence classes.
- Blueprint `READY` remains distinct from decision-run eligibility.
- Protocol-v3 qualification must cover context composition, namespace protection, evidence-path semantics, and historical compatibility.
- Composed validation distinguishes provenance divergence (`AUTHOR_PROVENANCE_INTEGRITY`), persisted context divergence (`AUTHORING_CONTEXT_INTEGRITY`), unknown trusted references (`UNKNOWN_SYSTEM_REFERENCE`), and packet-bound identity divergence (`BLUEPRINT_ID_INTEGRITY`).
- A valid `READY` Blueprint may reuse one capability across several evidence entities without weakening global entity-ID integrity.
- Model-backed qualification remains out of band and requires fresh cases and separate authorization.
