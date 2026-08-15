# ExecPlan 24 — Make supervisor review cost proportional

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

## Purpose / Big Picture

Make `$supervise-skill-evidence` preserve a completed material review when a later change is mechanically confined to permitted operational ExecPlan evidence. The observable outcome is that a correction like the final PR #9 handoff edit receives deterministic mechanical checks only, with no reviewer, consolidator, model, or semantic adjudication.

The change preserves fail-closed behavior: code, schemas, serializer behavior, authority, the ExecPlan index, or approved normative sections still invalidate prior material coverage. It also caps automatic reinforced review at two rounds per increment; a third full reinforced round uses the existing `WAIT_RISK_APPROVAL` gate.

Safety boundary: this task is limited to authorized defensive maintenance of this repository. It does not authorize a provider invocation, campaign, credential change, release, deployment, merge, or destructive operation.

## Scope

In scope:

- version 2 of the supervisor machine contract and reviewed-content serialization;
- separate material and operational-evidence identities plus composable mechanical coverage;
- stable active-plan routing and terminal inactive-plan handoff rules;
- review routing and the two-round automatic reinforced-review budget;
- behavior-focused regressions and living ExecPlan reconciliation;
- commit, push, and draft-PR publication after mechanical GREEN.

Out of scope:

- changing the three user-owned gate types or automatically merging any pull request;
- changing Evaluation Author product behavior, Blueprint schemas, campaigns, or qualification claims;
- model-backed or paid forward tests;
- two-reviewer reinforced review or a fresh consolidator for this increment, per the user's explicit current review scope;
- treating deterministic fixtures or one fresh review as reliability, robustness, or generalization evidence.

## Definitions

- **Material identity:** the SHA-256 identity of every candidate byte relative to the exact base after only the approved ExecPlan evidence partitions are replaced by versioned markers.
- **Operational-evidence identity:** a separate SHA-256 identity covering `Existing Context` in every ExecPlan and `Supervisor Record`, `Progress`, and `Lessons Learned` in inactive ExecPlans.
- **Identity-neutral active evidence:** the active ExecPlan's `Supervisor Record`, `Progress`, and `Lessons Learned`; these remain outside both identities so recording a review cannot recursively require another review.
- **Composable operational delta:** a change whose prior and current receipts share the exact base, active plan, and material identity while the operational-evidence identity changes.
- **Full review:** review of the complete current material identity rather than only the changed operational sections.
- **Reinforced round:** one dispatch of the reinforced topology for one distinct material identity. The round is consumed when its first reviewer starts.
- **Review coverage receipt:** the exact base, current material and operational identities, foundation material review, accepted operational-delta checks, reinforced-round count, and finding disposition used for publication and merge freshness.

## Normative Sources

- `AGENTS.md` at implementation base `6a7f9c6f99513b25551e79b7ee73927ff2f39a97`.
- `/home/renanfranca/projects/skill-evaluation-theory/THEORY.md` at commit `572e963ea6f1207ab53c533592cb70a8239e221c`, consulted in full on 2026-08-14. This plan specifically prespecifies the operational-efficiency claim, keeps evidence conditional on exact identities, qualifies known-valid and known-invalid routing, and does not use reviewer count as proof.
- ExecPlan 22 for the existing supervisor state, authority, identity, and merge contracts.
- ExecPlan 23 and merged PR #9 for the concrete three-round cost failure being converted into a regression.
- The installed `skill-creator`, `implement-execplan`, `tdd-behavior-autonomous-quiet`, and post-GREEN `refactor-design` workflows.

## Approval Record

- Contract revision: 1
- Approval status: `APPROVED`
- User decision: “Implement the proposed plan.”
- Approved on: 2026-08-14
- Material sections covered: Purpose / Big Picture, Scope, Desired End State, Authority Boundaries, Milestones 1–5, Validation Strategy, Documentation Impact, Rollout and Recovery, and existing Decisions.
- Current user direction: operational text receives mechanical checks only. No reviewer, consolidator, model, or semantic/scientific adjudication is dispatched for it, including for this direct skill correction.
- Revision rule: any change to the approved material sections increments the revision, restores `PENDING`, and returns to `WAIT_PLAN_APPROVAL`; execution evidence and finding disposition do not change the revision.

## Existing Context

