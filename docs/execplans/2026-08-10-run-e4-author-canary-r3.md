# Run the E4 Author canary R3 after provider-boundary repair

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current throughout execution.

Safety boundary: this work is authorized, defensive evaluation development in this repository. It permits exactly one model-backed development invocation under the campaign named below. It does not authorize a retry, R4, E5, a decision run, direct credential access, raw provider-error persistence, or automatic Author qualification.

The intended executor is `gpt-5.6-terra` with `xhigh` reasoning. The baseline is `feat/e4-evaluation-author-v0` at `f325a244948ada6094b9dacb97bf289d33e6141b`. The normative THEORY was read in full at `572e963ea6f1207ab53c533592cb70a8239e221c`. Official OpenAI model guidance was checked on 2026-08-10 and continued to list `gpt-5.6-terra` and `xhigh`; that documentation does not prove account-specific availability.

## Purpose / Big Picture

Collect the first E4 Author result after repairing and locally qualifying the Promptfoo-to-Codex SDK boundary. R3 uses a new skill, oracle, campaign, reservation, output, and fingerprints so the terminal R1 and R2 evidence remains untouched. A successful R3 can support planning E5, but cannot qualify the Author or authorize decision use.

## Scope

Included: preserve R1/R2 unchanged; add one novel development fixture and hidden mechanical oracle; freeze a clean preparation commit; verify the corrected local provider boundary and all cost preflights; reserve and invoke Terra/xhigh exactly once; mechanically classify the terminal result; publish one sanitized canonical report; reconcile E4 documentation; and run deterministic final validation without another live call.

Excluded: reuse or modification of R1/R2 fixtures or campaigns; any retry; model comparison or substitution; prompt, schema, lifecycle, or product-code changes; E5 benchmark material; public CLI work; API keys; reading `auth.json` contents; raw provider output, reasoning, errors, logs, paths, credentials, or local state in committed artifacts.

## Definitions

- **R3** is campaign `e4-handoff-checklist-renderer-20260810-r3`, authorized by the user for exactly one provider invocation on 2026-08-11.
- **Novel fixture** is the `handoff-checklist-renderer` task family, distinct from the chronology and dependency-ledger fixtures used by R1/R2.
- **Hidden oracle** is `oracle.json` beside, but outside, the nested `skill/` snapshot root. It is never sent to the Author.
- **Terminal outcome** is completed Blueprint, provider error, timeout, invalid JSON, fenced JSON, structural invalidity, or oracle rejection. Every terminal outcome consumes R3 and prohibits a repeat.
- **Supported for E5** means the development canary met every prespecified check and permits only a separate E5 planning decision. It is not Author qualification.

## Existing Context

R1 and R2 are closed `INSUFFICIENT` after generic pre-provider errors. ExecPlan 13 established a reproducible cause in the production invocation configuration: Promptfoo 0.122.0 rejected `tests:[{}]` before constructing the provider. The fix uses `{vars:{}}`, preserves bounded safe provider diagnostics, and is qualified through real Promptfoo/Codex SDK traversal with six deterministic local processes and zero external calls.

At planning time the worktree is clean; Node 24, npm 11, Promptfoo 0.122.0, and Codex CLI/SDK 0.147.0 are installed; `/home/renanfranca/.codex` is writable with a readable authentication file; API-key environment variables are absent; and mandatory Codex doctor checks for authentication, configuration, runtime, provider reachability, and websocket reachability are green. Installation/update inventory checks remain non-mandatory because they do not govern the pinned project executable.

The prespecified R3 fingerprints are:

- snapshot: `962d10af245fbc5236f19a25bec0607af0ad72cee031aaf3ddb88aea1de27dba`;
- schema: `a66ad1c461b20e559e764c0b07190efccd3e72a650d6bd9103ee1ba4adb618e4`;
- prompt: `53d36524d9a625bab8ef474f17e49e4d1ce90423771fa00c5d35e0e528c6b1e7`;
- packet: `9acc316775172450f57bf613e3c4d0ab026ce25341b9a519d8b985a559a39c23`;
- condition: `af2317c86cb73607e5cae90fe485da6b5c8c4d2856fbb75bdadcddef887ac19b`.

