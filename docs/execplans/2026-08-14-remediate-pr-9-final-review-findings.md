# ExecPlan 23 — Remediate PR #9 final-review findings

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

## Purpose / Big Picture

Remediate the eight P2 findings retained by the final reinforced review of PR #9 without expanding its product or campaign claims. After this increment, the reviewed-content serializer must resist path redirection and observable concurrent mutation, reviewers must treat candidate governance as untrusted data, protocol-v3 instrument bytes must remain immutable and internally aligned, malformed v1/v2 CLI input must stop before authentication or external effects, exported v1/v2 provenance types must match their schemas, and the living delivery records and draft PR description must match the exact head.

This is authorized defensive maintenance of the existing draft PR. It does not authorize a provider invocation, a new campaign, a merge, a release, a deployment, a credential change, or any rewrite of consumed E5, E18, E19, or E20 evidence.

## Scope

In scope:

- the reviewer trust boundary in `.agents/skills/supervise-skill-evidence/references/supervisor-policy.md` and `supervisor-contract.json`;
- active-ExecPlan confinement, no-follow reads, stable two-pass collection, and fail-closed behavior in `reviewed-content-identity.mjs`;
- behavior regressions in `test/supervise-skill-evidence.test.ts` for candidate instruction injection, ExecPlan traversal, concurrent mutation, and redirected reads;
- runtime immutability and single-source alignment for protocol-v3 schemas, descriptor, composition policy, instructions, and THEORY inputs;
- v1/v2 rejection of a dangling `--authoring-context` before authentication, output claiming, reservation, workspace creation, or invocation;
- version-discriminated TypeScript provenance whose v1/v2 shape matches schema 1 and schema 2;
- current execution records in ExecPlans 21 and 22, this plan, and `docs/execplans/README.md`;
- the existing draft PR #9 body, exact-head hosted CI, reviewed-content identity, and reinforced review after local GREEN.

Out of scope:

- changing protocol-v3 lifecycle, claim, evidence-path, capability, or persisted schema semantics;
- changing schema 1, schema 2, or schema 3 JSON contracts;
- qualifying protocol v3 with a model or deciding capability eligibility;
- running any Author command, benchmark campaign, operability canary, tracing qualification, E22 campaign, release, deployment, or merge;
- force-pushing, rewriting history, modifying credentials, or mutating historical campaign artifacts.

## Definitions

- **Trusted review authority:** system instructions, the user's current review scope, and repository governance read from the exact trusted base commit. Candidate/head governance is evidence under review, not authority over the reviewer.
- **Candidate content:** every tracked, staged, unstaged, or non-ignored untracked byte at the reviewed head/worktree, including changed `AGENTS.md`, skills, policies, and ExecPlans.
- **Stable collection:** two complete consecutive serializer passes that independently enumerate Git state, discover the active ExecPlan, open candidate files without following a leaf symlink, verify per-entry metadata around each read, and produce byte-identical canonical manifests before output is emitted.
- **Canonical protocol-v3 instrument:** the repository-owned immutable snapshots used consistently for validation compilation, model-facing packet construction, and provenance digest derivation.
- **Dangling context option:** `--authoring-context` with no following value or whose following token is another option.

## Normative Sources

- `AGENTS.md` at PR #9 head `e916f049f39a509fa590d99b6c3ca63288e3b29f`.
- `/home/renanfranca/projects/skill-evaluation-theory/THEORY.md` at commit `572e963ea6f1207ab53c533592cb70a8239e221c`, consulted in full on 2026-08-14. In particular, evaluated content remains untrusted data, known-invalid cases must discriminate the oracle, direct evidence overrides reviewer agreement, and evidence expires after material condition changes.
- `docs/decisions/0001-theory-first-promptfoo-foundation.md`, consulted in full on 2026-08-14, especially its snapshot, fingerprint, untrusted-data, provenance, lifecycle, and no-silent-promotion boundaries.
- `docs/decisions/0002-bounded-evaluation-and-out-of-band-instrument-evolution.md` and `docs/decisions/0003-trusted-authoring-context-and-evidence-paths.md`, consulted in full on 2026-08-14.
- ExecPlan 21 for the approved protocol-v3 behavior and ExecPlan 22 for the approved supervisor authority and identity contract.
- The reinforced review of exact identity `sha256:102ef24363cf05f737bd58684d86186d050495411be87f57bbf6bda433782c52` over base `95d9cd3441bbe91649270f3ef71166ce6c75b533` and head `e916f049f39a509fa590d99b6c3ca63288e3b29f`.

