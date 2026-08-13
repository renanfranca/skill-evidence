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

### 2. System-owned unresolved requirements

`system:authoring-context:` is reserved for system-generated blocker IDs. A protocol-v3 candidate using that prefix in any ID is structurally invalid. Author requirements and system requirements have distinct origins in the composed Blueprint.

Every `REQUIRED_ABSENT` fact has exactly one canonical, blocking system requirement. `SUPPLIED` and `NOT_REQUIRED` facts have none. Namespace spelling alone does not confer authority: composed validation checks the exact correspondence between context facts and system requirements.

### 3. Evidence paths

Protocol v3 separates observation from assessment:

- an observation plan names an independently inspectable output, state, action, constraint, temporal relation, or provenance fact and the capability needed to capture it;
- an assessment plan names the `MECHANICAL`, `SEMANTIC`, or `JUDGMENT` procedure applied to observations;
- observations in one path are conjunctive;
- distinct paths are alternatives.

A required path must name at least one observation, but the observation need not already exist during authorship. A complete plan does not assert that its required capability is currently available or decision-eligible. ADR 0002's capability preflight makes that later determination.

The schema-1/2 `MANDATORY_DIRECT_EVIDENCE_MISSING` rule remains historical behavior. Protocol v3 does not promote that representation-specific rule to a universal interpretation of THEORY.

### 4. Versioning and identity

Protocol v3 uses Evaluation Blueprint schema-3. Protocols v1 and v2, their schemas, packets, fingerprints, and historical evidence remain unchanged.

The Author condition fingerprint continues to identify model, reasoning, instructions, protocol, Blueprint schema, and THEORY. The Authoring Context receives a separate fingerprint. Both identities, plus the snapshot and composed candidate, contribute to `blueprintId`.

## Consequences

- A model cannot promote known missing decision context by changing a blocker boolean.
- A semantic assessment of captured output is representable without pretending that capture and interpretation are competing evidence classes.
- Blueprint `READY` remains distinct from decision-run eligibility.
- Protocol-v3 qualification must cover context composition, namespace protection, evidence-path semantics, and historical compatibility.
- Model-backed qualification remains out of band and requires fresh cases and separate authorization.