The snapshot includes only `SKILL.md`. Packet inspection records `expectedStateProvided:false`, `mechanicalOracleProvided:false`, and no `oracle.json`, `expectedLifecycle`, or `observableChecks` token.

## Desired End State

R3 has one immutable local reservation tied to a clean preparation commit and one terminal invocation result. A canonical report records the exact condition, fingerprints, requested and observed model, safe terminal diagnostic if any, one attempt, zero retries, mechanical checks, limitations, and either `SUPPORTED_FOR_E5` or `INSUFFICIENT`.

R3 is `SUPPORTED_FOR_E5` only when the provider returns pure JSON, Skill Evidence derives `BLOCKED`, contracts and activation boundaries cover the fixture, missing decision context remains in blocking unresolved requirements, no absent context is fabricated, controlled fields remain system-owned, provenance is `NOT_QUALIFIED`, and `decisionEligible` is false.

Closure status: `CLOSED — SUPPORTED_FOR_E5`. The sole invocation completed with Blueprint `ebp-053df2ef14ceaf5cf4ba047fd3a8bc78d859ca0a8d18c04f14a982f862ad1051`, derived lifecycle `BLOCKED`, all prespecified checks passing, one attempt, and zero retries. The observed model identifier was not exposed and remains explicitly `null`; this limits provenance but does not negate the completed candidate or permit qualification claims.

## Milestones

### Milestone 1 — Prespecify the independent R3 collection

Create this ExecPlan, add it to `docs/execplans/README.md`, and add `evaluations/refactor-design/e4-author/development-canary-r3/skill/SKILL.md` plus its sibling `oracle.json`. The skill accepts only user-supplied checklist items with `id`, `action`, `complete`, and optional `owner`; preserves original values, order, and duplicate IDs; separates invalid entries; and prohibits inferred priority, ownership, completion, readiness, or delivery decisions and all external-state access.

Validation: `npx prettier --check docs/execplans/2026-08-10-run-e4-author-canary-r3.md docs/execplans/README.md evaluations/refactor-design/e4-author/development-canary-r3` and `git diff --check`.

Acceptance: fixture and oracle are novel, the expected lifecycle and checks exist only outside `skill/`, and this plan cannot be interpreted as permission to retry R1/R2.

### Milestone 2 — Qualify and freeze the exact instrument

Run `npm test -- --run test/evaluation-author.test.ts`, `npm run experiment:verify`, `npm run experiment:qualify:author`, and `npm run experiment:qualify:author-provider`. Inspect the R3 snapshot packet to prove `oracle.json` is absent. Build the project and calculate snapshot, schema, prompt, packet, and condition fingerprints through `createSkillSnapshot`, `prepareAuthorInvocation`, `canonicalJson`, and `sha256`; record them in this plan before collection.

Use `$commit-the-changes` to create a clean preparation commit containing only this plan, its index entry, and the R3 fixture/oracle. Recompute all fingerprints from that exact commit and require equality with the recorded values.

Acceptance: tests are green, public verification reports provider imports zero, both Author qualifiers are supported, the adapter qualifier records six local processes and zero external calls, the packet contains no oracle state, and the exact worktree is clean.

### Milestone 3 — Pass cost and safety preflight

From the preparation commit, verify Node 24/npm 11, Promptfoo 0.122.0, Codex CLI/SDK 0.147.0, writable `/home/renanfranca/.codex` with readable `auth.json` metadata, absent `OPENAI_API_KEY` and `CODEX_API_KEY`, and green `codex doctor --json` statuses for `auth.credentials`, `config.load`, `network.provider_reachability`, `network.websocket_reachability`, `runtime.provenance`, and `state.paths`. Do not read credential contents.

