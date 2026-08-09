# ExecPlan 5 — Remediate npm Audit Findings

- Date: 2026-08-09
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Planning baseline: `43cb680358ad2ee6b31c17962d5624a342d76d76`
- Status: complete and green; uncommitted pending separate authorization

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while implementation advances. It is a self-contained handoff for the executor named above.

## Purpose / Big Picture

Remove the nine current npm audit findings from the installed dependency graph without accepting npm's suggested downgrade of Promptfoo, without using `npm audit fix --force`, and without changing the scientific instrument's direct dependency versions or behavior. A clean install must resolve only patched transitive implementations, `npm audit` must report zero known vulnerabilities, and all existing 45 behavior tests and local checkpoints must remain green.

This is dependency hardening, not a new experiment. It does not authorize a live invocation, freeze, campaign, credential read, report generation, commit, or push. The already completed and pushed hardening revision at `43cb680` is the immutable baseline for this follow-up.

## Existing Context

At the planning baseline, `npm audit --json` reports 9 vulnerabilities: 3 moderate and 6 high. Four report entries form the `promptfoo -> ai -> @ai-sdk/gateway/@ai-sdk/provider-utils -> undici@5.29.0` chain. The remaining five form the optional native inference chain `promptfoo -> @huggingface/transformers@4.2.0 -> onnxruntime-node@1.24.3/ sharp@0.34.5 -> adm-zip@0.5.18`.

The registry has no patched release inside three declared transitive ranges: `@ai-sdk/provider-utils@4.0.42` requires `undici ^5.29.0`, Transformers requires `sharp ^0.34.5`, and ONNX Runtime requires `adm-zip ^0.5.16`. Patched versions are `undici@6.28.0`, `sharp@0.35.3`, and `adm-zip@0.6.0`. All require a transitive major override. Node 24 satisfies their runtime engines. Promptfoo remains at the latest published `0.122.0`; npm's `fixAvailable` recommendation to install `promptfoo@0.120.14` is rejected because it is a downgrade outside the current direct pin and does not represent a forward fix.

The THEORY requires evaluated system versions and external interfaces to remain explicit and requires reevaluation after material environment or dependency changes. Therefore this plan treats the lockfile as instrument provenance, records the override decision, and re-runs the full behavior and deterministic local qualification checkpoints. It does not reinterpret historical campaign evidence.

## Desired End State

`package.json` declares narrowly scoped overrides for the vulnerable Undici and AdmZip edges and one graph-wide Sharp override, and `package-lock.json` resolves those packages to `undici@6.28.0`, `sharp@0.35.3`, and `adm-zip@0.6.0`. Direct versions of Promptfoo, Codex SDK, Vitest, and every other direct dependency remain unchanged. `npm ci` reproduces the graph and `npm audit --json` reports zero vulnerabilities.

All 45 behavior tests pass. Offline verification imports no provider. The deterministic tracing qualifier remains `EXACT_SUPPORTED`, and the loopback-only tracing checkpoint passes. No API, command, freeze schema, scientific configuration, evaluation case, oracle, public report, RFC, ADR, `AGENTS.md`, or `docs/experiments/` artifact changes.

## Milestones

### Milestone 1 — Replace the vulnerable Undici edge

Use the baseline `npm audit --json` result as RED evidence. Add a package override scoped to `@ai-sdk/provider-utils` that resolves its Undici child to `6.28.0`, refresh the lockfile with ordinary npm resolution, and inspect `npm ls` for invalid or duplicate edges. GREEN requires the four AI SDK/Undici audit entries to disappear and the complete 45-test suite to pass. If runtime import, type, or behavior validation fails, revert this override and stop rather than masking incompatibility.

### Milestone 2 — Replace vulnerable optional native edges

Use the remaining audit findings as RED evidence. Add a graph-wide override for `sharp@0.35.3` because both installed consumers must share the patched release, add an override scoped to `onnxruntime-node` for `adm-zip@0.6.0`, refresh the lockfile, and inspect the resolved graph. GREEN requires `npm audit --json` to report zero vulnerabilities and the complete 45-test suite to pass. Because these paths process untrusted images or model archives, do not omit optional dependencies to hide the findings.

### Milestone 3 — Review and validate the reproducible install

After audit and behavior GREEN, apply `$refactor-design` only for behaviorally neutral simplifications. Run `npm ci`, `npm audit --json`, typecheck, lint, exactly 45 tests, Prettier check, build, offline verification, local tracing qualification, loopback-only tracing verification, `git diff --check`, and `git status --short`. Confirm direct dependency pins and public/scientific contracts are unchanged. Update this plan and the ExecPlan index to complete only after every gate passes.

## TDD and Validation Strategy

Execute with `$tdd-behavior-autonomous-quiet`. This dependency-only correction has a direct mechanical oracle, so no artificial source-level test is added: RED is the registry audit of the exact lockfile, and GREEN is disappearance of the targeted dependency paths plus the unchanged public behavior suite. Run the entire suite after each dependency group rather than testing package-manager implementation details.

Commands:

    npm audit --json
    npm install
    npm ls promptfoo ai @ai-sdk/gateway @ai-sdk/provider-utils undici @huggingface/transformers onnxruntime-node adm-zip sharp --all
    npm test

Final sequence:

    npm ci
    npm audit --json
    npm run typecheck
    npm run lint
    npm test
    npm run prettier:check
    npm run build
    npm run experiment:verify
    npm run experiment:qualify:tracing
    npm run experiment:verify:tracing
    git diff --check
    git status --short