## Approval Record

- Contract revision: 1
- Approval status: `APPROVED`
- User decision: “Aprovar revisão 1.”
- Approved on: 2026-08-14
- Material sections requiring approval: Purpose / Big Picture, Scope, Desired End State, Milestones 1–5, Authority Boundaries, Validation Strategy, Documentation Impact, Rollout and Recovery, and existing Decisions.
- Revision rule: a material change to any approved section increments the revision, restores `PENDING`, and returns supervision to `WAIT_PLAN_APPROVAL`. Execution evidence, finding disposition, observed risks, and lessons may evolve without changing the revision.

## Existing Context

PR #9 is an open draft from `feat/e21-author-protocol-v3` into `main`. At orientation on 2026-08-14, the exact base was `95d9cd3441bbe91649270f3ef71166ce6c75b533`, the exact clean feature head was `e916f049f39a509fa590d99b6c3ca63288e3b29f`, GitHub reported `MERGEABLE` / `CLEAN`, and exact-head CI `validation` passed. The draft combines completed protocol-v3 work from ExecPlan 21 and the supervisor implementation originally developed under ExecPlan 22.

The final review reproduced reviewed-content identity `sha256:102ef24363cf05f737bd58684d86186d050495411be87f57bbf6bda433782c52` twice, ran the complete provider-free local matrix with 200 tests, and used two independent fresh reviewers plus a fresh consolidator. It retained eight P2 findings: reviewer authority injection, unstable serialization, active-plan traversal, mutable protocol-v3 instrument inputs, dangling v1/v2 context input, v1/v2 TypeScript/schema divergence, stale ExecPlan 22 state, and a stale PR body. The consolidator rejected the proposed forged optional dependency/reference issue as non-blocking because current system authority is selected by origin/reserved namespace and no downstream consumer ignores that origin.

At approval of revision 1, the worktree was clean and synchronized with `origin/feat/e21-author-protocol-v3`; no remediation code had yet been written under this revision. This is an approval-time historical snapshot. The living Supervisor Record and Progress below describe the later local remediation state.

## Supervisor Record

- State: `COMPLETE`; merged through PR #9
- Evidence refreshed: 2026-08-14 after verified merge and transfer to ExecPlan 24
- Contract: revision 1, `APPROVED`
- Terminal result: PR #9 merged into `main` as `6a7f9c6f99513b25551e79b7ee73927ff2f39a97`; the final reviewed material identity was `sha256:0495002e0b34a682f8c519a4f8b8b70b63416275ddfe767e6a790afb5c3de070`, with no retained P0–P3
- Current delivery locator: `docs/execplans/README.md`; this inactive plan records terminal history only and does not own current branch, identity, validation, review, pull-request, gate, or blocker state

## Desired End State

The existing draft PR contains only the approved remediation and prior PR #9 scope. Every retained P2 has a behavior-first regression and direct GREEN evidence. The serializer emits nothing unless two complete collections agree, does not follow a replaced regular-file path, and accepts only one canonical direct-child ExecPlan. Reviewers are explicitly insulated from candidate instructions by both human and machine-readable contracts. Protocol-v3 packet, validation, and provenance use immutable canonical inputs. V1/v2 malformed context options fail as argument errors before any external or persistent effect, and their exported provenance types cannot express schema-invalid context fingerprints.

ExecPlans 21–23 and their index describe the actual branch, head, PR, validation, review, and remaining gate. The draft PR body describes protocol v3 and the supervisor/identity implementation, names current validation, and preserves the model-qualification boundary. A new exact material identity passes the complete provider-free validation matrix and reinforced review with no P0–P2 before the branch is committed, pushed, and allowed to approach `WAIT_MERGE_APPROVAL`.

