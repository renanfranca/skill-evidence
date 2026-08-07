# Build Skill Evidence v1

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and
Mitigations`, and `Lessons Learned` current as implementation advances.

## Purpose / Big Picture

Build a local TypeScript CLI that turns a probabilistic Codex skill evaluation
into an auditable chain from declared claims through behavioral contracts,
isolated executions, direct evidence, semantic judgment, and a reviewable
decision. A user can validate and plan the bundled `refactor-design`
evaluation without model calls, execute it only after explicitly approving its
maximum model sessions, review the result, archive sanitized evidence, and
regenerate the Markdown report from canonical JSON.

## Scope

In scope are a private Node 24 package, JSON-plus-Markdown evaluation formats,
the `check`, `plan`, `run`, `review`, `archive`, and `render` commands, isolated
Codex execution, judge calibration, deterministic reports, sanitized archives,
and four fresh TypeScript cases for explicit invocation of `refactor-design`.

Out of scope are implicit activation, causal contribution, version comparison,
stability, robustness, population generalization, non-Codex agents, a web UI,
npm publication, and automatic Git operations. The requested final validation
includes one real pilot with an explicit ceiling of nine approved sessions.

Safety boundary: this work is limited to authorized, defensive evaluation of
local Codex skills. It does not bypass policies, expose hidden prompts, or
retain private reasoning.

## Definitions

- A claim is a specific conclusion the evaluation may support, such as
  instructional fidelity or safety and noninterference.
- A behavioral contract declares preconditions, required and prohibited
  observable effects, temporal constraints, severity, and necessary evidence.
- A case instantiates one or more contracts with a public prompt and a minimal
  disposable fixture.
- Direct evidence is independently checkable state such as a file diff, command
  result, path boundary, or temporal event.
- A judge is a separate Codex invocation that applies a structured semantic
  rubric after it passes a local calibration pack.
- Canonical evidence is sanitized JSON whose digest and deterministic Markdown
  projection permit later audit.

## Existing Context

The repository initially contains only an Apache-2.0 license. The upstream
theory is `renanfranca/skill-evaluation-theory` commit
`c1fb47c40b806596d89fa3196e53967f20c8926c`. The initial target is
`refactor-design` from `renanfranca/codex-skills` commit
`ed5738175f19307bd13bd75b86514ac0f1db5f84`. Existing files under that skill's
`evals/` directory and the `develop-skill-with-evals` workflow must not be used
as inputs.

Codex CLI 0.146.0 is installed locally. It supports noninteractive JSONL,
ephemeral sessions, repository-scoped skills, explicit `$skill` invocation,
workspace-write sandboxing, output schemas, and inline network configuration.

## Desired End State

The repository builds a `skill-evidence` executable. `check` validates all
public inputs. `plan` produces a fingerprinted, side-effect-free plan with a
maximum of nine sessions. `run` refuses stale or under-approved plans, qualifies
the judge, executes four isolated cases, applies direct evidence before semantic
judgment, and writes canonical local evidence. `review` records a constrained
human decision. `archive` copies only approved sanitized artifacts into a
versionable archive. `render` reproduces Markdown byte-for-byte from JSON.

## Milestones

### Milestone 1 - Establish the project and contracts

Create `package.json`, TypeScript and formatting configuration, public JSON
schemas, domain types, canonical JSON hashing, path-safe evaluation loading,
the CLI shell, README, and deterministic unit tests.

Validation commands:

    npm run prettier:check
    npm run typecheck
    npm test
    npm run build

Acceptance: the bundled evaluation validates; malformed references, duplicate
IDs, symlinked fixtures, and unsafe paths fail without invoking Codex.

### Milestone 2 - Plan and execute evidence collection

Implement runtime resolution, session budgeting, plan fingerprints, target
skill filtering, disposable fixture workspaces, JSONL normalization, mechanical
checks, judge calibration and judgment, status aggregation, and local evidence
persistence. Add a fake Codex executable for integration tests.

Validation commands:

    npm test -- --runInBand
    npm run typecheck

Acceptance: insufficient approval, failed calibration, target drift, unknown
critical events, direct severe violations, judge failures, and successful runs
all produce the declared status without leaking raw reasoning.

### Milestone 3 - Add the independent refactor-design pilot

Add four new TypeScript fixtures and contracts for actionable invocation state,
a valid no-action design, a red entry gate, and an authority boundary. Add a
four-probe judge calibration pack without consulting or copying existing evals.

Validation commands:

    npm test
    npm run prettier:check
    npm run build
    node dist/cli.js check evaluations/refactor-design

Acceptance: the static evaluation is internally consistent and plans exactly
one calibration, four executors, and at most four judges.

### Milestone 4 - Review, archive, and reconcile documentation

Implement constrained human review, deterministic rendering, sanitization,
archive creation, credential scanning, and documentation of the full workflow
and limitations.

Validation commands:

    npm run lint
    npm run typecheck
    npm test
    npm run prettier:check
    npm run build

Acceptance: a fake end-to-end run can be reviewed and archived, the report
regenerates byte-for-byte, forbidden material is rejected, and no command
stages, commits, pushes, or publishes.

## Progress

- [x] Create and switch to `feat/skill-evidence-v1`.
- [x] Create the ExecPlan convention and this living plan.
- [x] Start Milestone 1.
- [x] Complete Milestone 1.
- [x] Complete Milestone 2.
- [x] Complete Milestone 3.
- [x] Complete Milestone 4.
- [x] Run final validation and reconcile documentation.

## Decisions

- Decision: use TypeScript, ESM, Node 24, and npm 11.
  Rationale: this matches the user's preferred stack and local runtime while
  retaining reliable subprocess, hashing, JSON Schema, and test support.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: use JSON for structured public inputs and Markdown for prose.
  Rationale: JSON has predictable parsing and canonicalization; Markdown keeps
  prompts and human rationale readable.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: require all mandatory claims, a qualified judge, and zero severe
  violations before recommending confirmation.
  Rationale: averages must not hide a critical regression.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: use `gpt-5.6-terra` at `xhigh` for both executor and judge in the
  first real pilot, with no runtime defaults in the CLI.
  Rationale: the evaluated condition remains explicit; human review and local
  calibration mitigate but do not eliminate correlated evaluator errors.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: adopt the applicable Prettier rules from the codex-skills website,
  omitting XML, Gherkin, and Java plugins.
  Rationale: the new repository contains TypeScript, JSON, and Markdown only.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: treat the requested final real run as explicit authorization for at
  most nine `gpt-5.6-terra`/`xhigh` sessions after `codex doctor --json` passes.
  Rationale: the command, models, reasoning effort, and cost ceiling are all
  specified in the acceptance request; no broader or repeated execution is
  authorized.
  Date/Author: 2026-08-06 / Codex and user.
- Decision: retain the completed real run as immutable but ineligible and do
  not create a human review or archive for it.
  Rationale: all four judges returned `PASS`, while a discovered evaluator
  false positive supplied the only critical violation in every case. Rewriting
  canonical evidence would destroy auditability, and a fresh nine-session run
  needs separate authorization.
  Date/Author: 2026-08-06 / Codex.

## Risks and Mitigations

- Risk: the judge shares blind spots with the executor.
  Mitigation: qualify it on valid, invalid, alternative-valid, and misleading
  probes; retain human confirmation and state the correlation limitation.
- Risk: an evaluation leaks expected answers to the executor.
  Mitigation: keep contracts, rubrics, probes, and oracles outside disposable
  workspaces and copy only public prompt and fixture files.
- Risk: the real user skill contains historical evals.
  Mitigation: construct and hash a filtered runtime snapshot that excludes
  `evals/`, `.git`, caches, and generated artifacts.
- Risk: JSONL changes reduce observability.
  Mitigation: retain raw events locally, normalize known events, and mark
  decision-critical unknowns inconclusive rather than guessing.
- Risk: fixtures or checks write outside their scope.
  Mitigation: reject symlinks and path traversal, use direct argv with timeouts,
  minimize inherited environment, and never execute untrusted evaluation files.
- Risk: model execution incurs unapproved cost.
  Mitigation: `plan` reports the maximum and `run` blocks without an explicit
  matching session approval.

## Validation Strategy

Develop from narrow unit tests toward fake end-to-end CLI tests. Run lint,
typecheck, tests, Prettier check, and build before completion. Exercise `check`
and `plan` on the bundled evaluation without a model. Run the real pilot only
after all local validation passes and `codex doctor --json` reports a healthy
environment; never exceed the authorized nine sessions.

Final evidence on 2026-08-06: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run prettier:check`, and `npm run build` all passed. Vitest ran 14 tests,
including a nine-session fake end-to-end flow. `check` and `plan` succeeded for
the bundled evaluation with a maximum of nine sessions. `codex doctor --json`
reported `overallStatus: ok` outside the outer development sandbox. The real
run used nine sessions and remained ineligible because of the subsequently
corrected evaluator false positive; its deterministic report regenerated
byte-for-byte.