The tracing commands remain deterministic, local-provider, isolated, and loopback-only. Their filesystem and bind permissions do not authorize external provider traffic or live experiment commands.

## Progress

- [x] Re-read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full and confirmed it remains `main`.
- [x] Captured baseline audit: 9 total findings, 3 moderate and 6 high.
- [x] Inspected exact dependency paths, declared ranges, latest compatible releases, patched versions, and npm's dry-run proposal.
- [x] Complete Milestone 1 with audit and full-suite evidence.
- [x] Complete Milestone 2 with zero-audit and full-suite evidence.
- [x] Complete post-GREEN design review and final validation.
- [x] Reconcile documentation and leave changes uncommitted pending separate authorization.

## Decisions

- Decision: reject `npm audit fix --force` and the suggested `promptfoo@0.120.14` downgrade.
  Rationale: the proposed direct-version regression is not a forward security fix and would silently change the pinned scientific instrument.
  Date/Author: 2026-08-09 / implementation agent

- Decision: use two dependency-edge overrides and one graph-wide Sharp override rather than adding the transitive packages as direct application dependencies.
  Rationale: the project does not import these packages directly; the scoped forms state the exceptional Undici and AdmZip edges, while both Sharp consumers require the same patched version and npm retained an invalid vulnerable nested optional node under a parent-scoped Sharp override.
  Date/Author: 2026-08-09 / implementation agent

- Decision: use the audit result itself as RED and retain all existing behavior tests as compatibility evidence.
  Rationale: adding a unit test coupled to `package.json` or npm's internal graph would duplicate the package manager's oracle without testing user behavior.
  Date/Author: 2026-08-09 / implementation agent

## Risks and Mitigations

- Risk: a transitive major override is API-incompatible with its parent. Mitigation: scope every override to one parent edge, inspect `npm ls`, run the complete behavior suite after each group, and stop on any invalid edge or runtime regression.
- Risk: native packages install successfully but fail only when Promptfoo imports them. Mitigation: run build, deterministic tracing qualification, and the exact tracing checkpoint after a clean install.
- Risk: optional dependencies are omitted to produce a misleading clean audit. Mitigation: use ordinary `npm install` and `npm ci` with optional dependencies enabled and inspect their resolved versions.
- Risk: registry advisories or package metadata change during execution. Mitigation: record the observed date and exact resolved lockfile; a future audit is new evidence, not a retroactive change to this result.
- Risk: dependency changes are mistaken for campaign authorization. Mitigation: prohibit freeze, live, report, credential, and campaign commands throughout this plan.

## Documentation Impact

Only this ExecPlan and `docs/execplans/README.md` change. `AGENTS.md`, RFC 0001, ADR 0002, the decisions index, and `docs/experiments/` remain unchanged because commands, authority boundaries, scientific contracts, schemas, and public reports remain identical. The lockfile and override declaration are the canonical dependency record.

## Lessons Learned

- Milestone 1 GREEN: ordinary `npm install` resolved the scoped edge to `@ai-sdk/provider-utils -> undici@6.28.0 overridden`. The audit fell exactly from 9 findings (3 moderate, 6 high) to the predicted 5 high findings in the native inference chain; all 45 tests passed in 14 files. The graph retained Promptfoo `0.122.0`, AI SDK `6.0.246`, and provider-utils `4.0.42` without an invalid dependency marker.
- Milestone 2 intermediate evidence: the parent-scoped AdmZip override worked and removed the ONNX/AdmZip findings, but npm retained nested optional `sharp@0.34.5` under Transformers and marked it invalid against the requested override. Promoting only Sharp to a graph-wide override removed that stale node, deduplicated Transformers onto `sharp@0.35.3`, and produced a valid graph.
- Milestone 2 GREEN: `npm audit --json` reported zero findings at every severity. `npm ls` showed the exact patched resolutions (`undici@6.28.0`, `adm-zip@0.6.0`, `sharp@0.35.3`) and no invalid marker; all 45 tests passed in 14 files.
- Post-GREEN design review classification: `No action`. The three override declarations are already the smallest representation of exceptional package resolution; extracting tooling or adding source abstractions would not reduce temporal coupling, state, responsibility, mapping, or representation risk. The graph-wide Sharp override is intentional evidence from npm's optional-node behavior, not accidental scope.
- Final validation on 2026-08-09: `npm ci` reproduced the lockfile with optional dependencies enabled and emitted only three upstream deprecation notices; the following `npm audit --json` reported zero vulnerabilities across 967 dependencies. Typecheck, lint, Prettier, build, and `git diff --check` passed. Vitest reported exactly 45 passing tests in 14 files. Offline verification passed with provider imports `0`.
- The tracing qualifier was predictably `BLOCKED` inside the restricted sandbox because its local provider and receiver could not complete. The identical authorized loopback/filesystem run outside that restriction produced canonical `EXACT_SUPPORTED`: both exact repetitions were `SUPPORTED`, both comparisons were `UNSUPPORTED`, and process isolation was verified. The exact tracing checkpoint then listened only on `127.0.0.1:4318` and passed runtime, typed, and integration checks. This local evidence does not authorize or imply a live call.
- Final status contains only `package.json`, `package-lock.json`, this ExecPlan, and its index. Direct dependency pins remain byte-for-byte unchanged. `AGENTS.md`, RFC, ADR, decisions, experiments source/tests, and `docs/experiments/` are untouched. No freeze, live command, campaign, credential read, report generation, commit, or push occurred in this follow-up.