Require no existing `e4-handoff-checklist-renderer-20260810-r3` reservation, no existing `.skill-evidence/e4-handoff-checklist-renderer-20260810-r3.blueprint.json`, a writable output parent, the exact clean commit, and matching recorded fingerprints. Account-specific Terra availability may remain `UNVERIFIED` because probing it would consume the sole call.

Acceptance: every mandatory preflight is green before the reservation exists. Any failure stops before cost.

### Milestone 4 — Reserve, invoke exactly once, and classify

Run exactly:

```text
SKILL_EVIDENCE_AUTHOR_CODEX_HOME=/home/renanfranca/.codex npm run experiment:author -- \
  --skill evaluations/refactor-design/e4-author/development-canary-r3/skill \
  --out .skill-evidence/e4-handoff-checklist-renderer-20260810-r3.blueprint.json \
  --campaign e4-handoff-checklist-renderer-20260810-r3 \
  --approve-provider-invocations 1
```

Do not retry under any result. Verify the exclusive reservation and one invocation attempt. If a Blueprint exists, apply the prespecified oracle mechanically; otherwise mark candidate-dependent checks `NOT_OBSERVED` and retain only the bounded diagnostic exposed by Skill Evidence.

Create `docs/experiments/e4-evaluation-author-canary-r3-20260810.json` only after termination. It records canonical sanitized evidence and classifies `SUPPORTED_FOR_E5` only if every required check passes; all other terminal outcomes are `INSUFFICIENT`.

Acceptance: one reservation, one call, zero retries, truthful mechanical classification, and no raw local/provider material committed.

### Milestone 5 — Reconcile and validate without another call

Update this plan, `docs/execplans/README.md`, and the original E4 plan only where needed to state the R3 result and whether E5 planning is supported. Preserve R1/R2 plans, reports, reservations, fixtures, RFC 0001, ADR 0002, and E0–E3 history unchanged. Use `$commit-the-changes` for the final report/documentation commit.