PR #9 merged into `main` as `6a7f9c6f99513b25551e79b7ee73927ff2f39a97`. Its final remediation required three complete reinforced reviews because the existing contract selects topology from the entire PR and invalidates all review evidence after any material byte changes. The third round followed a bounded correction to predecessor-plan handoff text and the index, but still reran the complete matrix and sent all 37 artifacts to two reviewers and a consolidator.

The current serializer emits one version-1 material identity. It normalizes only the active ExecPlan's `Supervisor Record`, `Progress`, and `Lessons Learned`; every other byte changes the identity. The index discovers one active plan by the prefix `Active:`, which encourages transient milestone text. The contract has no composable delta receipt and no reinforced-round budget.

At approval, `/home/renanfranca/projects/skill-evidence` is clean on synchronized `main`. Implementation uses `/home/renanfranca/projects/skill-evidence-review-cost` on `fix/proportionate-supervisor-review`, based exactly on `6a7f9c6f99513b25551e79b7ee73927ff2f39a97`. There are no open pull requests.

## Supervisor Record

- State: `PUBLISH_DRAFT`
- Evidence refreshed: 2026-08-14 after direct user-directed completion and final mechanical validation
- Contract: revision 1, `APPROVED`
- Worktree: `/home/renanfranca/projects/skill-evidence-review-cost`
- Branch: `fix/proportionate-supervisor-review`
- Exact base tip: `6a7f9c6f99513b25551e79b7ee73927ff2f39a97`
- Feature head before this direct correction: `f5ba5dbfcb053f1177fbf1ac51bc6dfdeaeb17a5`
- Working tree: the user directly required operational text to receive mechanical checks only and explicitly prohibited review or use of this skill's own protocol for the correction
- Current identities: two byte-identical complete collections over the exact base produced material `sha256:8f762fecede1e949c4f430828280a4549af82e6ab3d05b07077409668ed590ae` (7 entries) and operational evidence `sha256:0a3663aa9c90735fcd3a298dcf0381da49f189861480a3ca70f8a579fb78cffc` (3 entries)
- Current validation: focused supervisor suite 28/28, skill quick validation, typecheck, lint, full Vitest 217/217, repository-wide Prettier, build, offline `experiment:verify` with provider imports 0, and `git diff --check` are GREEN
- Review mode for final identities: skipped by explicit user direction; no further reviewer or consolidator may be dispatched for this increment
- Review coverage: no complete v2 receipt for the final identities; on 2026-08-14 the user explicitly directed that all agents stop and that no further review be performed, so delivery proceeds on deterministic validation evidence only without claiming independent review coverage
- Reinforced rounds used: 0; reinforced review is prohibited for this increment by current user scope
- Pull request: draft PR #11, `https://github.com/renanfranca/skill-evidence/pull/11`; direct correction is pending commit and push
- Pending gate: none
- Operational blocker: none

## Desired End State

The version-2 serializer emits a canonical material manifest/identity and a canonical operational-evidence manifest/identity after two byte-identical complete collections. It partitions only the named ExecPlan sections, leaves the active plan's three self-referential sections identity-neutral, and keeps the active-plan index material and exact.

Given a validated prior receipt, the public CLI classifies the new state as unchanged, composable operational delta, or material delta. A composable operational delta identifies the exact changed operational sections, runs only deterministic mechanical checks, and retains the foundation review for unchanged material. It never dispatches review or semantic adjudication. Missing, malformed, stale, wrong-base, or incompatible receipts fail closed to full material review.

The index contains exactly one status cell equal to `Active`. Inactive plans contain only terminal history and a stable link to the index for current delivery; they do not repeat current branch, identity, validation, review, or PR state.

The first two reinforced rounds of a future increment remain ordinary approved work. Dispatching a third round selects `WAIT_RISK_APPROVAL` before any reviewer starts, and approval is valid only for one exact additional round at the bound base, plan revision, and material identity.

Publication and merge freshness bind both identities and the complete review coverage receipt. No evidence is claimed beyond deterministic process behavior under the tested repository conditions.

## Authority Boundaries

Revision 1 authorizes edits only within the repo-local supervisor skill, its focused tests, this plan, ExecPlan 23's terminal handoff record, and the ExecPlan index. It authorizes provider-free mechanical validation, an isolated branch/worktree, a conventional commit, push, and draft pull request.

