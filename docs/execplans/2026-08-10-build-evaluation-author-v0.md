# Build Evaluation Author v0 — E4

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current throughout execution.

Safety boundary: this work is authorized, defensive maintenance in this repository. E4 does not run decision evaluations, automatically qualify the Author, or access credentials directly.

The intended executor is `gpt-5.6-terra` with `xhigh` reasoning. The baseline is `main` at `500e182`. The normative THEORY was read in full at commit `572e963ea6f1207ab53c533592cb70a8239e221c` on 2026-08-10.

## Purpose / Big Picture

Deliver the first product core that turns an authorized, reproducible skill snapshot into a canonical schema-1 `EvaluationBlueprint` whose lifecycle is `DRAFT`, `BLOCKED`, or `READY`. E4 uses development-only material to show that an Author can discover claims, contracts, activation boundaries, evidence needs, and uncertainty without inventing absent context. A `READY` result remains development-only and cannot authorize a decision run because blind Author qualification belongs to E5.

## Scope

E4 authorizes product modules under `src/` for intake, Blueprint semantics, and Author orchestration; a JSON Schema under `schemas/`; an internal `experiment:author` command; deterministic local Promptfoo qualification; one explicitly approved real development canary with no retry; a sanitized report; and deterministic CI coverage.

E4 excludes a public `skill-evidence` CLI, E5 and its blind benchmark, Blueprint-to-Promptfoo compilation, oracle generation or qualification, `FROZEN`, decision runs, automatic claim promotion, V1 expected answers/contracts/cases/oracles, reading `evals/` or `evaluations/` by the Author, model comparison, cost optimization, and reliability claims.

## Definitions

- A **skill snapshot** contains only authorized skill content plus ordered inclusion/exclusion metadata and a fingerprint. It never persists absolute paths.
- An **Author candidate** is the model-returned JSON before system-controlled fields are composed.
- An **Evaluation Blueprint** is the canonical schema-1 document composed and validated by Skill Evidence.
- The **Author condition** fingerprints the requested model and reasoning, instructions, THEORY, schema, and authorship protocol. E4 always labels it `NOT_QUALIFIED`.
- A **development canary** is adaptable development collection, not a benchmark or decision evidence.
- E4 lifecycle scope is always `DEVELOPMENT_AUTHORING` with `decisionEligible: false`.

## Existing Context

At `500e182`, TypeScript is limited to `experiments/`; 62 tests, the provider-free checkpoint, and the Promptfoo archaeological R1–R6 corpus are green. E3 protects expectation blindness, missing evidence, semantic equivalence, and critical-violation precedence. E4 reuses those properties through product-owned intake and Blueprint semantics while leaving provider lifecycle and invocation to Promptfoo.

The operational baseline is `gpt-5.6-terra` with `xhigh` reasoning, treated only as an unqualified development condition. E5, not E4, will determine whether any Author condition is defensible.

## Desired End State

The implementation exposes these internal contracts:

```ts
createSkillSnapshot(input: SnapshotInput): Promise<SkillSnapshot>
validateEvaluationBlueprint(value: unknown): BlueprintValidation
deriveBlueprintLifecycle(candidate: BlueprintCandidate, validation: BlueprintValidation): BlueprintLifecycle
authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult>
```

Schema-1 contains identity, lifecycle, skill, decision context, population, claims, exclusions, contracts, activation regions, usage/stress families, contrasts, evidence and oracle-qualification plans, sampling and analysis plans, policies, stopping conditions, unresolved requirements, untested risks, and Author provenance. `schemaVersion`, identity, snapshot fingerprint, lifecycle, and provenance are system-controlled and cannot be supplied or overwritten by a model.

Invalid JSON or a structurally invalid candidate yields run status `ERROR` and no fabricated Blueprint. A structurally valid but incomplete or semantically diagnosed candidate is `DRAFT`. A complete and semantically green candidate with at least one blocking unresolved requirement is `BLOCKED`; without blockers it is `READY`. `READY` remains `decisionEligible: false` while the Author is `NOT_QUALIFIED`.

The internal commands are:

```text
npm run experiment:qualify:author
npm run experiment:author -- --skill <directory> --out <blueprint.json> --campaign <id> --approve-provider-invocations 1
```

## Milestones

### Milestone 1 — Create intake and Blueprint contracts

