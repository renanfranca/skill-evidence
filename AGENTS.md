# Repository Guidelines

## Project Structure & Module Organization

During the Theory First Promptfoo Foundation, TypeScript lives in `experiments/` and tests in `test/`; do not create `src/`, product schemas, or a product CLI. Future product modules may use `src/` only after a subsequent authorized ExecPlan. Evaluation cases, oracles, and fixtures are under `evaluations/refactor-design/`; ExecPlans belong in `docs/execplans/` and use `YYYY-MM-DD-<kebab-case-title>.md`. Never commit `dist/`, `.skill-evidence/`, or `coverage/`.

## Build, Test, and Development Commands

- `npm ci` installs the pinned Node 24/npm 11 dependencies.
- `npm run typecheck` checks strict TypeScript without emitting files.
- `npm run lint` runs ESLint with type-aware rules.
- `npm test` runs the Vitest suite.
- `npm run prettier:check` verifies formatting; use `npm run prettier:format` to fix it.
- `npm run build` compiles the experimental harness to ESM in `dist/`; it does not build a product CLI during the Foundation.
- `npm run experiment:verify` is the public offline checkpoint and must not import Promptfoo or initiate a provider invocation.
- `npm run experiment:verify:tracing` is a separate local integration checkpoint. It imports Promptfoo, starts a loopback-only receiver on `127.0.0.1`, and uses a deterministic local provider; it configures no external provider or endpoint, but does not prove zero egress.

Run these validations before a pull request. Model-backed runs are separate.

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
