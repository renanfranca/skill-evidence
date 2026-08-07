# Skill Evidence

`skill-evidence` is a private Node/TypeScript CLI for collecting an auditable evidence chain about probabilistic Codex skills. Evaluation v2 evaluates explicit TypeScript invocation of `refactor-design` with deterministic preflight, strict evidence artifacts, isolated execution, calibrated semantic judgment, and explicit session and credit authorization.

The implementation operationalizes `renanfranca/skill-evaluation-theory@572e963ea6f1207ab53c533592cb70a8239e221c`, which remains normative, and records the target skill as `renanfranca/codex-skills@ed5738175f19307bd13bd75b86514ac0f1db5f84`. It neither imports `develop-skill-with-evals` nor reads anything under `refactor-design/evals/`.

## Requirements

- Node.js 24 or newer
- npm 11
- a healthy, authenticated Codex CLI only for a separately authorized real run

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
  --model gpt-5.6-luna --reasoning-effort max \
  --judge-model gpt-5.6-terra --judge-reasoning-effort xhigh \
  --out .skill-evidence/next-plan.json
skill-evidence preflight \
  --plan .skill-evidence/next-plan.json \
  --out .skill-evidence/next-preflight.json
```

`preflight` is deterministic and makes no model call. Its strict canonical JSON records stable checks with `PASS`, `FAIL`, `INCONCLUSIVE`, or `ERROR`, plus contract, phase, severity, observed facts, evidence type, digest, reference, and temporal position where applicable. It rejects drift in the engine, schemas, evaluation inputs, original or filtered skill, and the configured executor/judge condition.

A future run requires both explicit approvals:

```bash
skill-evidence run \
  --plan .skill-evidence/next-plan.json \
  --preflight .skill-evidence/next-preflight.json \
  --approve-sessions 9 \
  --max-credits 3.33
```

The prepared condition uses `gpt-5.6-luna/max` for four executors and `gpt-5.6-terra/xhigh` for one calibration and up to four judges. The projected maximum is nine sessions and 3.33 credits, approximately 61% below the previous Terra/Terra pilot. The credit limit is checked immediately before each next session; it cannot retroactively interrupt a session that already started.

Calibration is a terminal gate. If it fails, `run` writes a local Evidence v2
record, `report.md`, and the calibration artifacts, prints the run directory,
then exits nonzero. That run contains one 0.37-credit calibration session,
empty cases, `NOT_EVALUATED` claims, and `Judge calibration failed` as the
ineligibility reason; it starts no executor, case judge, review, archive, or
skill snapshot.

No real run is part of repository validation. Human review and archive creation remain separate, explicit operator actions:

```bash
skill-evidence review --run .skill-evidence/runs/<run-id> \
  --decision confirm --rationale-file rationale.md
skill-evidence archive --run .skill-evidence/runs/<run-id>
skill-evidence render --evidence archive/<run-id>/evidence.json
```

Confirmation requires eligible Evidence v2. Evidence v1 remains renderable for historical audit but cannot be confirmed. A critical direct failure always overrides a favorable judge.

## Evidence and judge boundary

Strict schemas under `schemas/` define evaluation inputs, qualification
packages, `preflight.json`, `judge-input.json`, Evidence v1/v2, and review.
Every contractual check materializes positive or negative facts with a stable
ID and evidence digest. Fingerprints, path audits, commands, diffs,
trajectories, and final messages are explicit evidence rather than inferred
from prose.

Case judges receive only a sanitized canonical `judge-input/<case-id>.json`
plus the private oracle. Calibration receives a canonical
`calibration-input.json` array of blind `{ id, judgeInput, oracle }` packets,
where `id` is a deterministic `probe-<digest>` and neither purpose nor expected
status appears in the prompt or subprocess environment. Its strict output is
`{ probes: [{ id, status, rationale }] }`; expected status is derived locally.
`calibration-result.json`, sanitized calibration JSONL/stderr, and Evidence v2
record input/result digests plus expected and observed probe status. If required
case evidence is missing or a relevant executor event is unknown, the case is
`INCONCLUSIVE`, no judge packet is created, and no judge session starts. Raw
reasoning is discarded. A complete Evidence v2 ledger records each session
separately with role, case, input tokens, cached input tokens, output tokens,
and credits. Historical Evidence v1 and v2 remain renderable.

Case states are `PASS`, `FAIL`, `INCONCLUSIVE`, and `ERROR`. Claim states are `SUPPORTED`, `NOT_SUPPORTED`, `INCONCLUSIVE`, and `NOT_EVALUATED`. Causal contribution, version comparison, stability, robustness, generalization, implicit activation, and other languages remain `NOT_EVALUATED`.

## Evaluation isolation

Eight historical cases are development/regression material and cannot influence
eligibility: the four cases used by the first pilot plus its four prior
development cases. Four new decision cases—`usage-job-presenter`,
`usage-stable-route-parser`, `stress-exported-sentinel`, and
`stress-immutable-balance`—are two usage and two stress cases and alone feed a
future decision. They have only been exercised with the local fake executable
during implementation, never sent to a model. Every referenced `examples.json`
is a strict version-1 package with exactly `known-valid`, `known-invalid`,
`alternative-valid`, and `unsupported-fluency` judge-input probes. Only the
sixteen probes from decision cases enter the single future calibration session.
Their locally derived results are respectively `PASS`, `FAIL`, `PASS`, and
`INCONCLUSIVE`.

Executors receive only the public prompt, disposable fixture, and repository-scoped filtered `$refactor-design` snapshot. Contracts, oracles, qualification examples, expected behavior, and judge packets remain outside their workspace. The executor condition uses `workspace-write`, disabled network access, no additional writable roots, and no `/tmp` or `$TMPDIR` exception. The original skill and filtered snapshot are fingerprinted; relevant unknown events make observability incomplete.

Raw JSONL and failed workspaces remain local under ignored `.skill-evidence/`
for diagnosis. Canonical evidence excludes private reasoning and sanitizes
credential-like values. No command automatically reviews, archives, stages,
commits, pushes, or publishes files.

## Limits

Executor and judge behavior remains probabilistic and correlated. One future execution per decision case cannot establish repeatability, stability, broad robustness, causal contribution, or population-level generalization. The calibration checks rubric discrimination, not judge independence. A human confirmation accepts only the bounded Evidence v2 record; it does not turn `NOT_EVALUATED` claims into supported claims.

The living implementation records are in [the canonical ExecPlan index](docs/execplans/README.md).
