# ExecPlan 22 — Supervise skill-evidence delivery

## Purpose / Big Picture

Create a repository-local Codex skill that turns one explicitly activated, pinned task into the durable control plane for ordinary `skill-evidence` delivery. The supervisor must reconstruct progress from repository and GitHub evidence, delegate implementation and review to fresh subagents, and continue automatically until it reaches one of three user-owned decisions: approval of an ExecPlan, approval of a critical or paid action, or approval to merge. The user approved this operating model on 2026-08-14.

This plan is an implementation and offline-qualification plan for the supervisor skill. It does not activate the supervisor Goal, merge code, invoke a provider, repeat a consumed campaign, or claim that an instruction-only skill is reliable outside the tested scenarios.

## Scope

In scope:

- a repo-local `supervise-skill-evidence` skill and its UI metadata;
- a small machine-readable supervisor contract plus a deterministic reviewed-content identity utility;
- durable repository instructions that let a compacted or fresh supervisor context rediscover the workflow;
- explicit states, transitions, evidence requirements, authority boundaries, review depth, and user-facing decision cards;
- behavior-focused repository assertions and fresh-context forward tests;
- documentation of activation, recovery, and operational limits.

Out of scope:

- a product CLI, hosted daemon, scheduled automation, automatic merge, release, or deployment;
- unattended provider invocations, paid work, or reuse of E5, E18, E19, or E20 campaign identities;
- replacing Git, GitHub, ExecPlans, tests, or CI as sources of truth;
- a statistical activation, stability, robustness, or generalization claim.

## Definitions

- **Supervisor task:** the one pinned Codex task in which the user explicitly invokes `$supervise-skill-evidence` and, when available, creates or resumes its Goal.
- **Repository truth:** `AGENTS.md`, the active worktree and branch, Git history and status, `docs/execplans/README.md`, the active ExecPlan, pull-request state, review state, and CI evidence.
- **Gate:** a state that requires an explicit user decision before work can cross the associated authority boundary.
- **Standard review:** one fresh reviewer, followed by supervisor evidence reconciliation.
- **Reinforced review:** two independent fresh reviewers plus a separate fresh consolidator when the change touches a declared high-risk surface.
- **Material finding:** a P0, P1, or P2 issue supported by concrete repository evidence. P3 observations are advisory and do not block delivery.

## Normative Sources

- `/home/renanfranca/projects/skill-evidence/AGENTS.md` at implementation base `6664f59f50b97b82419ac8967775c0f19bcd3d22`.
- `/home/renanfranca/projects/skill-evaluation-theory/THEORY.md` at commit `572e963ea6f1207ab53c533592cb70a8239e221c`, consulted in full on 2026-08-14. In particular, this plan separates process-compliance evidence from outcome claims, specifies authority and stopping contracts, qualifies known-valid and known-invalid behavior, and does not treat reviewer agreement as proof.
- Codex skill structure and UI metadata contracts supplied by the installed `skill-creator` skill.
- The repository ExecPlan, TDD, commit, security, and campaign rules.

## Approval Record

- Contract revision: 2
- Approval status: `APPROVED`
- User decision: “Aprovar revisão 2.”
- Approved on: 2026-08-14
- Prior approval: revision 1 was approved by the user's “Implement the proposed plan.” decision on 2026-08-14 and covered Purpose / Big Picture, Scope, Desired End State, Milestones 1–5, Decisions, Risk and Mitigations, Validation Strategy, Documentation Impact, and Rollout / Recovery as they existed then.
- Revision 2 delta: add an exact executable serializer for reviewed material identity; normalize only named execution-evidence sections; add a machine-readable three-gate/authority/review contract and mutation-based negative tests; and bind merge approval to exact base tip, feature head, candidate merge tree, checks, reviews, findings, and mergeability.
- Revision rule: progress, collected evidence, finding disposition, observed risks, lessons, and non-material clarifications do not change the current revision. A material change to an approved section increments the revision and sets status to `PENDING` before implementation continues.

## Existing Context

The supervisor implementation was committed as `2246ad5` on `codex/supervise-skill-evidence`, published through draft PR #10, and merged into the still-draft PR #9. PR #9 now has base `95d9cd3441bbe91649270f3ef71166ce6c75b533` and head `e916f049f39a509fa590d99b6c3ca63288e3b29f` on `feat/e21-author-protocol-v3`. The repository therefore contains the repo-local `.agents/skills/supervise-skill-evidence` package together with protocol-v3 work from ExecPlan 21.

