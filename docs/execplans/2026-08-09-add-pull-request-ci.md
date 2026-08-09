# Add pull request CI

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while work advances.

## Purpose / Big Picture

Every commit pushed to an open pull request should receive an automatic, reproducible validation result before merge. The workflow will run the repository's deterministic checks without credentials, model calls, live campaigns, or tracing qualifiers, and its first execution will validate the E3 branch that introduces it.

## Scope

In scope: one GitHub Actions workflow triggered by `pull_request`; read-only repository permissions; Node 24 and npm caching; dependency installation, audit, typecheck, lint, tests, formatting, build, provider-free verification, and the local archaeological Promptfoo qualification; a behavior test for the workflow contract; contributor documentation; publication to the current branch; opening the branch's pull request; and observing the first CI result.

Out of scope: branch-protection settings, required-check configuration, pushes to `main`, deployment, release, credentials, model-backed evaluation, live campaigns, Codex OTEL qualification, Promptfoo tracing qualification, loopback tracing verification, artifact uploads, dependency changes, RFC or ADR changes, and modifications to historical evidence.

## Definitions

**Pull request CI** is the GitHub-hosted workflow that runs for the default `pull_request` activity set, including every `synchronize` event produced by a new commit on the PR branch. **Deterministic checks** are repository validations that require no secret and invoke no external model provider; `npm audit` still consults the npm registry and is therefore operationally network-dependent. **Pinned action** is a GitHub Action referenced by a full commit SHA rather than a mutable tag.

## Existing Context

The repository currently has no `.github/workflows/` directory and no open PR for `feat/e3-archaeological-regression-corpus`. Local validation is documented in `AGENTS.md` and implemented by `package.json`. E3's separate archaeological qualifier is development-only and uses deterministic local providers. The tracing and Codex OTEL qualifiers depend on additional process, port, or environment behavior and are intentionally excluded from the initial hosted CI.

The normative theory was read in full at commit `572e963ea6f1207ab53c533592cb70a8239e221c`. CI preserves its boundaries by reporting repeatable development checks without promoting them into skill decision evidence or broader reliability claims. Official action repositories were consulted on 2026-08-09; `actions/checkout` and `actions/setup-node` both expose a current v7 release, which will be pinned to the exact reviewed release commit.

## Desired End State

`.github/workflows/ci.yml` runs one `validation` job on `ubuntu-latest` for pull requests. The workflow grants only `contents: read`, cancels superseded runs for the same PR, has a finite timeout, uses full-SHA pins for official checkout and Node setup actions, selects Node 24, enables npm's dependency cache, and runs these commands in order:

1. `npm ci`
2. `npm audit`
3. `npm run typecheck`
4. `npm run lint`
5. `npm test`
6. `npm run prettier:check`
7. `npm run build`
8. `npm run experiment:verify`
9. `npm run experiment:qualify:archaeological`

The workflow contains no secret reference and no write permission. `test/ci-workflow.test.ts` observes this repository-facing contract. `AGENTS.md` names the hosted checkpoint and its exclusions. The current branch is committed and pushed, a PR to `main` is open, and the first workflow run completes successfully.

## Milestones

### Milestone 1 — Protect pull requests with deterministic validation

#### Goal

Deliver and exercise the complete hosted CI contract in one bounded milestone.

#### Changes

- Add `test/ci-workflow.test.ts` first, asserting the trigger, read-only permission, pinned actions, Node version, timeout, absence of secrets, and exact ordered commands through the workflow's committed text.
- Add `.github/workflows/ci.yml` with one quiet validation job and concurrency cancellation scoped to the workflow and pull request.
- Update `AGENTS.md` with the hosted checkpoint, its command coverage, and the explicit tracing/model exclusions.
- Update this plan and `docs/execplans/README.md` continuously.
- Commit and push only these intended changes, open the pull request to `main`, and observe its CI check.

#### Validation

- Command: `npm test`
- Expected result: the workflow behavior test first fails because the workflow is absent, then all tests pass.
- Command: `npm run experiment:verify`
- Expected result: `offline verification passed; provider imports: 0`.
- Command: `npm ci && npm audit && npm run typecheck && npm run lint && npm test && npm run prettier:check && npm run build && npm run experiment:verify && npm run experiment:qualify:archaeological`
- Expected result: all local equivalents of the hosted job pass before publication.
- Command: inspect the GitHub PR checks after push.
- Expected result: the `validation` job completes successfully for the pushed commit.

#### Acceptance Criteria