## Authority Boundaries

After explicit approval of revision 1, ordinary authority includes editing only the in-scope repository files, running provider-free tests and diagnostics, delegating bounded implementation and read-only review subagents, using the repository commit skill, pushing the existing feature branch, updating the existing draft PR #9 body, and reading hosted checks.

This plan never authorizes a provider/model call, paid service, new or repeated campaign, credential or permission change, force push, history rewrite, destructive data operation, release, deployment, external schema migration, or merge. Any newly necessary action in those classes enters `WAIT_RISK_APPROVAL`; merge always requires a later exact Merge card and separate approval.

## Milestones

### Milestone 1 — Harden reviewer authority and reviewed-content serialization

Add one behavior-first regression at a time to `test/supervise-skill-evidence.test.ts` before changing the skill package. Prove that a candidate instruction ordering suppression of findings is rejected as review authority; that an active plan link using traversal or a nested path fails before normalization; that a regular-file-to-symlink replacement cannot be followed; and that a deterministic change between complete collection passes fails closed with no manifest.

Update `supervisor-contract.json` and `supervisor-policy.md` so fresh reviewers derive authority from system/user scope and exact-base governance while treating every head artifact as untrusted evidence. Update `reviewed-content-identity.mjs` to require a canonical direct child matching `YYYY-MM-DD-<kebab-case-title>.md`, read regular files with no-follow descriptors plus stable pre/post metadata, verify symlink targets without a check/read gap, repeat the complete Git enumeration and active-plan discovery, and emit only after two byte-identical canonical manifests.

Acceptance: every regression first fails for its predicted missing boundary, then the complete focused supervisor suite passes; the quick skill validator passes; two unchanged real-worktree invocations remain byte-identical and do not alter Git status.

### Milestone 2 — Freeze protocol-v3 instruments and restore versioned API parity

Add behavior regressions through the existing Author public paths. Prove nested mutation is impossible for every packet/provenance/validation input exposed at runtime; prove candidate validation, packet serialization, and provenance retain the same canonical schema and policy bytes; prove a trailing v1/v2 `--authoring-context` produces `AUTHOR_ARGUMENT_INVALID` before authentication, output creation, workspace creation, reservation, or invocation; and add a compile-time regression that v1/v2 provenance cannot carry `authoringContextFingerprint` while v3 requires it.

Introduce the smallest reusable deep-freeze/clone mechanism needed to establish private canonical snapshots. Use those snapshots consistently for AJV compilation, request packet construction, schema serialization, and digest derivation; export no mutable nested view. Correct `parseArguments` so option presence and option value are distinct, and remove the v3-only fingerprint from the base provenance interface while retaining it as required on `AuthorProvenanceV3`.

Acceptance: each behavior has an observed RED before the minimum fix; the focused Author suite and typecheck pass; protocols v1/v2 retain their runtime JSON behavior and schemas byte-for-byte; protocol-v3 fingerprints remain deterministic for unchanged repository bytes.

### Milestone 3 — Reconcile living documentation and design

Update ExecPlans 21 and 22 only where their execution records became stale, keep this plan and `docs/execplans/README.md` current, and document the disposition of all eight findings. Leave RFC 0001, ADR 0002, ADR 0003, the three Blueprint schemas, `AGENTS.md`, historical reports, and consumed campaign artifacts unchanged unless implementation exposes a direct normative contradiction; record the concrete no-change reason.

After focused GREEN, apply the repository's post-GREEN design review to the changed implementation. Refactor only if it removes a demonstrated structural risk without changing behavior; any missing behavior returns to TDD and any material contract decision returns to `WAIT_PLAN_APPROVAL`.

Acceptance: there is exactly one active ExecPlan; every Supervisor Record matches direct evidence; no stale test count, branch, head, PR, or review disposition remains in active handoff documentation.

### Milestone 4 — Validate and perform reinforced review