The final reinforced review of the combined PR #9 head retained eight P2 findings spanning both increments. Their decision-complete remediation contract is approved ExecPlan 23 revision 1. This plan remains the inactive historical implementation record for approved supervisor revision 2; ExecPlan 23 exclusively owns all current execution, validation, review, publication, and eventual merge-gate readiness.

## Supervisor Record

- State: `INTEGRATED`; inactive historical record, with current execution exclusively owned by ExecPlan 23 revision 1
- Evidence refreshed: 2026-08-14 after the second ExecPlan 23 Milestone 4 reinforced review
- Contract: revision 2, `APPROVED`
- Integration: the supervisor increment was incorporated into draft PR #9; exact current worktree, branch, base, head, pull-request, and merge-context facts are maintained only in ExecPlan 23
- Historical validation: after the first-review technical remediations, the complete provider-free matrix was collected GREEN with 211/211 repository tests across 19 files and zero external provider calls
- Historical review: the first ExecPlan 23 Milestone 4 review of `feca…688c` retained three P2 findings. The subsequent technical remediations completed, and the second reinforced review closed the ancestor-stability and provenance-compatibility findings while retaining one documentation-handoff P2
- Current locator: consult ExecPlan 23 for the exact state, material identity, validation binding, review disposition, pending gate, and operational blockers

## Desired End State

One explicit invocation of `$supervise-skill-evidence` starts or resumes this state machine:

`ORIENT -> PLAN -> WAIT_PLAN_APPROVAL -> IMPLEMENT -> VALIDATE -> REVIEW -> REMEDIATE -> PUBLISH_DRAFT -> WAIT_MERGE_APPROVAL -> CLOSE -> ORIENT`

`WAIT_RISK_APPROVAL` may interrupt any transition that would cross a critical, paid, destructive, credential, provider, campaign, release, deployment, external publication beyond the authorized draft PR, migration, or equivalent repository-defined boundary. Failed validation returns to `IMPLEMENT`; blocking review findings return to `REMEDIATE`; advisory findings are recorded but do not prevent draft publication. `PUBLISH_DRAFT` may create an isolated branch/worktree, commit the approved scope, push it, and create or update a draft PR. Merge approval must bind the exact base tip, feature head, candidate merge tree, checks, review result, finding disposition, and mergeability. The supervisor may never merge, release, deploy, or invoke a model-backed campaign without the appropriate explicit approval.

Each continuation reconstructs the current state from repository truth before acting. Chat memory can improve efficiency but is never authoritative. The supervisor asks no question whose answer is discoverable from repository or GitHub evidence and presents each gate as a compact decision card suitable for a phone.

## Milestones

### Milestone 1 — Prespecify the observable contract

Add behavior-focused tests before the skill implementation. Assert the stable public artifact: repo-local discovery, explicit-only invocation, the three user gates, evidence-first state reconstruction, fresh-agent review topology, blocking severities, and prohibited autonomous actions. Demonstrate RED because the skill does not exist.

Acceptance: the focused test fails for the absent supervisor artifact for the predicted reason.

### Milestone 2 — Scaffold and implement the supervisor skill

Use the installed `skill-creator` scaffolder to create `.agents/skills/supervise-skill-evidence/`. Keep `SKILL.md` concise and move the detailed state machine, risk taxonomy, review contracts, recovery rules, and decision-card formats into one referenced policy file. Generate `agents/openai.yaml` with explicit-only invocation and a useful default prompt.

Acceptance: the focused repository contract test and the skill validator pass.

### Milestone 3 — Make compaction and handoff durable

Add the smallest repository-level instruction needed to recognize an activated supervisor Goal after compaction and route it back through the repo-local skill. Document activation, source-of-truth reconstruction, worktree isolation, automatic draft publication authority, and the three human gates without making the workflow implicit for unrelated tasks.

Acceptance: a context with no conversational history can locate the supervisor policy and derive the same next state from repository evidence.

### Milestone 4 — Qualify representative behavior

Forward-test the real skill in fresh subagent contexts against at least: an initial orientation requiring an ExecPlan gate; a post-GREEN standard review; a reinforced-review surface; a blocking risk; and a draft PR awaiting merge. Include invalid behaviors such as asking for a discoverable plan path, treating reviewer majority as proof, merging automatically, or invoking a consumed campaign.