## Documentation Impact

`README.md` is the canonical user workflow and limitation statement.
`docs/execplans/README.md` is the canonical ExecPlan convention. JSON schemas
are the canonical machine interfaces. This ExecPlan records implementation
decisions and validation evidence. The upstream `THEORY.md` remains unchanged;
the README links its exact repository and commit instead of copying it.

## Rollout and Recovery

Keep the npm package private. The CLI writes temporary and raw data only under
`.skill-evidence/`, which is ignored by Git. Successful disposable workspaces
are removed; failed ones remain locally for diagnosis. Archive creation is
explicit and never performs Git operations. Recovery consists of removing a
local run directory or reverting this feature branch; the target skill and real
projects are never mutated.

## Lessons Learned

- The requested Prettier configuration lives under the codex-skills `website/`
  directory, so only its TypeScript/JSON/Markdown settings belong here.
- The target skill is cleanly committed in its source repository, enabling
  provenance through both Git identity and a filtered content fingerprint.
- In Codex CLI 0.146.0, `--ask-for-approval` is a global option and must appear
  before the `exec` subcommand. The first real-pilot attempt stopped during
  argument parsing without a model call; preserving its empty JSONL and stderr
  made the boundary failure auditable before a corrected retry.
- The first completed real pilot exposed an evaluator false positive: the
  `no-write-outside` check treated an absolute executable path as a write
  target. All semantic judges passed all cases, while the faulty direct check
  failed all four. That evidence remains immutable and ineligible; the checker
  now detects explicit external write targets, and case preconditions execute
  before the model rather than being rechecked only afterward. A fresh real run
  requires separate authorization.
