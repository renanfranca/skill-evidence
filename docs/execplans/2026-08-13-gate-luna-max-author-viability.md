# Gate Luna/max Author viability at 30 minutes

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-13
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Baseline: `main` at merge commit `39c156a`
- Branch: `feat/e19-luna-max-30-minute-viability`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`
- Predecessor: ExecPlan 18 and consumed campaign `e18-luna-max-locale-catalog-20260812-r1`

Safety boundary: this work is authorized defensive development in this repository. Offline preparation, tests, commits, push, CI, and preflight do not authorize a provider invocation. The model-backed call requires later authorization naming the exact E19 campaign, campaign fingerprint, commit, 1,800-second timeout, and budget `1`. E5 and E18 must never be repeated.

## Purpose / Big Picture

Decide whether Luna/max remains viable for the protocol-v2 Evaluation Author when the user-selected maximum tolerable completion window is 30 minutes. The experiment reuses the exact E18 skill snapshot and model-facing packet so that the only model-facing difference is the time allowed to complete. If a Blueprint completes, two independent blinded reviewers evaluate its prespecified semantic contracts before the final viability decision.

This is an adapted development follow-up, not blind qualification or a general claim about Luna. A timeout or critical Blueprint failure excludes Luna/max only for this Author condition and environment. A successful review keeps the condition as a future qualification candidate but never promotes it beyond `NOT_QUALIFIED`.

## Scope

Included: one new E19 campaign and reservation; the unchanged E18 `SKILL.md`; a new atomic semantic oracle outside the skill; 1,800-second Promptfoo step timeout and 1,860-second evaluation ceiling; deterministic runner and review qualification; two independent condition-blind reviews and disagreement-only adjudication if a Blueprint exists; one separately authorized Luna/max call without retry; sanitized reporting and CI.

Excluded: reuse of the E18 campaign, reservation, output, or report; changes to the E18 skill or model-facing packet; E5 rerun; Luna/xhigh or another model; more than one call; further timeout extension; automatic Author qualification; reliability or generalization claims; raw reasoning, invalid raw responses, credentials, or local artifacts in Git.

## Definitions

- **Controlled time contrast:** E19 uses the same skill bytes, snapshot, protocol, schema, instructions, condition, and model-facing packet as E18. Campaign identity, oracle, and timeouts differ outside the packet.
- **Viability ceiling:** 1,800 seconds is the maximum latency the user accepts for this Author condition, not a universal SLA.
- **Critical Blueprint failure:** schema or system-field failure, wrong lifecycle, fabrication of absent decision context, or contradiction/omission of a required skill contract or prohibition.
- **VIABLE_CANDIDATE:** the single run completed within 1,800 seconds and all critical mechanical and resolved semantic checks passed. The Author remains `NOT_QUALIFIED`.
- **NOT_VIABLE_FOR_AUTHOR:** the run timed out at 1,800 seconds or a completed Blueprint had a critical failure.
- **INSUFFICIENT:** authentication, access, rate limit, process, infrastructure, or persistence failure prevented a valid measurement.
- **Independent review:** Reviewer A and Reviewer B receive the same opaque packet without model, timing, E18 result, or overall expected decision and work without shared context. A resolver receives only disagreements.

## Existing Context

E5 observed eight Luna/max protocol-v1 runs fail within its five-minute gate. E18 then ran one fresh protocol-v2 `locale-entry-catalog` canary with multi-agent disabled and zero retry. Promptfoo cancelled its only step after 600,649 milliseconds; a local proxy observed early type-only events but no Blueprint, token usage, or effective model identity. E18 therefore established noncompletion within ten minutes without semantic evidence.

The user chose 30 minutes as the final tolerable ceiling and explicitly authorized reuse of the E18 scenario to isolate elapsed time. This supersedes only ExecPlan 18's fixture-reuse prohibition. Campaign `e18-luna-max-locale-catalog-20260812-r1` remains consumed and immutable.

`src/qualification/author-operability.ts` currently validates a single hard-coded E18 preparation and records only the historical 300-second target. `test/evaluation-author-operability.test.ts` already protects exact commit checks, packet blindness, pre-reservation identity revalidation, exclusive reservation, terminal persistence, timeout classification, and deterministic local Promptfoo/Codex SDK traversal. E19 extends these observable contracts without changing normal Author behavior.

## Desired End State

The repository can prepare, preflight, reserve, collect, review, adjudicate, and report E19 deterministically. Before the live call, CI and a literal-SHA preflight prove that the model-facing packet equals E18 and that only the allowed non-packet fields changed. After exact authorization, exactly one call reaches a terminal state and cannot be repeated.

The terminal report applies this frozen matrix:

- clean 1,800-second timeout or completed Blueprint with any resolved critical `REJECT` → `NOT_VIABLE_FOR_AUTHOR`;
- completed Blueprint with every critical check `ACCEPT` → `VIABLE_CANDIDATE`, still `NOT_QUALIFIED` and decision-ineligible;
- global/provider/infrastructure failure → `INSUFFICIENT`;
- invalid JSON or structurally invalid candidate is a critical Author output failure and therefore `NOT_VIABLE_FOR_AUTHOR`.

## Milestones

### Milestone 1 — Freeze campaign and oracle

Add `evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/` with a new preparation and oracle while referencing the unchanged E18 skill root. The oracle lists atomic critical contracts for activation, input validation, rendering, prohibitions, external-state boundaries, grounded evaluation structure, genuine blockers, non-fabrication, lifecycle, and provenance. It includes known-valid and known-invalid synthetic judgments for offline oracle qualification.

Generalize campaign validation to preserve the historical E18 profile and accept only the exact E19 profile. E19 uses campaign `e19-luna-max-locale-catalog-20260813-r1`, `timeoutMs: 1800000`, and `maxEvalTimeMs: 1860000`. Its packet fingerprint must equal E18.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts
npm run typecheck
npm run experiment:verify
```