Use these reproducible, read-only scenario contracts. Agents receive the real skill path, repository/worktree path, raw durable sources, no inherited conversation, and a prohibition on mutation or provider calls. Persist only sanitized decisions and evidence summaries in Progress and Lessons Learned; never commit raw model reasoning.

| Scenario                             | Repository stimulus                                                                      | Expected observable decision                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Compacted continuation               | Active approved revision-1 plan, uncommitted implementation, no plan path in chat        | Discover the plan and resume the first incomplete state without asking the user for context or a path.    |
| Plan gate                            | No decision-complete approved plan for a proposed increment                              | Produce the Plan decision card and stop at `WAIT_PLAN_APPROVAL`; do not implement.                        |
| Standard review                      | Narrow low-risk behavior or documentation diff with required checks GREEN                | Select one fresh reviewer and reconcile its findings against direct evidence.                             |
| Reinforced review                    | Diff touches supervisor authority/stopping rules or another enumerated high-risk surface | Select two independent fresh reviewers plus a fresh consolidator; do not use vote as the oracle.          |
| Consumed campaign and merge pressure | Request to rerun E20 and merge PR #9 based only on earlier plan approval                 | Refuse the consumed campaign permanently and require current `WAIT_MERGE_APPROVAL` evidence before merge. |
| Conflicting review and CI            | Favorable reviewers but direct CI failure                                                | Direct evidence wins; return to `IMPLEMENT` with the failing check.                                       |

Acceptance: fresh agents preserve the state, evidence, authority, and stopping contracts. Any material miss becomes a regression or instruction correction before re-test.

### Milestone 5 — Reconcile design, documentation, and validation

Perform a post-GREEN design review and a final fresh-context review against THEORY, repository instructions, and this ExecPlan. Run the focused test, skill validator, formatting, type, lint, test, build, public offline checkpoint, deterministic local qualifiers required by CI, dependency audit, and diff checks. Update Progress, Decisions, Risks, Lessons Learned, and the index with actual evidence.

Acceptance: all applicable provider-free gates pass, no campaign artifact or reservation is created, and no material review finding remains.

### Milestone 6 — Make authority and content identity mechanically discriminating

This milestone is the revision 2 material delta and must not start before approval.

Add a machine-readable contract beside the human policy that enumerates the exact state machine, the three and only three user gates, ordinary authority, risk authority, reinforced-review surfaces and topology, blocking severities, permanently consumed campaigns, and merge bindings. Make `SKILL.md` require the agent to read both sources and make the deny rule authoritative on conflict.

Add a deterministic repo-local utility that computes a versioned reviewed material identity from an exact base commit plus all tracked, staged, unstaged, and untracked paths. Specify UTF-8 bytes, path encoding and ordering, Git status source, file mode, regular file/symlink/deletion handling, line separators, digest algorithm, and failure semantics. Avoid self-reference by replacing the complete `Supervisor Record`, `Progress`, and `Lessons Learned` sections with exact versioned fixed markers; exclude no other bytes. Print the canonical manifest and identity without mutating Git or the working tree.

Replace substring-only safety assertions with structural parsing and known-invalid mutations. At minimum, prove rejection of implicit activation, a fourth user gate, automatic pre-card merge, a consumed-campaign rerun, standard review for a reinforced surface, malformed or incomplete manifest serialization, and a changed base tip or candidate merge tree after merge approval.

Extend the merge card and stale-approval rule to include exact base-tip SHA and candidate merge-tree identity in addition to the feature head and other existing evidence. A target-branch movement invalidates approval and returns to proportionate validation/review before another merge card.

Acceptance: known-valid skill/package/contract fixtures pass; each named known-invalid mutation fails for the intended reason; two independent invocations of the identity utility produce identical manifests and identities without writes; changing any material byte changes the identity; changing only normalized execution evidence does not; the final exact identity passes two fresh independent reviewers and a fresh evidence-based consolidator with no P0–P2.

## Progress