It does not authorize any model-backed campaign or provider call, credential or permission change, destructive operation, force push, history rewrite, external schema migration, release, deployment, or merge. Any newly necessary action in those classes selects the existing applicable gate. This increment's final review must not use the reinforced topology.

## Milestones

### Milestone 1 — Prespecify proportional routing

Add behavior tests to `test/supervise-skill-evidence.test.ts` before contract or serializer changes. Prove the PR #9-shaped operational delta selects mechanical-only validation with no reviewer, protected sections and code select full material review, the exact `Active` status is required, active self-referential evidence remains identity-neutral, and the third reinforced round selects `WAIT_RISK_APPROVAL`.

Acceptance: each new behavior has an observed RED for the intended missing contract or serializer behavior while the prior focused suite remains otherwise GREEN.

### Milestone 2 — Implement dual identities and receipts

Update `.agents/skills/supervise-skill-evidence/references/supervisor-contract.json` to schema 2 and update `scripts/reviewed-content-identity.mjs` to emit material and operational manifests and identities. Add optional previous-receipt comparison and atomic receipt persistence beneath `.skill-evidence/supervisor/reviews/`; store paths and hashes only, never raw candidate bytes. Preserve double collection, no-follow reads, ancestor stability, UTF-8/LF canonicalization, and no-output failure semantics.

Active plans require exactly one of each named section. Inactive plans allow zero or one; duplicates fail closed. The exact active plan and index remain material. Receipt reuse requires canonical serialization, correct digests, the exact base, compatible versions, and the same active plan.

Acceptance: unchanged input is byte-identical across runs; every byte belongs to the material partition, operational partition, or the three explicit identity-neutral active sections; tampered receipts and unsafe paths fail closed; Git status remains unchanged except for ignored receipt artifacts requested explicitly.

### Milestone 3 — Implement mechanical composition and material-review cost budget

Update `supervisor-policy.md` and the concise `SKILL.md` operating summary. Define mechanical-only routing for operational deltas and full review routing only for material deltas; define the coverage receipt and merge bindings; keep exactly three user gates; and make round three use `WAIT_RISK_APPROVAL` with exact one-round binding.

Reconcile ExecPlan 23 as merged and terminal. Require inactive plans to point to `docs/execplans/README.md` rather than repeat mutable current facts, and require the index's active status to be exactly `Active`.

Acceptance: structural known-valid and mutation tests discriminate every route, no fourth gate appears, and the skill validator passes.

### Milestone 4 — Reconcile design and validate

After behavior GREEN, apply `$refactor-design` only to changed serializer/contract responsibilities. Refactor only a demonstrated structural risk, preserving public output and all identity semantics. Reconcile this plan and canonical documentation before final validation.

Run:

```text
npx vitest run test/supervise-skill-evidence.test.ts
python3 /mnt/c/Users/renan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/supervise-skill-evidence
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
git diff --check
git status --short
```

Acceptance: every command is GREEN with zero provider invocations, no campaign/reservation artifact exists, and the exact material/operational identities reproduce twice.

### Milestone 5 — Complete mechanical validation and publish a draft

Run the deterministic mechanical validation matrix without dispatching any reviewer, consolidator, or model. Then use `$commit-the-changes`, verify the commit reproduces both identities except the three active identity-neutral sections, push `fix/proportionate-supervisor-review`, update the draft PR into `main`, and confirm exact-head hosted checks. Do not merge.

Acceptance: no review agent is dispatched, the remote draft head equals the mechanically validated commit, hosted checks are GREEN, and supervision stops before merge.

## Progress

- [x] Reconstruct main, worktree, branch, PR, active-plan, and prior-review state.
- [x] Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Record revision 1 approval and the standard-only review exception.
- [x] Create the isolated implementation branch and worktree.
- [x] Complete Milestone 1 behavior REDs.
  - Exact active routing RED: the v1 prefix matcher accepted `Active: implementation`; GREEN required exactly one table status cell equal to `Active`, with 23/23 focused tests.
  - Dual-output RED: the public CLI lacked the v2 material and operational-evidence shape; GREEN introduced the two canonical manifests and identities while preserving stable double collection and path safety.
  - Inactive-cardinality RED: the first v2 partition implementation incorrectly required `Existing Context` in an inactive plan; GREEN allows zero or one of every named inactive section while retaining exactly-one active cardinality.