Add `src/intake/`, `src/blueprint/`, `schemas/evaluation-blueprint.schema.json`, Ajv 8.20.0, JSON-module build support, and repository configuration for `src/` and `schemas/`. Intake requires a regular, non-empty UTF-8 root `SKILL.md`; enforces 256 files, 1 MiB per file, and 8 MiB total; excludes repositories, dependencies, artifacts, caches, temporaries, `evals/`, and `evaluations/`; never follows symlinks; structurally reports inaccessible, binary, oversize, secret-like, internal, and external symlink exclusions; never stores content or a digest for credential-like files; detects concurrent mutation; and fingerprints the policy plus canonically ordered inclusions and exclusions.

Validation: `npm test -- --run test/evaluation-author.test.ts`, `npm run typecheck`, and `npm run experiment:verify`. Equivalent snapshots must share fingerprints, while traversal, symlink, credential, mutation, and limit failures remain structured and non-leaking.

### Milestone 2 — Implement lifecycle and Author v0

Add `src/author/` and `src/cli.ts`; version and fingerprint THEORY-based instructions; frame skill content as untrusted JSON data; send only the authorized snapshot, schema, instructions, and prescribed operational knowledge; and exclude expected state and oracle material. Use Promptfoo's Node API with a JSON-serializable configuration for Terra/xhigh, `maxRetries: 0`, disabled cache, concurrency one, an empty temporary workspace, read-only sandbox, approvals `never`, disabled network/web search/thread persistence/sharing/latest results/multi-agent, and the separately authorized Codex home.

Require a pure JSON final response without fence stripping or repair. Compose controlled identity, lifecycle, fingerprint, and provenance after parsing. Derive `blueprintId` from semantic content plus snapshot and condition fingerprints. Preserve requested and observed model separately, including an explicit absent observed model.

Validation: the behavior suite and internal command demonstrate that model output cannot choose lifecycle, overwrite provenance, or convert unknown context into known values.

### Milestone 3 — Add deterministic qualification and CI

Keep all E4 behavior in `test/evaluation-author.test.ts`. Add development fixtures under `evaluations/refactor-design/e4-author/` for complete `READY`, decision context missing and `BLOCKED`, incomplete `DRAFT`, invalid JSON `ERROR`, prompt injection, expected-state leakage, and incompatible or missing mandatory evidence. Implement `experiment:qualify:author` through Promptfoo with a deterministic local provider. It emits a canonical `DEVELOPMENT` report with expected lifecycle states, zero external calls, and explicit limitations. Add it to CI after the archaeological corpus.

Validation: lifecycle states are mechanically discriminated, the provider-free checkpoint still has zero Promptfoo imports/provider calls, and CI needs no login, secret, or external model.

### Milestone 4 — Run one real development canary

Create a new E4-only fixture with clear observable contracts and deliberately insufficient decision context. Keep its mechanical oracle outside the Author packet and derive IDs only from observable content. Create a clean preparation commit before collection. Verify the exact worktree/commit, Codex CLI 0.147.0, a writable logged-in `SKILL_EVIDENCE_AUTHOR_CODEX_HOME`, absent `OPENAI_API_KEY` and `CODEX_API_KEY`, matching snapshot/schema/prompt/condition fingerprints, and no prior campaign reservation. Atomically reserve exactly one invocation before starting.

Invoke Terra/xhigh once with no retry. Timeout, provider failure, invalid JSON, or fabrication is terminal. After completion only, write a sanitized report under `docs/experiments/`. Classify it `SUPPORTED_FOR_E5` only when all prespecified checks pass; otherwise classify it `INSUFFICIENT`. Never repeat or adapt the same fixture under the same authorization.

### Milestone 5 — Review, document, and validate

After behavior, full tests, and public checkpoints are green, run `refactor-design` over only E4's changed contracts and adjacent responsibilities. Missing behavior returns to behavior TDD; refactors remain behavior-preserving. Reconcile this plan, its index, `AGENTS.md`, operational documentation, package scripts, and CI. Leave RFC 0001, ADR 0002, the eight E0–E2 reports, and the E3 ExecPlan byte-for-byte unchanged unless a normative contradiction is discovered.