Run, without `experiment:author`:

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
npm run experiment:qualify:codex-otel
npm run experiment:qualify:tracing
npm run experiment:verify:tracing
git diff --check
git status --short
```

Acceptance: every deterministic command is green, no second R3 call exists, historical artifacts are unchanged, and documentation matches the terminal evidence.

## Progress

- [x] Receive explicit authorization for exactly one real R3 invocation.
- [x] Read THEORY in full at the recorded commit and check official Terra/xhigh guidance.
- [x] Confirm the corrected local adapter boundary and current environment are suitable for planning.
- [x] Create and validate the R3 ExecPlan, fixture, and hidden oracle.
- [x] Create the clean preparation commit at `0fa9f05adfb3018216d34d63d25efd2d447ffae9` and confirm the recorded fingerprints from it.
- [x] Pass every mandatory preflight from the exact preparation commit.
- [x] Reserve and execute exactly one R3 invocation; it completed with lifecycle `BLOCKED`.
- [x] Publish the sanitized terminal report and reconcile E4 status as `SUPPORTED_FOR_E5`.
- [x] Complete deterministic final validation without another live invocation: audit 0, 90 tests, and every offline/local qualifier green.

## Decisions

- Decision: authorize exactly one R3 call and no retry.
  Rationale: the user selected “Preparar e executar”; the atomic campaign and terminal stopping rule preserve prespecification and cost control.
  Date/Author: 2026-08-11 / user and implementation agent.
- Decision: preserve Terra/xhigh and the pinned Promptfoo/Codex versions.
  Rationale: R3 is intended to demonstrate the repaired E4 baseline, not compare or optimize conditions.
  Date/Author: 2026-08-11 / implementation agent.
- Decision: use a novel handoff-checklist fixture rather than rerun R2.
  Rationale: the E4 recovery policy requires a new fixture and campaign after a terminal result; novelty prevents retrospective adaptation while the local qualifier isolates the repaired boundary.
  Date/Author: 2026-08-11 / implementation agent.
- Decision: make no product-code change during R3.
  Rationale: the production boundary is already green; any new behavior change would alter the instrument after authorization and must return to behavior TDD before a new collection.
  Date/Author: 2026-08-11 / implementation agent.
- Decision: add no artificial production test for the development fixture files.
  Rationale: R3 changes no product behavior; observable gates are the real snapshot/packet, existing E4 behavior suite, public checkpoint, local qualifiers, and prespecified oracle.
  Date/Author: 2026-08-11 / implementation agent.
- Decision: classify R3 as `SUPPORTED_FOR_E5` despite `observedModel:null`.
  Rationale: Promptfoo/Codex completed and returned a valid candidate under the requested pinned condition, while the SDK did not expose an observed identifier. Provenance records that absence explicitly; every semantic, lifecycle, blindness, and safety check independently passed.
  Date/Author: 2026-08-11 / implementation agent.

## Risks and Mitigations

- Risk: R3 is mistaken for a retry of R1/R2. Mitigation: distinct fixture, campaign, reservation, output, fingerprints, and report; immutable historical artifacts.
- Risk: the hidden oracle leaks into the Author packet. Mitigation: snapshot only nested `skill/` and inspect the canonical packet before reservation.
- Risk: account-specific model access fails. Mitigation: preserve it as explicit uncertainty, retain safe diagnostics, classify terminally, and never retry.
- Risk: post-result adaptation biases classification. Mitigation: commit fixture, oracle, checks, and fingerprints before reservation; permit only mechanical classification afterward.
- Risk: a successful development canary is mistaken for qualification. Mitigation: keep `NOT_QUALIFIED`, `decisionEligible:false`, `DEVELOPMENT`, and require a separate blind E5 ExecPlan.
- Risk: raw errors or credentials enter Git. Mitigation: do not inspect credential contents; commit only allowlisted diagnostic enums and sanitized canonical fields.
- Risk realized: the completed provider result did not expose an observed model identifier. Mitigation applied: preserve `observedModel:null`, make no inference about effective routing, and limit the conclusion to support for blind E5 planning under the requested condition.

## Validation Strategy

Validation proceeds from fixture formatting and packet blindness to focused behavior tests, provider-free verification, both zero-external-call Author qualifiers, a clean preparation commit, bounded auth/runtime/connectivity preflight, one terminal real call, mechanical oracle application, and the full deterministic suite. No offline gate substitutes for R3, and R3 cannot substitute for blind E5 qualification.

## Documentation Impact

- This plan is the canonical R3 authorization, progress record, and handoff.
- `docs/execplans/README.md` indexes R3 separately.
- `docs/experiments/e4-evaluation-author-canary-r3-20260810.json` becomes the canonical sanitized terminal result after the call.
- The original E4 plan changes only if R3 changes the truth of E4 acceptance or E5-planning support.
- R1/R2 artifacts, `AGENTS.md`, RFC 0001, ADR 0002, package configuration, CI, schema, and Author instructions remain unchanged unless direct evidence contradicts them.

## Rollout and Recovery

There is no deployment. Before reservation, the preparation commit can be reverted normally. After reservation, every outcome is terminal and preserved. Failure cannot be recovered by rerunning R3; it requires stopping, reporting, and obtaining separate authorization for any future campaign.

## Lessons Learned

- R1/R2 did not test model difficulty because Promptfoo rejected the empty test object before provider construction.
- A real local adapter qualifier is necessary to distinguish harness readiness from provider or model behavior.
- Fresh identities and a prespecified hidden oracle let R3 add evidence without rewriting earlier failures.
- The R3 packet contains exactly the nested skill snapshot and no expected lifecycle or oracle material; both local Author qualifiers are green before the preparation commit.
- The repaired production boundary completed on its first authorized real invocation. The Author preserved absent decision context as blockers, found the observable contracts and activation boundaries, and left lifecycle/provenance/eligibility under system control.
- A missing observed model identifier is a provenance limitation, not permission to infer routing or discard otherwise direct evidence of a completed candidate.
- Final validation passed without another Author invocation: provider-free verification reported zero imports, both Author qualifiers remained supported, Codex OTEL and Promptfoo tracing remained exact, and loopback tracing integration passed.