- [x] Complete Milestone 2 dual identities and receipt behavior.
  - Active `Supervisor Record`, `Progress`, and `Lessons Learned` changes preserve both identities; active `Existing Context` and all four permitted inactive sections change only the operational-evidence identity; every other candidate byte remains material.
  - Requested receipts persist atomically and create-only under ignored `.skill-evidence/supervisor/reviews/`. Validated prior receipts classify unchanged, composable operational, and material deltas; missing, invalid, wrong-base, wrong-active-plan, noncanonical, digest-invalid, and unsafe-path receipts fail closed to full review.
  - Unsafe-receipt RED: a recomputed receipt containing `../outside.md` was accepted as a material delta; GREEN validates canonical manifest paths and section/digest structure before comparison, with 25/25 focused tests.
  - Coverage-composition RED: unchanged and operational-only comparisons reset the validated foundation-review reference to `null`; GREEN carries prior coverage forward only while exact base, active plan, and material identity remain equal, and clears the current finding disposition for the new operational delta.
  - Receipt-redirection RED: a symlink at `.skill-evidence` redirected an explicitly requested write to another directory; GREEN walks and validates each receipt-directory ancestor before creation, refuses symlinks and non-directories, and reads prior receipts through the same stable no-follow path discipline.
- [x] Complete Milestone 3 policy, budget, and documentation behavior.
  - The schema-2 contract discriminates unchanged, operational-only, material-standard, and material-reinforced routes, binds coverage to both identities, and preserves exactly three user gates.
  - Policy/SKILL routing RED: schema-2 machine routing existed without the matching human operating contract; the final GREEN defines mechanical-only operational composition, material-review fallbacks, two automatic reinforced rounds, and exact one-round `WAIT_RISK_APPROVAL` binding for round three.
  - Partition-mutation RED: the test oracle accepted a contract mutation that made active `Supervisor Record` operational and therefore recursive; GREEN validates the complete versioned partition descriptors, markers, dispositions, and cardinalities rather than headings alone.
  - ExecPlan 23 is terminal and points current delivery to the exact-`Active` index instead of repeating mutable current delivery facts.
- [x] Complete Milestone 4 design review and provider-free validation.
  - Post-GREEN design review found no concrete behavior-preserving refactor warranted before delivery. The serializer remains one stateless collection transaction with explicit helpers for Git observation, ExecPlan partitioning, receipt validation, comparison, and persistence. Splitting those responsibilities further now would duplicate canonical identity rules or add temporal coupling without evidence of a current defect.
  - Complete validation is GREEN: focused 26/26, skill quick validation, typecheck, lint, full Vitest 215/215, repository-wide Prettier, build, offline `experiment:verify` with provider imports 0, and `git diff --check`.
  - Two complete real-worktree serializer invocations were byte-identical at material `sha256:2833f511e1169695d8ccd052f87a1e59e2ae88c8add4e385a6fa8c5c25db956d` (7 entries) and operational evidence `sha256:08ef0cf23eab557f4cf4aa4c3c09acfe1037f9770510c00a2a28dd690bd4eab8` (3 entries).
