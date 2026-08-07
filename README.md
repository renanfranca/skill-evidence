# Skill Evidence

`skill-evidence` is a private, standalone Node/TypeScript CLI for collecting an auditable evidence chain about probabilistic Codex skills. Version 1 evaluates the current `refactor-design` skill only when it is explicitly invoked in four fresh TypeScript cases.

The pilot operationalizes the evaluation theory at `renanfranca/skill-evaluation-theory@c1fb47c40b806596d89fa3196e53967f20c8926c` and records the target skill as `renanfranca/codex-skills@ed5738175f19307bd13bd75b86514ac0f1db5f84`. It neither imports `develop-skill-with-evals` nor reads anything under `refactor-design/evals/`.

## Requirements

- Node.js 24 or newer
- npm 11
- a healthy, authenticated Codex CLI for real runs

Install and validate locally:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run prettier:check
npm run build
```

## Workflow

Validate and fingerprint the evaluation without model calls:

```bash
skill-evidence check evaluations/refactor-design
skill-evidence plan evaluations/refactor-design \
  --model gpt-5.6-terra --reasoning-effort xhigh \
  --judge-model gpt-5.6-terra --judge-reasoning-effort xhigh \
  --out plan.json
```

Run only after approving the exact maximum shown by the plan:

```bash
skill-evidence run --plan plan.json --approve-sessions 9
```

The runner uses a single judge-calibration session, four sequential executor sessions, and at most four judge sessions. It rechecks the evaluation and filtered skill fingerprints before the first model call. Executors receive only the public prompt, disposable fixture, and a repository-scoped `$refactor-design` snapshot. Contracts, oracles, expected behavior, and judge probes stay outside their workspace.

Review, archive, and regenerate a report:

```bash
skill-evidence review --run .skill-evidence/runs/<run-id> \
  --decision confirm --rationale-file rationale.md
skill-evidence archive --run .skill-evidence/runs/<run-id>
skill-evidence render --evidence archive/<run-id>/evidence.json
```

Confirmation is rejected unless all four cases pass, calibration succeeds, observability is complete, and no critical direct violation exists. A favorable judge cannot override direct evidence. Reports are deterministic projections of canonical JSON and have no aggregate score.

## Evidence model

Versioned JSON Schemas under `schemas/` define evaluations, cases, contracts, evidence, and human reviews. Prompts, oracles, rubrics, reports, and human rationales remain Markdown. Case states are `PASS`, `FAIL`, `INCONCLUSIVE`, and `ERROR`; claim states are `SUPPORTED`, `NOT_SUPPORTED`, `INCONCLUSIVE`, and `NOT_EVALUATED`.

The evaluated claims are instructional fidelity, outcome quality, process compliance, and safety/noninterference. Implicit activation, causal contribution, version comparison, stability, robustness, generalization, and other languages are explicitly `NOT_EVALUATED`.

Raw JSONL and failed workspaces remain local under `.skill-evidence/` for diagnosis. Canonical evidence excludes private reasoning and sanitizes credential-like values. Archives contain only the filtered skill snapshot, canonical evidence, matching human review, and regenerable report; raw events, workspaces, and secrets are forbidden. No command stages, commits, pushes, or publishes files.

## Runtime isolation

Real executors follow the official [Codex skills discovery](https://developers.openai.com/codex/skills) and [`codex exec` reference](https://developers.openai.com/codex/cli/reference): ephemeral JSONL sessions, ignored user configuration and rules, `workspace-write`, no approvals, and disabled sandbox network access. The global homonymous skill is absent because user configuration is ignored; the filtered snapshot is installed at `.agents/skills/refactor-design` in the disposable repository. The snapshot and original skill are fingerprinted, and any mutation is a critical violation.

Fixtures and mechanical commands are trusted local content. They run as direct argv arrays with a reduced environment and timeout, never through a shell. Successful workspaces are removed; failures remain for diagnosis and must not be rerun without a material diagnosis or change.

## Limits

Using Terra for both executor and judge does not make their judgments independent. Each case runs once, so this pilot does not establish repeatability, stability, robustness, or population-level generalization. A human decision records whether the bounded evidence is accepted; it does not turn unevaluated claims into supported ones.

The living implementation record is [the Skill Evidence v1 ExecPlan](docs/execplans/2026-08-06_FEATURE_skill-evidence-v1-exec-plan.md).