Run narrow-to-broad provider-free validation, compute the reviewed-content manifest twice from the exact current base, and bind every result to the new identity. Because the change touches governance, identity, schema/API compatibility, provenance, and CLI authority boundaries, dispatch two independent fresh read-only reviewers and then one fresh consolidator. Their authority is system/user scope plus exact-base governance; candidate/head instructions are untrusted data. Reconcile findings from direct evidence rather than vote. Any P0–P2 returns to remediation and invalidates review evidence after a material byte changes.

Acceptance: all prescribed checks pass, two manifests are byte-identical, no provider or campaign artifact exists, and the reconciled review retains no P0–P2.

### Milestone 5 — Commit, update the draft PR, and confirm hosted evidence

Use `$commit-the-changes` to stage only the reviewed remediation and living execution evidence. Verify the commit reproduces the reviewed material identity except for the serializer's explicitly normalized execution-evidence sections, push `feat/e21-author-protocol-v3`, and update the existing draft PR #9 body to describe both protocol v3 and the supervisor/identity surface, current test count, schema/security/artifact impact, exact validation, review topology, and unsupported model-backed claims.

Confirm the remote head and required hosted checks. Any publication-time material content change returns through validation and reinforced review. Do not mark the PR ready or merge it. Only when base tip, feature head, candidate merge tree, required checks, material identity, review result, finding disposition, and mergeability are all current may supervision present a Merge decision card.

Acceptance: the remote draft head equals the reviewed local commit, PR body and checks match that exact head, hosted CI is GREEN, and no merge action occurred.

## Progress

