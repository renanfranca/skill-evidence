# Repository Guidelines

## Project Structure & Module Organization

Product-owned intake, Evaluation Blueprint, Evaluation Author, and qualification contracts live in `src/`; versioned Blueprint and qualification-report schemas live in `schemas/`. The Promptfoo foundation and qualification harness remain in `experiments/`, and tests remain in `test/`. E4 authorizes only internal `experiment:*` commands, not a public product CLI. E5 Milestone 1 authorizes condition and report contracts only; blind material and provider execution remain separately unauthorized. Evaluation cases, oracles, and fixtures are under `evaluations/refactor-design/`; ExecPlans belong in `docs/execplans/` and use `YYYY-MM-DD-<kebab-case-title>.md`. Never commit `dist/`, `.skill-evidence/`, or `coverage/`.

## Build, Test, and Development Commands

- `npm ci` installs the pinned Node 24/npm 11 dependencies.
- `npm run typecheck` checks strict TypeScript without emitting files.
- `npm run lint` runs ESLint with type-aware rules.
- `npm test` runs the Vitest suite.
- `npm run prettier:check` verifies formatting; use `npm run prettier:format` to fix it.
- `npm run build` compiles the experimental harness to ESM in `dist/`; it does not build a product CLI during the Foundation.
- `npm run experiment:verify` is the public offline checkpoint and must not import Promptfoo or initiate a provider invocation.
- `npm run experiment:qualify:archaeological` runs the deterministic local Promptfoo conformance corpus for RFC regressions R1–R6; it is development evidence, not decision evidence.
- `npm run experiment:qualify:author` runs the deterministic local E4 Author corpus. It makes zero external provider calls and does not qualify a model-backed Author condition.
- `npm run experiment:qualify:author-provider` traverses the real Promptfoo/Codex SDK adapter with a deterministic local executable. It makes zero external provider calls and qualifies diagnostic integration only, not live availability or Author quality.
- `npm run experiment:qualify:author-benchmark:offline -- --bundle evaluations/refactor-design/e5-author-benchmark` validates the frozen E5 blind instrument, schedule, and locked reviewer qualification with zero provider calls. It does not run or qualify either model condition.
- `npm run experiment:author -- --skill <directory> --out <blueprint.json> --campaign <id> --approve-provider-invocations 1` performs the separately authorized single Author invocation. It requires a clean worktree, Codex CLI 0.147.0, absent API-key variables, and `SKILL_EVIDENCE_AUTHOR_CODEX_HOME` pointing to a writable ChatGPT-authenticated Codex home.
- `npm run experiment:verify:tracing` is a separate local integration checkpoint. It imports Promptfoo, starts a loopback-only receiver on `127.0.0.1`, and uses a deterministic local provider; it configures no external provider or endpoint, but does not prove zero egress.

Run these validations before a pull request. Model-backed runs are separate.

`.github/workflows/ci.yml` runs the deterministic repository checks, including both local Author qualifiers, for every commit on an open pull request. It uses read-only permissions and no repository secrets. Keep model-backed campaigns, the E4 Author command, Codex OTEL qualification, Promptfoo tracing qualification, and loopback tracing verification as separately authorized local operations. Never repeat an E4 Author campaign after its atomic reservation is created.

## Coding Style & Naming Conventions

Use ESM imports with `.js` extensions, strict types, two-space indentation, LF endings, single quotes, and semicolons. Prettier uses 140 columns and organizes imports. Use kebab-case files (`judge-input.ts`), camelCase values, and PascalCase types. Preserve canonical JSON, deterministic digests, and explicit statuses; do not infer evidence from prose.

## Testing Guidelines

Vitest discovers `test/**/*.test.ts`. Write behavior-focused cases and use temporary directories for filesystem scenarios. Evaluation fixture tests are evaluator inputs. Every behavior or safety-boundary change needs a regression assertion; no numeric coverage threshold is configured.

## ExecPlan Workflow

Before creating or revising an ExecPlan, read [THEORY.md](https://github.com/renanfranca/skill-evaluation-theory/blob/main/THEORY.md). Treat it as normative: align the plan's claims, contracts, evidence, gates, uncertainty, and safety boundaries with the theory, and record the consulted commit. Write each plan as a self-contained handoff for implementation by `gpt-5.6-terra` with `xhigh` reasoning effort.

Execute an approved ExecPlan with `$tdd-behavior-autonomous-quiet`. Tests must lead observable behavior while execution continues autonomously and quietly. Keep the plan's progress, decisions, risks, lessons, and `docs/execplans/README.md` status current.

## Skill Selection

Always ignore the `develop-skill-with-evals` skill in this repository. Do not invoke or follow it, even when a task would otherwise match its trigger conditions.

## Commit & Pull Request Guidelines

Use `$commit-the-changes` for every commit: inspect status/history, stage only intended files, and write the smallest accurate English message compliant with Conventional Commits 1.0.0. Any valid type and optional scope, body, footer, `!`, or `BREAKING CHANGE` is allowed when appropriate; match repository history without narrowing the specification. Never mix unrelated changes. Pull requests should explain behavior/evidence impact, link the issue or ExecPlan, list validation, and flag schema, cost, security, or artifact changes.

## Security & Operational Safety

Never commit credentials, raw model reasoning, or local run artifacts. Preserve explicit session and credit approvals, executor isolation, sanitization, and the separation between run, human review, and archive actions.