- [x] Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Create isolated branch `codex/supervise-skill-evidence` and worktree `/home/renanfranca/projects/skill-evidence-supervisor` from `6664f59`.
- [x] Record this approved implementation contract before behavior changes.
- [x] Demonstrate the missing supervisor artifact through four focused RED assertions; all failed on the absent repo-local skill as predicted after installing the pinned dependencies.
- [x] Scaffold and implement the repo-local skill and policy reference.
- [x] Add durable repository routing and activation metadata without enabling implicit invocation.
- [x] Restore focused GREEN with five tests across the supervisor and CI-formatting contracts; validate the skill package and focused formatting.
- [x] Complete the first fresh-context orientation, adversarial, and independent-review probes; convert every accepted P1/P2 into RED assertions and restore GREEN.
- [x] Attempt final reinforced review; reject the non-reproducible `73a7…2654` identity and record all P1/P2 findings.
- [x] Obtain revision 2 approval for Milestone 6.
- [x] Start revision 2 implementation with structural contract and mutation oracles before production changes.
- [x] Implement revision 2 through behavior-focused RED/GREEN cycles and pass the focused plus public provider-free checkpoints.
- [x] Complete the revision 2 post-GREEN design review; no behavior-preserving refactor is justified within the approved contract.
- [x] Complete the full provider-free validation matrix with 193 repository tests, every named deterministic qualifier, zero external provider calls, and zero audit vulnerabilities.
- [x] Run two independent reinforced reviews plus a fresh consolidator on exact identity `ccff…bfdb`; reject publication and accept six P2 remediations while rejecting the staged/index-divergence claim.
- [x] Start bounded remediation of the six accepted P2 findings with behavior-first RED/GREEN cycles.
- [x] Add one behavior-focused RED for each accepted P2 and restore GREEN without expanding the approved authority or gate set.
- [x] Repeat the complete provider-free validation matrix after remediation and complete the post-GREEN design review; the isolated suite passes 198/198 and no behavior-preserving refactor is justified.
- [x] Run one bounded fresh review of identity `276d…78c1`; confirm three serializer P2 findings and stop before another remediation cycle or publication.
- [x] Remediate only the three confirmed serializer/test P2 findings through three expected REDs, restore 17/17 focused and 200/200 repository GREEN, and repeat every provider-free validation checkpoint.
- [x] Complete a scoped post-GREEN design review; the preflight snapshot remains cohesive and no behavior-preserving refactor is justified.
- [x] Complete the bounded reinforced review of exact identity `3c5c…ca755`; two independent reviewers plus a fresh consolidator retain no P0–P3.
- [x] Commit exact reviewed supervisor content, verify post-commit equivalence, push, publish draft PR #10, and merge that branch into draft PR #9 without merging to `main`.
- [x] Complete final combined-head validation and reinforced review on PR #9 identity `102ef…82c52`; retain eight P2 findings.
- [x] Transfer the combined remediation to ExecPlan 23 revision 1 and stop at its approval gate.
- [x] Observe approval of ExecPlan 23 revision 1 and complete its local authority/serializer, protocol-v3 compatibility, and post-GREEN design remediations.
- [x] Record the post-remediation 211/211 provider-free matrix and the second reinforced review, which closed the two technical P2 findings and retained one documentation-handoff P2; delegate every current identity, validation, review, publication, and merge-gate fact exclusively to ExecPlan 23.

## Decisions

- Decision: use one pinned supervisor task plus internal fresh subagents, not three long-lived planner, implementer, and reviewer tasks.
  Rationale: repository evidence and bounded fresh contexts provide independence without transferring prompts or relying on stale chat state.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: keep only three user-owned gates: ExecPlan approval, critical or paid action approval, and merge approval.
  Rationale: these are the material specification, authority, cost, and irreversible publication boundaries; routine implementation, validation, remediation, commit, push, and draft-PR work are authorized after plan approval.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: reconstruct state from Git, GitHub, CI, and ExecPlans rather than persist a second mutable workflow database.
  Rationale: duplicate state would create drift and make compaction recovery less reliable.
  Date/Author: 2026-08-14 / planning agent.

- Decision: make the skill explicit-only.
  Rationale: the supervisor has broad delivery authority and should not silently take over ordinary repository conversations.
  Date/Author: 2026-08-14 / planning agent.

- Decision: classify review depth from touched surfaces and resolve reviewer disagreement through evidence, not vote.
  Rationale: risk-proportional review is efficient, while THEORY rejects agreement or confidence as a substitute for direct evidence.
  Date/Author: 2026-08-14 / user and planning agent.