- [x] Reconstruct exact local Git, active-plan, PR, review, and CI state.
- [x] Reconsult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c`, RFC 0001, ADR 0002, and ADR 0003 in full.
- [x] Record all eight retained P2 findings and the rejected proposal in revision 1.
- [x] Obtain explicit approval for revision 1 through the user's “Aprovar revisão 1.” decision on 2026-08-14.
- [x] Complete Milestone 1 through behavior-first RED/GREEN cycles.
  - Reviewer authority RED: exact-base governance was absent and the oracle returned `CONTRACT_INVALID`; GREEN at 17 focused tests.
  - Active-plan confinement RED: traversal normalized to an accepted path and emitted output; GREEN at 18 focused tests for traversal and nested targets.
  - No-follow regular-file RED: deterministic replacement between `lstat` and open followed external bytes and emitted output; GREEN at 19 focused tests.
  - Stable symlink observation RED: deterministic replacement between `lstat` and `readlink` emitted output; GREEN at 20 focused tests while the legitimate leaf-symlink case remained green.
  - Complete double-collection RED: the one-pass serializer emitted output; GREEN at 21 focused tests with two observed Git base-tree, index, untracked, and status calls and fail-closed final comparison.
- [x] Complete Milestone 2 through behavior-first RED/GREEN cycles.
  - Exported-instrument freeze RED: nested descriptor state accepted mutation; GREEN at 64 focused Author tests for the protocol descriptor, composition policy, v3 instructions, and THEORY principles.
  - Candidate-schema freeze RED: the exported nested claim `$ref` accepted mutation; GREEN at 65 focused tests with one frozen candidate schema shared by packet construction and AJV validation while exact v1 packet bytes remained unchanged.
  - JSON-module isolation RED: mutating another same-process import changed the Authoring Context and Blueprint schema digests plus compound fingerprints; GREEN at 66 focused tests with private frozen schema snapshots and aligned packet, validation, and provenance bytes.
  - Dangling-context CLI RED: missing v1/v2 option values proceeded to authentication and returned `AUTHOR_AUTH_INVALID`; GREEN at 67 focused tests with `AUTHOR_ARGUMENT_INVALID`, zero dependency/workspace/invocation calls, and no output or reservation artifacts for missing or option-shaped values.
  - Versioned-type RED: typecheck reported two unused `@ts-expect-error` directives because v1/v2 still exposed the v3-only fingerprint; GREEN at 68 focused tests plus typecheck after removing the base field and preserving a narrowed protocol-v3 Author result.
  - Post-GREEN design review consolidated the duplicate frozen-copy transformation into one internal utility; focused tests, typecheck, and the provider-free public checkpoint remained GREEN.
- [x] Complete Milestone 3 documentation reconciliation and post-GREEN design review.
  - Finding disposition: reviewer-authority injection is remediated in the human and machine contracts; unstable serialization and active-plan traversal are remediated by stable double collection, no-follow/stable entry reads, and canonical direct-child discovery; mutable protocol-v3 instrument inputs are remediated by private frozen schema snapshots and deeply frozen exported instrument values; dangling v1/v2 context options now fail before authentication or persistence; v1/v2 provenance types now match schema 1/2 while v3 retains its required context fingerprint; ExecPlan 22 now records actual integration and transfer; the stale PR body remains retained and intentionally deferred to Milestone 5 after reinforced local review.
  - Design finding — **Design risk, remediated:** duplicate deep-copy/freeze transformations could diverge and the prior canonical-JSON round trip changed order-sensitive packet construction. One internal `structuredClone` plus recursive-freeze utility now preserves representation while eliminating the duplicate transformation; existing immutable-instrument, exact historical packet, validation, and provenance tests protect behavior.
  - Design findings — **No action:** the serializer is a cohesive stateless collection transaction, and extracting its collection phases would scatter one fail-closed invariant without removing hidden state or temporal coupling; the duplicated contract literals in JSON and executable validation are an intentional fail-closed version gate; private schema snapshots in validation and provenance serve independent revalidation boundaries and already derive from the same repository bytes; CLI option parsing and versioned result/provenance narrowing remain local, explicit, and covered by public-path behavior.
  - Documentation reconciliation: ExecPlan 21 received append-only post-completion evidence, ExecPlan 22 now matches integration into PR #9 and transfer to this approved plan, this Supervisor Record and progress match direct local evidence, and the index contains exactly one active row for this plan.
  - No-change record: `AGENTS.md` already states the protocol/CLI, provider-free, campaign, and ExecPlan boundaries and no command or count changed; RFC 0001's claim/evidence/lifecycle semantics are unchanged; ADR 0002's capability-preflight boundary is unchanged; ADR 0003 already defines the protocol-v3 context, evidence-path, provenance, and compatibility semantics now being enforced; schemas remain byte-identical because the TypeScript fix conforms to schema 1/2 and frozen copies preserve schema values; historical reports are unchanged because no result is reinterpreted; consumed campaign artifacts are unchanged because no provider or campaign command ran.
- [x] Complete the full provider-free validation matrix and exact identity reproduction.
  - Provider-free validation is GREEN: focused suites 21/21 and 68/68; full suite 210/210 across 19 files; typecheck; quick skill validator; lint; repository-wide Prettier; build; `experiment:verify` with provider imports 0; all prescribed deterministic archaeological, Author, provider-adapter, lifecycle, protocol-v3, operability, benchmark-offline, and benchmark-runner qualifiers with external provider calls 0; `npm audit` with zero vulnerabilities; and `git diff --check`.
  - No Author command, live canary, model-backed campaign, tracing qualification, reservation, or campaign artifact was created or invoked.
  - Two unchanged serializer invocations over base `95d9cd3441bbe91649270f3ef71166ce6c75b533` produced the same 37-entry canonical manifest and identity `sha256:feca5a631f2dc21ae4b3ae7a9224ecd3fc0b0e0dac86a75baf8ae1afb043688c` before the normalized Supervisor Record and Progress evidence was updated.
- [x] Complete reinforced review and evidence-based consolidation with no P0–P2.
  - First Milestone 4 reinforced review reproduced identity `sha256:feca5a631f2dc21ae4b3ae7a9224ecd3fc0b0e0dac86a75baf8ae1afb043688c` and used two fresh independent reviewers plus a fresh consolidator. Direct consolidation retained three P2: ancestor-path redirection after the pre-read check, structural assignment of v3 provenance to the historical provenance type, and contradictory living handoff records. Reviewer B's favorable conclusion did not override direct evidence. State returned to `REMEDIATE`; material fixes must return through the full provider-free matrix, a new identity, and reinforced review.
- [x] Complete bounded behavior-first remediation of the three P2 findings retained by the first Milestone 4 review.
  - Ancestor-redirection RED: a deterministic second-collection wrapper persistently replaced `nested/` with a symlink to the moved original directory, so the same leaf inode and manifest bytes were observed; both complete Git collections were visible, but the serializer incorrectly emitted stdout. GREEN: regular-file and leaf-symlink reads now capture and revalidate every ancestor's directory identity and metadata, fail closed on a persistent change, symlink, or non-directory, and the focused supervisor suite passes 22/22 with quick skill validation.
  - Provenance-variable RED: typecheck reported an unused `@ts-expect-error` because a protocol-v3 provenance variable remained assignable to historical `AuthorProvenance`. GREEN: historical and v3 provenance now extend a common base separately, while the historical type forbids every known v3-only field with optional `never`; the focused Author suite passes 68/68 and typecheck passes without schema or runtime changes.
  - Living-record result: ExecPlan 22 now routes the retained findings through ExecPlan 23 `REMEDIATE`, records the reviewed-but-blocked `feca…688c` identity and the pre-remediation 210/210 matrix, this plan preserves its clean-worktree statement as approval-time history, and the index identifies Milestone 4 remediation. The draft PR body remains untouched for Milestone 5.
  - Post-GREEN design dispositions: **Defect, remediated through TDD** for the serializer's prior different-time ancestor metadata and the provenance inheritance that exposed an invalid public assignment; both now carry explicit per-operation state. **No action** for the topology-wide ancestor preflight plus per-leaf snapshot because they protect distinct fail-before-decode and stable-read obligations within one stateless collection transaction. **No action** for extracting the explicit v3-only `never` exclusions into another public type because the common base already removes the unsafe inheritance, while another abstraction would change the exported representation or obscure the schema-1/2 prohibition without evidence of additional risk. No post-GREEN behavior-preserving refactor was justified.
  - Final bounded validation: 90/90 focused tests across the supervisor and Author suites, typecheck, quick skill validation, lint, touched-file Prettier, the public provider-free `experiment:verify` checkpoint with zero provider imports, and `git diff --check` are GREEN. The complete matrix and new identity-bound reinforced review remain pending for the supervisor.
- [x] Complete post-remediation provider-free revalidation and second exact identity reproduction.
  - The complete post-remediation matrix is GREEN: 22/22 supervisor, 68/68 Author, 211/211 full suite across 19 files, typecheck, quick skill validation, lint, repository-wide Prettier, build, every prescribed deterministic checkpoint with zero external provider calls, `npm audit` with zero vulnerabilities, and `git diff --check`.
  - After final material predecessor-plan reconciliation, two byte-identical 37-entry collections over exact base `95d9cd3441bbe91649270f3ef71166ce6c75b533` produced a 7,116-byte canonical manifest and second identity `sha256:1b145aa48cf569cb3a950a6332a9323593346371e16025f3131b82177f5316b9`. Earlier intermediate post-remediation identities were invalidated before review by that material reconciliation; the second identity was then reviewed and superseded by the retained documentation correction.
- [x] Apply the bounded documentation-handoff remediation retained by the second reinforced review.
  - Both fresh reviewers and the fresh consolidator closed the two technical P2 findings on `1b145…316b9` but retained one documentation-handoff P2: Plan 22 materially said a new identity was still required, while this active record mixed the first `feca…688c` review disposition with the second identity. State returned to `REMEDIATE`; Plan 22 is now an `INTEGRATED` historical record that delegates every current state, identity, validation, and review fact to this plan, while the index uses one stable Milestone 4 status.
  - Two serializer invocations completed on the unchanged correction. Independent reconstruction from the canonical contract derived the 37-entry, 7,116-byte candidate manifest identity `sha256:0495002e0b34a682f8c519a4f8b8b70b63416275ddfe767e6a790afb5c3de070`; this records a candidate identity only, not a validation or review binding.
- [x] Rebind the documentation correction through the complete provider-free matrix, exact identity reproduction, and reinforced review.
  - The material correction superseded `1b145…316b9`. The complete provider-free matrix is GREEN with 22/22 supervisor, 68/68 Author, 211/211 full suite across 19 files, all prescribed checks, zero external provider calls, and zero audit vulnerabilities. Two byte-identical 37-entry, 7,116-byte collections produced identity `sha256:0495002e0b34a682f8c519a4f8b8b70b63416275ddfe767e6a790afb5c3de070`; two fresh independent reviewers and a fresh consolidator reproduced it and retained no P0–P3.
- [x] Commit, push, update draft PR #9, and confirm exact-head hosted GREEN.
  - Commit `726e0c78fa8683a5d5250f0cb4a21a3c291613b1` reproduced the reviewed identity, exact-head hosted validation passed, and the PR body was reconciled before merge.
- [x] Present a Merge decision card only if every exact binding is current.
  - The user approved the exact current Merge card; PR #9 merged into `main` as `6a7f9c6f99513b25551e79b7ee73927ff2f39a97` with candidate tree `0dc5c10dd1672bdf99ec887ab53fa19790c5773b`.

## Decisions

- Decision: use a new remediation ExecPlan rather than expand ExecPlan 22 or silently reopen ExecPlan 21.
  Rationale: the retained findings cross two previously approved increments; one self-contained current contract makes scope, authority, validation, and handoff explicit without rewriting their historical purpose.
  Date/Author: 2026-08-14 / supervising agent.

- Decision: retain all eight consolidated P2 findings and reject the optional dependency/reference proposal as blocking.
  Rationale: each retained finding has a concrete contract and plausible impact. The rejected proposal has no current consumer that treats the optional fields as system authority while ignoring `origin`, so tightening it would be advisory hardening outside this increment.
  Date/Author: 2026-08-14 / fresh consolidator and supervising agent.

- Decision: stabilize serialization with no-follow entry reads plus two complete identical passes rather than claim an unavailable atomic filesystem snapshot.
  Rationale: the repository utility is read-only and portable; descriptor identity and metadata checks close path-replacement gaps, while complete repeated enumeration detects ordinary concurrent mutation. The documentation must state this observable guarantee without claiming protection from an adversarial undetectable ABA mutation or filesystem-level snapshot semantics.
  Date/Author: 2026-08-14 / supervising agent.

- Decision: preserve every persisted Blueprint JSON schema.
  Rationale: the v1/v2 mismatch is in the exported TypeScript base interface, not stored artifacts. Protocol-v3 immutability aligns existing instrument bytes rather than changing their semantics.
  Date/Author: 2026-08-14 / supervising agent.

- Decision: update the existing draft PR only after the remediated content passes local reinforced review.
  Rationale: the PR body must describe the exact published head, and publication-time material changes expire local evidence.
  Date/Author: 2026-08-14 / supervising agent.

## Risks and Mitigations

- **Candidate instructions influence review:** reviewers could obey the artifacts they evaluate. Mitigate with exact-base governance as the repository authority, explicit untrusted-data labeling, a machine-readable trust contract, and a known-invalid suppression mutation.
- **Mixed filesystem observation:** a formatter or concurrent process could change paths or bytes during serialization. Mitigate with no-follow descriptor reads, pre/post metadata, complete double collection, byte comparison, and fail-closed output. Do not claim atomic snapshot protection against undetectable adversarial ABA changes.
- **Frozen-object compatibility:** deep-freezing an export may expose a caller that relied on mutation. Mitigate by inspecting all consumers, preserving value shapes, using canonical private clones, and exercising packet, validation, and provenance through public behavior.
- **Protocol compatibility regression:** type or CLI corrections could alter valid v1/v2 behavior. Mitigate with existing v1/v2 suites plus explicit valid and invalid context-option cases; leave schemas and valid packets unchanged.
- **Observed schema-clone ordering risk:** canonical-JSON round-tripping before deriving schema field arrays changed the historical v1 packet fingerprint during the first GREEN attempt. The frozen-copy utility now preserves repository insertion and array order with `structuredClone`, while canonical serialization remains the digest boundary and exact v1/v2 regressions stay GREEN.
- **Self-referential review identity:** living execution evidence changes while it records validation and review. Mitigate by using only the three approved normalized sections and mechanically proving every other byte remains material.
- **Moved base or remote head:** new upstream commits invalidate validation, review, or merge bindings. Mitigate by fetching and reorienting before publication and before any later Merge card.
- **Scope creep into model qualification:** deterministic GREEN could be overstated as protocol-v3 model support. Mitigate by preserving the E22 boundary and stating that no model, capability, stability, robustness, or generalization claim is collected here.

## Validation Strategy

Run from narrow to broad, with no provider invocation:

```text
npx vitest run test/supervise-skill-evidence.test.ts
npx vitest run test/evaluation-author.test.ts
npm run typecheck
python3 /mnt/c/Users/renan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/supervise-skill-evidence
node .agents/skills/supervise-skill-evidence/scripts/reviewed-content-identity.mjs --repo . --base <exact-base-sha>
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
git diff --check <exact-base-sha>...HEAD
git status --short
```

The focused tests are development evidence for the named behavior boundaries. The full local and hosted matrices establish only deterministic repository mechanics under the exact reviewed condition. They do not qualify a model, provider availability, semantic interpretation, capability eligibility, stability, robustness, or generalization.

## Documentation Impact

- This ExecPlan is the canonical remediation contract and handoff.
- ExecPlan 21 records that post-completion protocol-v3 review findings moved to this plan without changing its historical behavior contract.
- ExecPlan 22 is reconciled from its obsolete stacked-branch state to the actual PR #9 integration and review disposition; its approved revision 2 remains historical.
- `docs/execplans/README.md` identifies exactly this plan as active.
- `supervisor-policy.md` and `supervisor-contract.json` change because reviewer trust is a normative delivery boundary.
- The existing draft PR #9 body changes after reviewed GREEN so GitHub reviewers see the exact head's behavior, evidence, schema/security impact, and limitations.
- RFC 0001, ADR 0002, and ADR 0003 remain unchanged because the work enforces their existing untrusted-data, identity, compatibility, and provenance contracts. `AGENTS.md` remains unchanged because it already requires v1/v2 rejection, exact plan workflow, reinforced final review, and accurate PR evidence.

## Rollout and Recovery

There is no deployment or migration. The remediation stays on the existing draft branch and can be reverted as one conventional commit before merge. If serializer hardening cannot provide a deterministic portable observation boundary, stop with the branch unpushed and revise this contract rather than weakening identity claims. If freezing reveals a legitimate mutable consumer or requires a public API decision, stop and return to `WAIT_PLAN_APPROVAL`. If local or hosted validation fails, preserve the working tree and return to the smallest failing TDD cycle. If the base branch moves, rebase is not automatic: reconstruct the new merge context, obtain any authority required for history rewriting, and repeat proportionate validation and review.

## Lessons Learned

- A clean exact-head CI result can coexist with authority, identity, and compatibility defects when no discriminating regression covers those boundaries.
- Combining previously reviewed increments into one PR creates a new interaction surface; each component's earlier review does not qualify the combined head.
- An authorization to remediate identifies intent, but an executable plan revision must exist before its exact material contract can be approved.
- Deterministic Node filesystem injection and a deterministic Git wrapper make path replacement and between-pass mutation observable through the serializer CLI without timing-sensitive races.
- No-follow descriptors, stable pre/post metadata, and two complete matching collections establish the approved observable stability boundary; they do not create an atomic filesystem snapshot or eliminate undetectable adversarial ABA mutation.
- Deep freezing must preserve the preexisting representation before any order-sensitive derived array is constructed; canonical key sorting is safe for digest bytes but can change behavior when object-key order feeds a later array.
- A same-process JSON import can remain mutable for its caller without controlling the initialized Author instrument when validation, packet construction, and provenance each consume private frozen snapshots.
- Post-GREEN consolidation is strongest when it removes one demonstrated divergent transformation while preserving the separate validation and provenance boundaries that independently rederive the same repository-owned instrument.
- Living predecessor plans should append current transfer evidence instead of rewriting historical claims, while the active plan owns current validation, review, and publication state.
- Stable leaf observation includes the repository root and every in-repository directory ancestor; a persistent directory-entry rewrite may first surface as changed root metadata, which is a valid fail-closed observation rather than an atomic-snapshot claim.