- [ ] Complete Milestone 5 one-reviewer standard review and draft publication.
  - A historical first standard review reproduced both identities and reported five blocking findings: incomplete or forged coverage reuse (P1), reinforced-round ledger reset across material identities (P1), CRLF collapsing to LF in ExecPlan identities (P2), incomplete counting of exact `Active` cells (P2), and no machine transition for publication-time operational or coverage change (P2). Direct supervisor reconciliation accepted all five. The later user direction ended all further review and made operational-only changes mechanical-only.
  - Coverage-completeness remediation observed five discriminating REDs in sequence: the initial null receipt, a missing artifact, a wrong artifact digest, a null array reference, and an extra raw-content reference key each incorrectly classified as `UNCHANGED`. GREEN now requires exact receipt, coverage, and reference keys; non-null foundation and finding references; non-null array references; and stable no-follow regular-file reads whose SHA-256 matches before any unchanged or composable reuse.
  - Reinforced-ledger remediation observed the first material delta return an empty ledger instead of its consumed round. GREEN preserves only the validated `reinforcedRounds` ledger across material identities at the same exact base and active plan, clears the other coverage fields, retains two distinct consumed rounds across two identities, and executes the contract budget to select `WAIT_RISK_APPROVAL` for the third identity before dispatch.
  - Raw-byte remediation observed CRLF in both protected material and operational sections succeed instead of failing. GREEN accepts canonical LF and rejects every carriage return with exit 1 and no stdout before partitioning.
  - Active-index remediation observed a valid row plus a malformed-link `Active` row succeed instead of counting both status cells. GREEN counts exact status cells first, then validates the sole row's canonical direct-child link; malformed, duplicate, traversal, nested, two-column, and established three-column cases are covered. The first real-worktree checkpoint exposed the three-column compatibility case, which received its own RED before the minimal parser correction.
  - Publication remediation observed the machine contract omit the operational-evidence-or-coverage change route. GREEN requires both material and operational/coverage changes at `PUBLISH_DRAFT` to return to `VALIDATE`, with the latter receiving deterministic mechanical checks only under `DENY_ON_CONFLICT`.
  - Post-remediation validation is GREEN: focused 28/28, skill quick validation, typecheck, lint, full Vitest 217/217, repository-wide Prettier, build, offline `experiment:verify` with provider imports 0, and `git diff --check`.
  - Two complete real-worktree serializer invocations were byte-identical at material `sha256:ec1760ff131325f1d28239448397514c5038202a9d2e6978ecf96abcad6535aa` (7 entries) and operational evidence `sha256:08ef0cf23eab557f4cf4aa4c3c09acfe1037f9770510c00a2a28dd690bd4eab8` (3 entries); both stdout byte streams hashed to `f9c53dcb99f84f683674b29375edfdb06b96733bb5de8cd94808b3d7536e5846`.
  - Second standard review confirmed the CR/raw-byte, exact-`Active`, and publication-transition fixes, then reported four blocking findings: coverage artifacts lacked identity-bound semantic schemas (P1), the reinforced ledger was coupled to complete reusable coverage and reset on base movement (P1), inactive optional-section addition/removal still changed material identity (P2), and receipt persistence remained vulnerable to concurrent ancestor redirection (P2). Direct supervisor reconciliation accepted all four for bounded remediation.
  - The user then explicitly stopped every agent and ended further review. Direct completion added canonical identity-bound review artifacts and chain validation, an independent plan-revision-bound round ledger that survives incomplete coverage and base/material movement, operational-only inactive-section presence/placement semantics, and held no-follow descriptor confinement for receipt persistence.
  - Final mechanical validation is GREEN: focused 28/28, skill quick validation, typecheck, lint, full Vitest 217/217, repository-wide Prettier, build, offline `experiment:verify` with provider imports 0, and `git diff --check`. Two complete CLI invocations were byte-identical at material `sha256:2e4bcf6df8e58620a02d2dbbaf3a823616f2049ba63fd5c9ae1decbdae6222a9` (7 entries) and operational evidence `sha256:0a3663aa9c90735fcd3a298dcf0381da49f189861480a3ca70f8a579fb78cffc` (3 entries).
  - Direct user correction made operational-text handling strictly mechanical: machine routing is `MECHANICAL_ONLY`, no reviewer/consolidator/model/semantic adjudication may be dispatched, and the finding disposition explicitly carries only the unchanged material result. Focused and complete mechanical checks remain GREEN; two complete collections reproduced material `sha256:8f762fecede1e949c4f430828280a4549af82e6ab3d05b07077409668ed590ae` and operational evidence `sha256:0a3663aa9c90735fcd3a298dcf0381da49f189861480a3ca70f8a579fb78cffc` byte-identically.

## Decisions

- Decision: preserve review coverage compositionally rather than ignore operational changes.
  Rationale: separate identities keep exact operational evidence observable while allowing unchanged material to retain its stronger earlier review.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: keep active `Supervisor Record`, `Progress`, and `Lessons Learned` identity-neutral.
  Rationale: the review result must be recorded after review without creating an infinite self-review loop.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: use a narrow operational allowlist.
  Rationale: `Existing Context` and explicit handoff records are evidence, while Purpose, Scope, Decisions, authority, validation acceptance, rollout, and index routing remain material.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: allow two automatic reinforced rounds and gate the third.
  Rationale: the PR #9 sequence shows one initial review and one technical-remediation review can be proportionate, while a third full three-agent pass warrants explicit cost approval.
  Date/Author: 2026-08-14 / user.