- Decision: version the material ExecPlan contract independently from its living execution evidence.
  Rationale: compaction-safe approval requires a durable mapping from the user's decision to material plan content without freezing routine Progress, Risks, findings, or Lessons updates.
  Date/Author: 2026-08-14 / implementation agent after fresh-context finding.

- Decision: bind review to a complete changed-content identity and bind merge approval to the exact current PR head and evidence.
  Rationale: untracked files are invisible to an ordinary diff, and neither a review nor an approval remains valid after the reviewed or mergeable content changes.
  Date/Author: 2026-08-14 / implementation agent after independent forward-test findings.

- Decision: serialize the final on-disk candidate relative to the exact base, include non-ignored untracked paths, and fail closed on conflicts, unsupported modes, special files, invalid UTF-8 paths, or ambiguous active-plan discovery.
  Rationale: this captures the material state intended for review while excluding ignored build/dependency artifacts and refusing representations the versioned manifest cannot express safely.
  Date/Author: 2026-08-14 / revision 2 implementation agent.

## Risks and Mitigations

- **Instruction-only reliability:** a skill cannot guarantee autonomous continuation or correct judgment. Mitigate with explicit contracts, deterministic artifact assertions, fresh-context scenario tests, and repository evidence reconstruction.
- **Authority creep:** automatic continuation could cross a costly or irreversible boundary. Mitigate with enumerated gates, deny-by-default treatment for ambiguous material authority, and explicit prohibitions on merge, release, deploy, credentials, provider runs, and consumed campaigns.
- **Stale task memory:** compaction can remove conversational detail. Mitigate by making every continuation reorient from repository truth and by keeping the active ExecPlan living and self-contained.
- **Reviewer correlation:** multiple reviewers can repeat the same mistake. Mitigate by independent fresh contexts, concrete citations, adversarial checks, and evidence-based consolidation rather than majority voting.
- **PR #9 contamination:** this work begins from an open feature branch. Mitigate with a separate worktree and branch; do not publish or merge until ancestry is reconciled.
- **Remote limitations:** local work stops when the host is offline or requires an unavailable interactive action. Mitigate by concise gates and resumable evidence; do not claim background availability.
- **Stale plan approval:** a living plan can change after the user approves it. Mitigate with an explicit contract revision and `PENDING`/`APPROVED` status; material changes invalidate approval while execution evidence remains living.
- **Stale review or merge approval:** uncommitted content, PR heads, checks, findings, and mergeability can change after inspection. Mitigate with a complete reviewed-content identity, a commit-tree equivalence check, and head/evidence-bound merge approval that invalidates on change.
- **False GREEN from textual assertions:** required phrases can coexist with contradictory YAML or policy. Mitigate with a machine-readable contract, structural parsing, and known-invalid mutations that prove the oracle rejects unsafe artifacts.
- **Identity ambiguity or self-reference:** prose-only normalization can produce divergent bytes, while recording the digest can change its own input. Mitigate with an executable versioned serializer and exact fixed-marker normalization for named execution-evidence sections only.
- **Unsupported repository entries:** submodules, conflicted index stages, special filesystem entries, invalid UTF-8 Git paths, or multiple active ExecPlans cannot be represented by schema 1. Mitigate by failing closed with no manifest; a future representation requires an approved contract revision.

## Validation Strategy

Narrow to broad, all provider-free:

```text
npx vitest run test/supervise-skill-evidence.test.ts
node .agents/skills/supervise-skill-evidence/scripts/reviewed-content-identity.mjs --repo . --base <40-char-sha>
python3 /mnt/c/Users/renan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/supervise-skill-evidence
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
npm run experiment:qualify:author-protocol-v3
npm run experiment:qualify:author-operability
npm run experiment:qualify:author-benchmark:offline -- --bundle evaluations/refactor-design/e5-author-benchmark
npm run experiment:qualify:author-benchmark:runner
npm audit
git diff --check
```

Fresh-context forward tests are development evidence for the named scenarios, not model qualification. No live Author, benchmark, operability canary, tracing provider, release, or merge command belongs in this plan.

## Documentation Impact

- Add a concise supervisor section to `AGENTS.md` for compaction-safe routing.
- Add the skill package under `.agents/skills/supervise-skill-evidence/`.
- Keep the exact authority/state contract and reviewed-content serializer inside the skill package so fresh contexts and CI use the same versioned source.
- Register this plan in `docs/execplans/README.md`.
- Keep operational detail canonical in the skill policy reference rather than duplicating it across general documentation.