Final validation, without repeating the real canary:

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
npm run experiment:qualify:codex-otel
npm run experiment:qualify:tracing
npm run experiment:verify:tracing
git diff --check
git status --short
```

## Progress

- [x] Synchronize `main` at `500e182`.
- [x] Read THEORY in full at `572e963ea6f1207ab53c533592cb70a8239e221c`.
- [x] Confirm the baseline: typecheck, 62 tests, provider imports zero, and favorable E3 corpus.
- [x] Authorize product core under `src/`.
- [x] Choose internal commands rather than a public CLI.
- [x] Authorize one real development collection.
- [x] Create branch, ExecPlan, and index entry.
- [ ] Complete Milestone 1.
- [ ] Complete Milestone 2.
- [ ] Complete Milestone 3.
- [ ] Create a clean preparation commit.
- [ ] Execute and record Milestone 4.
- [ ] Complete design review and final validation.

## Decisions

- Decision: E4 inaugurates `src/` and a product schema.
  Rationale: intake, Blueprint semantics, and lifecycle are Skill Evidence responsibilities, and this later ExecPlan explicitly authorizes them.
  Date/Author: 2026-08-10 / user and planning agent.
- Decision: expose only `experiment:*` commands.
  Rationale: the public product contract remains premature before E5/E6.
  Date/Author: 2026-08-10 / user.
- Decision: use Terra/xhigh only as a `NOT_QUALIFIED` development baseline.
  Rationale: E5 must compare conditions before normal use can be justified.
  Date/Author: 2026-08-10 / user and planning agent.
- Decision: lifecycle is derived deterministically.
  Rationale: the Author cannot promote itself or neutralize blockers.
  Date/Author: 2026-08-10 / planning agent.
- Decision: permit exactly one real invocation with no retry.
  Rationale: failures remain valid evidence about the instrument and cannot trigger retrospective adaptation.
  Date/Author: 2026-08-10 / user.
- Decision: keep E4 development material separate from historical refactor-design evidence and future E5 blind material.
  Rationale: this preserves future benchmark blindness and avoids reusing expected answers.
  Date/Author: 2026-08-10 / planning agent.

## Risks and Mitigations

- Risk: E4 anticipates E5. Mitigation: use adaptable development fixtures and keep the condition `NOT_QUALIFIED`.
- Risk: skill content manipulates the Author. Mitigation: delimit it as untrusted data, isolate execution, and test injection behavior.
- Risk: snapshots leak credentials or evaluation material. Mitigation: explicit exclusions, conservative detection, and no persisted secret content/digest.
- Risk: placeholders make a Blueprint look complete. Mitigation: semantic diagnostics, non-empty requirements, and structured unresolved requirements.
- Risk: `READY` is mistaken for authorization. Mitigation: invariant `DEVELOPMENT_AUTHORING`, `NOT_QUALIFIED`, and `decisionEligible: false`.
- Risk: product code duplicates Promptfoo. Mitigation: Promptfoo owns invocation/provider lifecycle; Skill Evidence owns intake, schema, semantics, eligibility, reservation, and provenance.
- Risk: a poor canary tempts retry. Mitigation: exclusive atomic reservation and terminal `INSUFFICIENT` classification.

## Validation Strategy

Each observable behavior follows `tdd-behavior-autonomous-quiet`: one failing behavior test, minimal implementation, full relevant suite, and provider-free public checkpoint no less often than every two cycles. Validation broadens from the behavior suite to deterministic local Promptfoo qualification, CI, the single real canary, scoped structural review, and the complete final sequence. Offline checks do not replace the canary; the canary does not qualify the Author.

The behavior suite explicitly covers deterministic ordering/fingerprints/identity; missing root and `SKILL.md`; traversal; internal/external symlinks; binary/per-file/total/file-count limits; secret suspicion without content persistence; concurrent mutation; JSON Schema failures; duplicate IDs and broken references; empty sections without corresponding unresolved requirements; every lifecycle; attempted lifecycle/provenance overwrite; prompt injection; expected-state/oracle packet leakage; provider error/timeout/fenced or invalid JSON; no retry and exclusive reservation; requested/observed model separation; invariant decision ineligibility; R1–R6; and preservation of historical reports.

## Documentation Impact

- `AGENTS.md` will authorize `src/`, schema-1, and the E4 commands while preserving all security boundaries.
- This plan and `docs/execplans/README.md` remain canonical for execution state and result.
- `package.json`, TypeScript, ESLint, and Prettier configuration will cover product code and schema assets.
- `.github/workflows/ci.yml` will add only deterministic local Author qualification.
- RFC 0001 and ADR 0002 remain normative and unchanged because E4 preserves expectation blindness and blocking missing evidence.
- Historical E0–E2 reports and the E3 ExecPlan remain immutable.

## Rollout and Recovery

There is no deployment. E4 is delivered on `feat/e4-evaluation-author-v0`; push and pull request are out of scope. Before the real invocation, commits may be reverted normally. After reservation, its result must remain terminal and preserved. A core failure can be reverted; a canary failure needs a novel fixture and new authorization, never reuse of the reservation.

## Lessons Learned

- E3 showed that Promptfoo configuration must cross a strict JSON boundary; E4 preserves that property.
- Blueprint lifecycle is Skill Evidence policy, not Author judgment.
- An Author returning `BLOCKED` can be behaving correctly.
- E4 development must preserve genuinely blind E5 material.