- Every new commit on the open PR schedules the workflow through `pull_request` synchronization.
- The job is read-only, secret-free, finite, and pinned to reviewed action commits.
- Only the nine named checks run; no tracing qualifier, live campaign, model call, deployment, or artifact upload occurs.
- The first hosted run is green on the E3 PR.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Confirm the current branch is clean, pushed, and has no open pull request.
- [x] Confirm current official v7 action releases and select full-SHA pinning.
- [x] Milestone 1 started.
- [x] Behavior test RED confirmed: the full suite failed only because `.github/workflows/ci.yml` did not exist.
- [x] Workflow GREEN locally: 61 tests pass and the provider-free public checkpoint still reports zero imports.
- [x] Post-GREEN design review completed: the formatter-coverage gap returned to behavior TDD; no further structural change was justified.
- [x] Documentation reconciled: `AGENTS.md`, this plan, the ExecPlan index, and the `package.json` formatting surface match the workflow.
- [x] Final local validation completed: clean install, audit with zero vulnerabilities, typecheck, lint, 61 tests, formatting, build, provider-free verification, and archaeological qualification all passed in workflow order.
- [x] Commit `30b150a` pushed, draft PR #2 opened to `main`, and hosted run `31338433765` completed successfully in 1m13s.
- [x] Milestone 1 completed.

## Decisions

- Decision: add CI to the current E3 branch and create its PR after publication.
  Rationale: the user explicitly wants the workflow to validate this same change before merge, and no PR currently exists for the branch.
  Date/Author: 2026-08-09 / operator and implementation agent

- Decision: trigger only on `pull_request` initially.
  Rationale: the requested behavior is per-commit PR validation; duplicating the same job on branch pushes would run it twice for the current branch.
  Date/Author: 2026-08-09 / implementation agent

- Decision: pin `actions/checkout` and `actions/setup-node` v7 releases by full commit SHA.
  Rationale: full pins reduce mutable-action supply-chain risk while retaining current Node 24-compatible official actions.
  Date/Author: 2026-08-09 / implementation agent

- Decision: include `npm audit` despite its registry dependency and exclude all tracing and model-backed qualifiers.
  Rationale: audit was part of the agreed initial check set; tracing adds environment-sensitive failure modes, and model-backed work requires separate authorization and credentials.
  Date/Author: 2026-08-09 / operator and implementation agent

## Risks and Mitigations

- Risk: workflow permissions grow implicitly. Mitigation: declare top-level `permissions: contents: read` and assert that no write permission or secret reference exists.
- Risk: mutable action tags change behavior. Mitigation: use full commit SHA pins with release comments.
- Risk: redundant runs waste time. Mitigation: trigger only for PRs and cancel superseded runs in the same PR concurrency group.
- Risk: `npm audit` changes with registry advisories or fails during an outage. Mitigation: keep it visible as a distinct step so operational failure is distinguishable from repository checks; do not weaken its exit status silently.
- Risk: hosted CI accidentally becomes evaluation decision evidence. Mitigation: retain `purpose: DEVELOPMENT` in the archaeological report and document that CI proves repository conformance only.
- Risk: environment-sensitive tracing becomes flaky on hosted runners. Mitigation: exclude all three tracing/OTEL commands from this workflow.
- Risk: a workflow added on a branch never runs because no PR exists. Mitigation: open the PR immediately after push and observe the first check.

## Validation Strategy

Use behavior-focused quiet TDD against the committed workflow contract. Confirm the missing-file RED with the full Vitest suite, add the minimum workflow for GREEN, then run the provider-free public checkpoint. After GREEN, perform the required design review, reconcile `AGENTS.md`, and execute all nine workflow commands locally in order. Finally push, open the PR, and treat the hosted `validation` result as the public integration checkpoint.

## Documentation Impact

`AGENTS.md` is the canonical contributor command guide and describes the PR workflow and its explicit exclusions. `package.json` adds `.github` to both formatter scripts so the workflow remains inside the formatting contract; no command or dependency otherwise changes. RFC 0001 and ADR 0002 remain unchanged because CI neither changes evaluation ownership nor creates decision evidence. ExecPlan 9 remains historical and complete; this new plan and `docs/execplans/README.md` record the independently authorized CI scope. Historical experiment reports remain immutable.

## Rollout and Recovery

Push the workflow with this branch and open a PR to `main`. GitHub schedules it from the PR branch. If hosted validation exposes a runner-specific defect, keep the PR open, diagnose only the failing deterministic step, and push a normal corrective commit. Recovery is a normal revert of the CI commit; branch-protection policy is not changed by this plan.

## Lessons Learned

- A workflow committed to a branch is not exercised by `pull_request` until that branch actually has an open PR; this branch had none when planning began.
- The post-GREEN review found that the existing Prettier scripts excluded `.github`; without explicit coverage, CI could report formatting success while its own workflow remained unchecked.
- The first final-validation pass stopped at ESLint because two workflow-text assertions used repeated literal spaces in regular expressions. Replacing them with explicit `{2}` quantifiers preserved behavior and made the test conform to the repository lint contract.
- The GitHub connector could not create the PR because its integration received HTTP 403. The authenticated `gh` fallback opened draft PR #2 as prescribed by the publication workflow.