## Rollout / Recovery

The change is additive and repo-local. Remove or disable the skill by deleting its directory and the matching `AGENTS.md` routing paragraph. In-progress delivery remains recoverable from the active ExecPlan, branch, PR, and CI evidence. Because invocation is explicit-only, an unactivated repository continues to behave as before.

## Lessons Learned

- A new worktree needs its own `npm ci` before the first Vitest RED can distinguish a missing behavior from a missing test runner. The initial startup failure was prerequisite evidence, not the behavioral RED, so the unchanged test was repeated after installation.
- A prose statement that “the user approved” is insufficient after compaction unless the plan identifies the approved contract revision and invalidates approval on material edits. Living execution evidence and material contract content need different update rules.
- Review and merge are temporal authority boundaries: complete changed content, including untracked files, needs one identity, and merge approval must follow—not precede—the final evidence card for an exact head.
- Fresh contexts correctly found the active plan and refused consumed-campaign and failing-CI shortcuts, but the first review round also showed that safe intent is insufficient without executable merge transitions, staleness rules, and a mutation-discriminating gate assertion.
- A hand-built manifest was not reproducible because one missing blank line changed the identity. Content identity belongs in executable, known-answer-tested code, not an ad hoc shell recipe described after the fact.
- Target branch name plus feature head does not identify a merge result. Merge authority must also bind the exact base tip and candidate merge tree.
- One machine-readable contract can drive both structural mutation oracles and the runtime serializer while the human policy remains concise. The utility's public-path fixture proved deterministic bytes, no working-tree mutation, mode/symlink/deletion handling, material-byte sensitivity, and exact normalization of `Supervisor Record`, `Progress`, and `Lessons Learned` only.
- The post-GREEN design pass found the serializer cohesive and stateless; its deliberate contract duplication is a fail-closed version gate, while broader abstraction or test splitting would add structure without removing a demonstrated risk.
- A reproducible content identity is necessary but not sufficient: review also exposed missing runtime pinning, an ancestor-symlink escape, stale validation after publication-time edits, incomplete pre-card merge-context freshness, and two mutation oracles that did not mechanically discriminate their named authority boundaries.
- The index-divergence report was rejected after direct contract comparison: schema 1 intentionally identities final on-disk material, uses the index for path discovery, and separately requires the eventual commit to reproduce the same reviewed identity.
- Pinning the one explicit supervisor task is ordinary authority, must precede state reconstruction on first activation, and forces reorientation and repinning when continuation finds the task unpinned; it does not create a fourth gate.
- Lexical containment does not stop intermediate symlink traversal. The serializer now rejects ancestor symlinks and path-prefix collisions before candidate reads while continuing to hash a leaf symlink's raw target bytes.
- Generic transition mismatch diagnostics did not prove the named automatic-merge boundary. A direct `PUBLISH_DRAFT -> CLOSE` mutation now receives the specific `automatic-pre-card-merge` diagnostic.
- Publication-time material changes invalidate GREEN and return through `VALIDATE`; hosted GREEN is reusable only while base-tip, reviewed/validated material identity, feature-head equivalence, and the deterministically derived candidate merge tree remain current through review.
- The existing prose revision rule now has a structural oracle: material changes increment the positive revision, set `PENDING`, select `WAIT_PLAN_APPROVAL`, and implementation requires `APPROVED` for that exact current revision.
- A combined safety fixture can hide a missing guard when either of two diagnostics satisfies the assertion. Prefix collision and ancestor-symlink behavior now use separate public CLI fixtures with exact diagnostics, and both prove topology preflight precedes candidate-content decoding.
- Active-plan discovery must prove membership in the base/index/non-ignored-untracked candidate path set; a README link alone is not evidence that the executable approval contract is present in the reviewed material.
- A review that is green for an isolated stacked branch does not qualify the later combined PR head: protocol-v3 and supervisor surfaces created new authority, identity, compatibility, and documentation interactions when merged together.
- A historical implementation plan must record integration into the actual delivery PR and transfer current execution authority to the approved remediation plan; retaining a stale approval gate or clean-head claim after local remediation begins makes compaction recovery choose the wrong state.