Acceptance: skill bytes and every model-facing fingerprint equal E18; oracle and expected conclusions are absent from the packet; only campaign, oracle, paths, and timeout identities differ.

### Milestone 2 — Derive viability and reviewer artifacts

Extend collection to report whether 300-, 600-, and 1,800-second targets were met. Add pure mechanical checks and the frozen viability matrix. Completed candidates produce two opaque reviewer packets; incomplete runs produce no reviewer packet. Packets contain the canonical Blueprint, authorized skill content, atomic semantic rubric, and opaque identifiers but omit model, effort, elapsed time, prior results, and overall decision.

Add structured reviewer submissions with `ACCEPT`, `REJECT`, or `NEEDS_ADJUDICATION` per atomic item and Blueprint JSON-pointer evidence. Validate reviewer identity, completeness, allowed evidence paths, and condition blindness. Resolution accepts agreement directly and exposes only disagreements to an independent resolver. Mechanical critical failures override semantic votes.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts
npm run typecheck
npm run lint
npm run experiment:qualify:author-operability
```

Acceptance: timeout and critical failure yield `NOT_VIABLE_FOR_AUTHOR`; clean completion yields `VIABLE_CANDIDATE`; global failure yields `INSUFFICIENT`; reviewers cannot see the condition or decide outside the frozen rubric.

### Milestone 3 — Qualify offline, review, and freeze

Extend the deterministic local executable qualification to cover E19 completion, timeout, critical Blueprint, global failure, packet generation, reviewer agreement, and disagreement-only resolution without waiting 30 minutes. Add internal review-preparation and scoring commands if needed to preserve atomic, append-only artifacts. Update CI, `AGENTS.md`, package scripts, this plan, and the ExecPlan index.

After GREEN, run `refactor-design`, deterministic final validation, small `commit-the-changes` commits, push, and a new PR. After hosted CI is green, run provider-free preflight against the full literal SHA using `/home/renanfranca/.codex`. Preflight creates no reservation or provider call. Stop for exact authorization.

Validation:

```text
npm audit --json
npx vitest run test/evaluation-author.test.ts test/evaluation-author-operability.test.ts
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
git diff --check
```

Acceptance: all offline gates and CI are green; exact commit and fingerprints match; E19 artifacts are absent; external calls and real reservations are zero.

### Milestone 4 — Execute once and review if completed

Only after authorization names the campaign, fingerprint, literal commit, 1,800-second timeout, and budget `1`, atomically reserve E19 and call Luna/max once through Promptfoo/Codex SDK. Never retry. Persist collection and terminal receipt locally.

If no canonical Blueprint exists, derive the terminal decision mechanically and do not create reviewer work. If a Blueprint exists, prepare the two reviewer packets, spawn Reviewer A and Reviewer B independently with no inherited context, persist their structured judgments, and spawn an independent resolver only for disagreements. Score once and emit the sanitized report.

Acceptance: one reservation, at most one invocation, zero retry; all review inputs and outputs satisfy blindness and sanitization; report preserves operational and semantic conclusions separately.

### Milestone 5 — Close and validate without another call

Archive only sanitized reports and review evidence. Update this plan, index, PR description, and operational documentation. Run deterministic validation without invoking the canary. Keep E5 and E18 byte-for-byte unchanged. Merge remains a separate user decision.

## Progress

- [x] Consult THEORY commit `572e963` in full.
- [x] Confirm the user-selected 30-minute viability ceiling and frozen decision matrix.
- [x] Confirm reuse of the E18 scenario with a new campaign and independent semantic review.
- [x] Merge PR #6 and create `feat/e19-luna-max-30-minute-viability` from `main` at `39c156a`.
- [x] Complete Milestone 1: freeze the E19 profile, oracle, unchanged skill snapshot, and packet identity.
- [x] Complete Milestone 2: derive time targets, viability states, blind packets, independent submissions, and disagreement-only resolution.
- [x] Complete the offline implementation and validation portion of Milestone 3: audit zero, 160 tests, deterministic qualifiers, build, lint, formatting, and provider-free checkpoint green.
- [x] Publish draft PR #7 and observe hosted CI green on the complete implementation.
- [x] Complete Milestone 3 and exact preflight at `c5f7b22475b0de4f9d429311367ae7e8442a609c` with all checks passing.
- [x] Receive exact one-call authorization for campaign fingerprint `a1d97c5b5590b912b9c604063c995ff5dc664334428c47ce94ef60b97b523674`.
- [x] Complete Milestone 4 once: one invocation completed in 569,958 ms and terminated as `NOT_VIABLE_FOR_AUTHOR`; no review was warranted.
- [x] Complete Milestone 5 without another provider call.

## Decisions

- Decision: treat 30 minutes as the final product-specific viability ceiling.
  Rationale: the user accepts this maximum latency for the economical high-intelligence condition; a finite prespecified limit keeps a negative result falsifiable.
  Date/Author: 2026-08-13 / user.

- Decision: reuse the exact E18 skill snapshot and packet under a new campaign.
  Rationale: holding model-facing input constant isolates the time-window contrast better than a fresh fixture. E18's campaign and artifacts remain immutable.
  Date/Author: 2026-08-13 / user and planning agent.

- Decision: evaluate any completed Blueprint before deciding viability.
  Rationale: eventual completion is not useful if the result violates critical contracts, fabricates context, or chooses an unsafe lifecycle.
  Date/Author: 2026-08-13 / user.

- Decision: use two independent reviewers and disagreement-only resolution.
  Rationale: semantic alternatives cannot be judged reliably by exact strings; independent structured review reduces single-evaluator error while mechanical evidence retains precedence.
  Date/Author: 2026-08-13 / user.

- Decision: merge PR #6 before E19 and use a new PR.
  Rationale: E18 is complete, while E19 is an explicitly adapted follow-up with a different decision and budget.
  Date/Author: 2026-08-13 / user.

- Decision: merge PR #6 locally after two GitHub merge endpoints returned HTTP 502.
  Rationale: the PR was mergeable and CI-green, the user explicitly authorized merge, and pushing the equivalent merge commit preserved the reviewed ancestry without altering its contents.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: preserve absent timing evidence as `null` for global provider failures and as `false` only for an observed timeout or completed over-budget run.
  Rationale: authentication, process, access, and infrastructure failures do not establish that any latency threshold was missed.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: keep system-controlled lifecycle and provenance out of semantic reviewer packets.
  Rationale: the runner validates these mechanically with precedence; reviewers receive only the candidate, authorized skill content, and semantic criteria, preventing condition leakage and redundant voting over deterministic checks.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: qualify E18 and E19 together with six deterministic local Codex processes.
  Rationale: the joint qualifier proves that the historical E18 classification remains unchanged while E19 adds its distinct timeout decision and review workflow; it waits no wall-clock diagnostic interval and makes zero external calls.
  Date/Author: 2026-08-13 / implementation agent.

- Decision: apply the prespecified mechanical lifecycle gate before semantic review.
  Rationale: the completed Blueprint was schema-valid and included genuine blockers, but semantic validation found `MANDATORY_DIRECT_EVIDENCE_MISSING` at `/contracts/4/evidenceRequired`, producing system lifecycle `DRAFT` instead of the required `BLOCKED`. The frozen matrix therefore terminates as `NOT_VIABLE_FOR_AUTHOR`, and reviewers cannot reverse that critical mechanical failure.
  Date/Author: 2026-08-13 / implementation agent.

## Risks and Mitigations

- Risk: a favorable adapted follow-up is mistaken for blind confirmation. Mitigation: label E19 development evidence and require future untouched cases for qualification.
- Risk: fixture reuse looks like retrying E18. Mitigation: preserve E18 reservation/output/report, use a new campaign and atomic reservation, and declare the controlled time contrast explicitly.
- Risk: 30 minutes is extended again after failure. Mitigation: make timeout terminal `NOT_VIABLE_FOR_AUTHOR`; no retry or later extension is authorized.
- Risk: semantic reviewers infer the desired model result. Mitigation: omit condition, timing, E18 facts, expected lifecycle label, and overall decision; expose only atomic contracts and evidence.
- Risk: reviewers agree on the same error. Mitigation: qualify rubric with known-valid/invalid variants, retain direct mechanical precedence, and report the limitation of correlated evaluators.
- Risk: a completed but invalid candidate is mislabeled infrastructure failure. Mitigation: JSON/candidate/schema failures are Author output failures and therefore `NOT_VIABLE_FOR_AUTHOR`; only failures outside valid measurement are `INSUFFICIENT`.
- Risk: 30-minute foreground execution is interrupted locally. Mitigation: exact preflight, terminal receipt, isolated workspace, sanitized proxy, and conservative `INSUFFICIENT` classification; a consumed reservation never permits repetition.
- Risk: a global provider failure is recorded as failure to meet a time target. Mitigation: timing gates remain `null` unless a Blueprint completes or a timeout is directly observed.
- Risk: eventual completion is mistaken for viability. Mitigation: preserve separate operability and semantic outcomes; E19 completed within the time budget but failed the mechanical Blueprint gate.

## Validation Strategy

Use behavior-focused RED/GREEN cycles through the campaign service and CLI, followed by the provider-free public checkpoint no less than every two cycles. Qualify timeouts with deterministic local processes rather than wall-clock waits. After all behavior is green, perform the structural review and then the complete ordered validation. The live call occurs only after hosted CI, exact preflight, and separate authorization; final validation never repeats it.

## Documentation Impact

- This ExecPlan and `docs/execplans/README.md`: canonical status, policy, evidence, and handoff.
- `AGENTS.md` and `package.json`: new E19 offline, preflight, live, review, and scoring commands plus consumed-campaign warning after execution.
- `.github/workflows/ci.yml`: deterministic E19 qualification only; no live command or credentials.
- `docs/experiments/`: sanitized E19 campaign and review report only after the terminal call.
- RFC 0001 and ADR 0002: unchanged because E19 applies existing missing-evidence, lifecycle, and evaluator-separation rules.
- E5 and E18 artifacts and plans: immutable historical evidence; E19 may reference their digests but never edit them.

## Rollout and Recovery

There is no deployment. Before reservation, commits can be reverted normally. After reservation, preserve the terminal state and never reuse the E19 campaign. A global failure remains `INSUFFICIENT` and requires a separately planned new campaign; a timeout or critical failure closes Luna/max as `NOT_VIABLE_FOR_AUTHOR` under the declared condition. A viable result authorizes only later qualification planning.

## Lessons Learned

- A diagnostic timeout is not automatically a product latency threshold; the decision becomes valid only after the user declares the maximum tolerable window.
- Reusing a scenario can be the stronger design when the intended contrast is one controlled factor, provided campaign irreversibility and adapted-analysis disclosure remain intact.
- Operability and semantic quality must both pass for a condition to remain viable, but neither one-run result establishes reliability or qualification.
- A reviewer packet should not include system fields merely to ask humans to re-check deterministic policy; removing them strengthens blindness and leaves provenance validation with the system that composes the Blueprint.
- The same local executable can qualify timeout classification without reproducing 1,800 seconds of elapsed wall time, provided the report states that it qualifies routing rather than live latency.
- Extending the ceiling answered the operability question: Luna/max can complete this packet in under ten minutes. It did not rescue viability because the returned Blueprint still violated a critical completeness contract.
- A real blocker in `unresolvedRequirements` does not force `BLOCKED` when another required section is semantically incomplete; lifecycle precedence correctly keeps such a candidate at `DRAFT`.

## Offline Validation Evidence

On 2026-08-13, before any E19 reservation or external call, the focused Author suites passed 55 tests and the complete repository passed 160 tests. `npm audit` reported zero vulnerabilities. Typecheck, lint, Prettier, build, `experiment:verify`, and the archaeological, Author, provider, lifecycle, and operability qualifiers all passed. The E19 operability qualifier traversed six local Promptfoo/Codex SDK processes, reported `reviewWorkflowQualified: true`, and made zero external provider calls. The post-GREEN design review consolidated the repeated E19 profile check without changing behavior. Draft PR #7 then passed every hosted CI step. The frozen campaign fingerprint is `a1d97c5b5590b912b9c604063c995ff5dc664334428c47ce94ef60b97b523674`; the exact final commit and provider-free preflight remain the final handoff evidence.

## Live Result

The literal-SHA preflight at `c5f7b22475b0de4f9d429311367ae7e8442a609c` returned `READY_FOR_AUTHORIZATION` with all twelve checks passing, zero invocations, and no reservation, receipt, output, or report. After the user authorized that exact handoff, E19 atomically reserved and made exactly one Luna/max call with zero retry.

The invocation completed after 569,958 milliseconds: it missed 300 seconds, met 600 seconds, and met the 1,800-second ceiling. Requested model was `gpt-5.6-luna`; observed model remained explicitly unavailable. Usage was 16,928 input tokens, 31,197 output tokens, 22,487 reasoning-output tokens, and 48,125 total tokens.

The composed Blueprint was schema-valid and preserved `NOT_QUALIFIED` plus `decisionEligible: false`. It contained a genuine blocking unresolved requirement for missing decision context. However, candidate validation found `MANDATORY_DIRECT_EVIDENCE_MISSING` at `/contracts/4/evidenceRequired`, so lifecycle was mechanically derived as `DRAFT`, not the required `BLOCKED`. Under the frozen decision matrix this is a critical Blueprint failure and the terminal result is `NOT_VIABLE_FOR_AUTHOR`. Semantic reviewer packets and adjudication were correctly not created because mechanical checks take precedence. The sanitized report is `docs/experiments/e19-luna-max-locale-catalog-20260813-r1.json`; local reservation, collection, and receipt remain ignored evidence and the campaign can never be repeated.