- Decision: operational text receives mechanical checks only.
  Rationale: operational evidence records execution state; rereading it semantically with fresh reviewers adds cost without changing the already reviewed material identity. Any byte outside the operational partition returns to the material-review route.
  Date/Author: 2026-08-14 / user.

## Risks and Mitigations

- **Partition gap:** bytes could be excluded from both identities. Mitigate with reconstruction/known-answer tests proving every section is material, operational, or one of the three exact active self-referential sections.
- **Operational section carries authority:** an agent could treat a decision written in Progress or Existing Context as approved. Mitigate by making only protected plan sections authoritative and requiring a plan revision for new material decisions.
- **Forged or stale receipt:** a candidate could claim prior coverage it did not receive. Mitigate with canonical digest validation, exact-base/active-plan/version binding, fail-closed fallback, and direct repository inspection.
- **Index drift:** transient status text could reintroduce global identity churn. Mitigate with an exact `Active` status contract and known-invalid suffix test.
- **Self-reference:** writing review results could alter the identity under review. Mitigate by excluding exactly three active sections from both identities and no others.
- **Cost budget bypass:** agents could split or rename rounds. Mitigate by consuming a round when the first reinforced reviewer starts for a distinct material identity and recording the count in the active Supervisor Record and coverage receipt.
- **Local receipt artifact loss:** ignored receipts can disappear across hosts. Mitigate by failing closed to a full review; never infer composition from conversation history alone.

## Validation Strategy

Use quiet behavior-first RED/GREEN cycles in the existing focused test file. Run the complete focused suite on every cycle and the serializer CLI at least every two cycles. After focused GREEN, run the exact Milestone 4 matrix. Tests establish deterministic routing, serialization, and safety behavior only; they do not qualify model reliability or generalization.

No E4 Author command, E5 benchmark, E18–E20 canary, tracing qualifier, provider-backed command, or consumed campaign may run.

## Documentation Impact

- This ExecPlan becomes the only active delivery contract.
- ExecPlan 23 receives terminal merge evidence and a stable pointer to the index; its historical approved contract is unchanged.
- `docs/execplans/README.md` uses one exact `Active` status with no transient detail.
- `supervisor-policy.md`, `supervisor-contract.json`, and the serializer change because the public supervisor review and identity contract changes.
- `AGENTS.md`, product schemas, RFC 0001, ADR 0002, ADR 0003, historical reports, and campaign artifacts remain unchanged because no product, scientific, provider, or repository-level routing claim changes.

## Rollout and Recovery

The change is repo-local and has no deployment or migration. It ships as one draft PR and can be reverted as one conventional commit before merge. A version-1 receipt is incompatible with version 2 and therefore forces a full review rather than migration. If partition completeness, stable receipt persistence, or exact merge binding cannot be proven, stop before publication and revise the approved plan instead of weakening the contract.

If hosted checks fail, preserve the branch and return to the smallest behavior cycle. If `main` moves, reorient and repeat mechanical checks for operational-only changes or proportionate review for material changes; do not rewrite history without the applicable authority. Merge remains separately gated.

## Lessons Learned

- Exact status matching belongs in both the machine discovery contract and the human index rule; prefix matching made transient milestone prose part of routing.
- Receipt digest validation is insufficient by itself because an attacker can recompute a digest over an unsafe manifest. Reuse also requires canonical structure, safe repository-relative paths, exact base and active-plan binding, and compatible formats.
- Partitioning the same ExecPlan bytes once for material replacement and once for explicit operational section hashes keeps coverage complete without storing raw candidate bytes; active self-referential sections remain the only identity-neutral exception.
- The larger serializer is still cohesive around one fail-closed snapshot transaction; the useful design boundary is its pure manifest/identity helpers, not a new service abstraction that would distribute canonicalization rules.
- A structurally valid receipt is not reusable coverage until every required review reference exists as a stable regular file and its observed bytes match the bound digest; initial candidate receipts remain intentionally incomplete and therefore non-reusable.
- Reinforced-round consumption is increment history, not material-identity coverage. Material changes invalidate foundation and finding coverage but cannot erase the validated round ledger while the exact base and active plan remain bound.
- Counting only rows whose links already parse lets a malformed row hide a second `Active` status. Cardinality must be established before the sole row's link is interpreted, while the row parser must preserve the index's established additional columns.
