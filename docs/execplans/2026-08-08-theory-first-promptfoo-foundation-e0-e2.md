# ExecPlan 1 — Harden Theory First Promptfoo Foundation E0–E2 before live execution

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted: [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Published foundation: `b1d087898e18c3929d024e47bd52ef2331781cae`
- Consistency-patch base: `08b26f85ec2c2da048924e4a1ee8493b2ae1999e`
- Status: blocked before E1: Promptfoo 0.122.0 cannot retrieve the deterministic trace under the exact frozen persistence condition.

This ExecPlan is a living document. It is the authorized defensive increment to the E0–E2 foundation published in `b1d0878`. Keep its progress, decisions, risks, validation evidence, and lessons current. It never authorizes E3, product architecture, credentials, live model calls, commit, push, or publication.

## Purpose / Big Picture

The offline instrument must not turn its own defects into conclusions about Promptfoo or the Codex SDK. This increment proves, before E1 or E2 can spend a provider invocation, that the frozen condition is scientific and immutable, reservations are exclusive, the E2 canary is mechanically valid, and Promptfoo summaries and traces are obtained and sanitized before temporary storage is removed. Negative evidence is only valid where the observation process could have detected the signal.

Safety boundary: this task is limited to authorized, defensive maintenance of this repository. It does not provide offensive guidance or bypass safeguards.

## Scope

Included: scientific-configuration provenance; campaign containment; exclusive freezes and reservations; `CODEX_HOME` directory identity; real Promptfoo 0.122.0 local tracing qualification; mechanical canary assessment; signal-specific capability classification; documentation and offline gates. The existing E1 → G1 → E2 baseline → E2 deep → G2 sequence remains future work requiring new authorization.

Excluded: account continuity claims from directory identity, model/reasoning or skill-causality inference, zero-egress claims, private Promptfoo imports, production adapters, App Server work, E3, live calls, committing, pushing, and publishing.

## Definitions

**Scientific configuration** is typed configuration constructed for an invocation, projected with typed temporary-path placeholders, then canonicalized and fingerprinted. **Opaque evidence** is Promptfoo/Codex-returned metadata, summaries, traces, and errors; it is defensively sanitized before persistence. **CODEX_HOME directory identity** is a non-path identity derived from repeatable stable metadata of the canonical directory; it detects directory replacement, not contents or authenticated-principal continuity. An **exclusive freeze** and a **started invocation reservation** are files created once with exclusive creation. A **valid canary** has provider success, the literal response, and every byte-exact required filesystem effect. An invalid canary cannot support negative event-observability conclusions, but independent positive transport/linkage evidence remains reportable.

## Existing Context

`b1d0878` is a strict TypeScript/ESM direct Node-API foundation. Its public offline checkpoint is green with zero Promptfoo imports, but pre-live review found mutable freezes, non-atomic budgets, path-collapsed directory provenance, configuration drift, cleanup-before-trace collection, shallow capability detection, and response-only E2 success. Promptfoo 0.122.0 declares and exposes `Eval.getTraces()`, but typed/runtime presence alone does not make it stable or operational.

## Desired End State

A new clean checkout can freeze exactly one typed condition tied to exact dependencies, commit, a clean worktree, and repeatable directory identity. Campaign paths cannot escape their roots. Promptfoo artifacts are collected in-memory inside isolation, sanitized and persisted before cleanup, and remain readable after cleanup. The real local Promptfoo trace lifecycle has a conservative runtime/type/documentation/integration qualification. E2 provider completion, canary validity, and trace facts are separate, and every capability row is backed by its own signal. `experiment:verify` imports no provider; `experiment:verify:tracing` uses only a local deterministic provider and loopback receiver, without claiming observed absence of egress.

## Milestones

### Milestone 1 — Scientific configuration

Refactor `experiments/configuration.ts`, `conditions.ts`, `freeze.ts`, and `redaction.ts` so one typed builder supplies the actual invocation and its directly fingerprinted scientific projection. Project working paths and external home to typed placeholders without using opaque sanitization; include exact provider configuration, Promptfoo options, receiver configuration, prompts, versions, and non-secret environment decisions. Preserve requested/observed known metadata and numeric token counts in opaque reports while redacting credentials, raw payloads, reasoning text, and real paths. Behavior tests must prove reasoning and deep OTEL changes change the digest and raw reasoning remains absent.

Validation: `npm test`, `npm run experiment:verify`.

### Milestone 2 — Contained, immutable campaigns

Validate campaign IDs (`[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]` or one lowercase alphanumeric character), resolve every campaign destination beneath its declared root, and require a clean worktree before freeze and live commands. Canonicalize/verify the supplied directory and bind a repeatable non-path metadata identity; explicitly record its account-continuity limitation. Create restrictive `freeze.json` exclusively and preserve it byte-for-byte when creation is repeated. Replace ledger authority with one exclusive reservation per condition and produce only a deterministic ledger projection. Tests must cover unsafe IDs/paths, dirty checkout, identity switching, freeze immutability, concurrent same-condition reservation, and three distinct reservations.

Validation: `npm test`, `npm run experiment:verify`.

### Milestone 3 — Real trace lifecycle

Use a structural evaluation result with `toEvaluateSummary()` and optional `getTraces()`. Inside `withPromptfooIsolation()`, run evaluation, obtain the summary and traces, sanitize opaque evidence, return it in memory, then persist it before cleanup and prove it remains readable. Record runtime, pinned-type, stable-documentation, and integration facts separately; cap `getTraces()` at `NATIVE_EXPERIMENTAL` without an established stable reference. Add `experiment:verify:tracing`, an integration check using installed Promptfoo, real `evaluate()`/`getTraces()`, deterministic local provider, real loopback receiver, correlated span, and isolated temporary storage. It may run outside the sandbox only when loopback binding is denied. If supported public/typed APIs cannot retrieve traces after bounded investigation, mark this plan blocked and do not run E1/E2.

Validation: `npm test`, `npm run experiment:verify`, `npm run experiment:verify:tracing`.

### Milestone 4 — Mechanical E2 canary

Snapshot the full observable workspace tree excluding `.git`, with byte-exact expected values. Assess unchanged input files, exact modified and created files, and no unexpected file. Introduce provider outcome and per-effect `CanaryAssessment`: `PASS`, `ERROR`, or `INVALID_CANARY`. Baseline error/invalidity blocks deep. An invalid deep canary preserves independent positive receiver/linkage/transport evidence but prohibits negative command/file/ordering/recovery/skill conclusions and recommends `STOP_AND_REASSESS`. Tests cover response-only, partial effects, input modification, unexpected files, exact success, and provider failure.

Validation: `npm test`, `npm run experiment:verify`.

### Milestone 5 — Signal-specific capability reporting

Replace generic trace presence with independent extractors for receiver/transport, evaluation linkage, command trajectory, file operations, ordering, controlled failure/recovery, and skill metadata. Generic trace IDs support only transport/linkage; trajectory/file/recovery/ordering require their own recognized evidence. Trace facts remain at most `NATIVE_EXPERIMENTAL`, absent facts remain `INSUFFICIENT`, and skill metadata never proves causal contribution. Update G2 and ownership reports and test generic, specialized, misleading, absent, and invalid-canary evidence.

Validation: `npm test`, both public checkpoints.

### Milestone 6 — Green review and reconciliation

After all behavior is green, run `$refactor-design` under its entry gate, then reconcile this plan, the ExecPlan index, `AGENTS.md`, `package.json`, and affected operational documentation. `docs/experiments/` remains absent. Run, in order: `npm ci`, typecheck, lint, tests, Prettier, build, both checkpoints, `git diff --check`, and `git status --short`. Record exact results. The resulting uncommitted successor is prepared for separate human review and authorization only.

### Milestone 7 — Final pre-live consistency patch

Correct four residual instrument inconsistencies without changing the frozen live condition: curated reports must use `freeze.scientificConfigurationDigest`; the real tracing gate must run with `writeLatestResults=false`; structured `model_reasoning_effort` metadata must survive opaque-evidence redaction while raw reasoning remains redacted; and the Experimental Ownership Matrix must again name Promptfoo, Codex SDK/dedicated login, harness, and human-operator responsibilities. Add behavior tests through the report CLI, redaction contract, and ownership output. If the real public Promptfoo lifecycle cannot retrieve the deterministic correlated span under the exact `writeLatestResults=false` condition, mark this ExecPlan blocked and do not execute E1/E2. Re-run all offline gates and the post-GREEN design review; commit and push remain outside this authorization.

## Progress

- [x] THEORY, RFC 0001, and ADR 0002 consulted for the original foundation.
- [x] E0–E2 offline foundation implemented and published in `b1d0878`.
- [x] Pre-live review and local tracing probe identified hardening requirements.
- [x] This hardening increment saved in the existing ExecPlan.
- [x] Milestone 1 started.
- [x] Milestone 1 completed: typed scientific configuration is fingerprinted separately from opaque evidence; reasoning and OTEL drift are tested.
- [x] Milestone 2 completed: campaign IDs, path containment, exclusive freezes, directory identity, and exclusive reservations are enforced.
- [x] Milestone 3 completed: real Promptfoo 0.122.0 evaluates a deterministic local provider, receives a correlated loopback span, and retrieves it through `getTraces()` before cleanup.
- [x] Milestone 4 completed: full byte-exact workspace assessment distinguishes provider error, invalid canary, and pass; deep is gated on baseline validity.
- [x] Milestone 5 completed: each reported capability uses a signal-specific extractor and unavailable normal signals are `INSUFFICIENT`.
- [x] Milestone 6 completed: post-GREEN design review and documentation reconciliation complete; no generated experiment report was created.
- [x] Milestone 7 started.
- [ ] Milestone 7 blocked: the exact-condition tracing gate failed with `writeLatestResults=false`; E1/E2 remain prohibited.
- [ ] Live authorization received and live gates executed.

## Decisions

- Decision: do not execute E1 from `b1d0878`.
  Rationale: measurement-validity defects would contaminate evidence.
  Date/Author: 2026-08-08 / user and reviewers.

- Decision: separate typed scientific provenance from opaque evidence sanitization.
  Rationale: fidelity and sensitive-content filtering are independent contracts.
  Date/Author: 2026-08-08 / reviewers.

- Decision: directory identity detects replacement, not account continuity.
  Rationale: filesystem metadata cannot establish the authenticated principal.
  Date/Author: 2026-08-08 / reviewers.

- Decision: treat `getTraces()` as experimental unless stability is independently established.
  Rationale: types and runtime methods do not establish public API stability.
  Date/Author: 2026-08-08 / reviewers.

- Decision: qualify tracing with the exact live `writeLatestResults=false` setting.
  Rationale: a separate persistence setting cannot qualify the frozen live condition.
  Date/Author: 2026-08-08 / final pre-live consistency patch.

- Decision: classify unavailable normal-surface signals as `INSUFFICIENT`.
  Rationale: a stable surface designation describes the API, not evidence that a specific signal was observed.
  Date/Author: 2026-08-08 / post-GREEN design review.

- Decision: preserve the exact-condition tracing failure rather than restore `writeLatestResults=true`.
  Rationale: a gate that differs from the frozen live condition cannot support live readiness.
  Date/Author: 2026-08-08 / exact-condition tracing evidence.

## Risks and Mitigations

- Risk: operational trace retrieval is typed but unusable. Mitigation: qualify it through the real local package before live work and stop if unsupported.
- Risk: local-only configuration is mistaken for no egress. Mitigation: claim only that no external endpoint/provider is required or configured.
- Risk: invalid canaries manufacture negative trace claims. Mitigation: retain positive independent facts but suppress event absence conclusions.
- Risk: an external directory switches without path change. Mitigation: fail on absent or unstable identity, while documenting its account limitation.
- Risk: hardening turns into a framework. Mitigation: confine changes to existing E0–E2 contracts and remove unused abstractions in design review.
- Risk: Promptfoo trace retrieval fails under the exact live setting. Mitigation: block E1/E2 rather than enable temporary persistence or use private APIs.

## Validation Strategy

Each behavior starts as a focused observable RED test, runs the full Vitest suite, receives the minimal GREEN change, and reaches `experiment:verify` at least every two cycles. Trace-related changes also run `experiment:verify:tracing`. The final ordered command sequence is recorded in this document only after it passes. No live command is part of normal validation.

Final validation evidence on 2026-08-08: `npm ci` restored the exact lockfile pins; typecheck, ESLint, Prettier, build, `git diff --check`, and the public offline checkpoint passed. Vitest passed 13 files and 27 tests. `experiment:verify` reported zero provider imports. The tracing checkpoint passed outside the sandbox because the sandbox denies loopback bind: Promptfoo 0.122.0 started its receiver at `127.0.0.1:4318`, the deterministic local provider posted a correlated OTLP span, and `getTraces()` returned it. No OpenAI/Codex provider or external endpoint was configured.

Consistency-patch validation: typecheck, ESLint, Prettier, build, `git diff --check`, `experiment:verify`, and 31 Vitest cases in 14 files passed. The real `experiment:verify:tracing` gate intentionally ran outside the sandbox and failed under the exact `writeLatestResults=false` setting: Promptfoo started the loopback receiver, but TraceStore inserts and reads failed, the receiver returned HTTP 500 to the deterministic local provider, and `getTraces()` returned no span. The post-GREEN design review cannot run because this required public checkpoint is not green.

## Documentation Impact

This document records the exact safety and evidence changes. `docs/execplans/README.md` must mark pre-live hardening until Milestone 6 is green. `AGENTS.md` must describe the tracing checkpoint and its limited network claim. `package.json` must expose it. RFC 0001 and ADR 0002 remain accurate because no product architecture changes. `docs/experiments/` stays absent until a separately authorized live campaign emits sanitized projections.

## Rollout and Recovery

All work is offline. A failed TDD cycle returns to the last green behavior; a failed trace qualification blocks E1/E2 rather than falling back to private modules. Never overwrite a freeze, remove a reservation to retry, mutate the external login, relax key policy, or bypass a receiver gate. A later live failure retains only bounded sanitized evidence and stops the campaign.

## Lessons Learned

- Typed presence, runtime presence, documented stability, and operational success are different facts.
- Directory identity is not authenticated-principal identity.
- Scientific configuration must not be filtered as opaque provider output.
- Summary and traces have to be collected before isolation cleanup.
- Invalid canaries suppress negative event claims but do not erase independent positive trace facts.
- Trace qualification must match the frozen live persistence setting; a positive result under another configuration is insufficient.
- The pinned Promptfoo tracing lifecycle is operational with temporary persistence but fails under the exact live persistence setting; this is a measurement blocker, not evidence about Codex or an authorization to change the live condition.
- Post-GREEN review found and fixed one defect: unobserved normal-surface data was classified as stable instead of insufficient. No further refactor was justified; the remaining orchestration phases are explicit protocol boundaries.
