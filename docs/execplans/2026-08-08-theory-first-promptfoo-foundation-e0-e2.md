# ExecPlan 1 — Theory First Promptfoo Foundation: E0–E2

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Status: implementation ready; E1, E2 baseline, E2 deep, G1 and G2 await an operator-supplied dedicated login.

This is the living execution record for the approved E0–E2 plan. It implements only the smallest direct Promptfoo Node API harness needed to investigate authentication and observability. It does not authorize product architecture, E3, an App Server, an adapter, a Judge, a decision evaluation, or copied V1 code.

## Purpose and boundaries

The campaign tests two bounded hypotheses under one immutable instrument freeze: Promptfoo can invoke `openai:codex-sdk` using an existing dedicated ChatGPT/Codex login under requested Luna/max conditions; and normal plus deep surfaces expose enough observable evidence for a later SDK-first decision. A negative or insufficient result is valid.

The harness persists raw summaries, traces, SQLite state, workspaces, budgets and freezes only below ignored `.skill-evidence/` or temporary directories. It does not persist credentials, raw reasoning, the content of `CODEX_HOME`, or a real external `CODEX_HOME` path. Curated reports are emitted to `docs/experiments/` only by `experiment:report` after E2 has run.

## Operational interface

```text
npm run experiment:verify
npm run experiment:freeze -- --campaign <campaign-id>
npm run experiment:e1 -- --campaign <campaign-id>
npm run experiment:e2:baseline -- --campaign <campaign-id>
npm run experiment:e2:deep -- --campaign <campaign-id>
npm run experiment:report -- --campaign <campaign-id>
```

The live commands require `SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME` to name a dedicated, already authenticated login directory. The harness checks only that the directory exists; it never reads or copies its contents. `OPENAI_API_KEY` and `CODEX_API_KEY` must be absent, including as empty strings. `provider.apiKey`, suite overrides, and `cli_env` carrying either forbidden key fail closed before Promptfoo is dynamically imported, and do not reserve a provider invocation.

## Contracts and gates

The exact dependency candidates were resolved before freeze creation: Promptfoo `0.122.0`, `@openai/codex-sdk` `0.147.0`, and the SDK-packaged `@openai/codex` `0.147.0`. Freeze creation rejects another resolved set. Each freeze records canonical lockfile and manifest digests, Git commit, resolved package versions, the normalized condition, and a condition digest. Any drift requires a new campaign, E1, and G1.

Each campaign permits at most one started provider invocation for each of `e1`, `e2-baseline`, and `e2-deep`; the ledger is written immediately before evaluation. It sets `maxRetries=0`, `cache=false`, `maxConcurrency=1`, `sharing=false`, `writeLatestResults=false`, `timeoutMs=300000`, and `maxEvalTimeMs=360000`.

E1 requests `openai:codex-sdk`, `gpt-5.6-luna`, reasoning `max`, read-only sandbox, no approval, no network, disabled web search, omitted collaboration mode, `features.multi_agent=false`, no persisted or resumed thread, no inherited process environment, no streaming, and no deep tracing. Its sole accepted response is `E1_AUTH_OK`. G1 reports requested and observed settings separately. Authentication remains `CONFIGURATION_INFERENCE`; effective model and reasoning remain `null` with explicit reasons unless independently provider-reported evidence appears.

E2 creates a new synthetic Git workspace per condition. It contains `SKILL.md`, a marker, a target file, and a known output file path. The prompt asks the agent to read the skill and marker, run a deterministic command, recover from a harmless local failure, create the known file, modify the target, and reply `E2_CANARY_OK`. Before/after hashes are experimental ground truth, not an adapter or causal evidence. Baseline and deep share the workspace-write condition and root Promptfoo tracing receiver on `127.0.0.1`; receiver bind failure is a gate. Deep alone requests `deep_tracing=true` and an OTEL `cli_config` endpoint of `http://127.0.0.1:4318/v1/logs`, JSON protocol, and `log_user_prompt=false`, without editing the external login directory.

Capability rows always contain `capabilityId`, `signal`, `condition`, `purpose=DEVELOPMENT`, `sourceSurface`, `observed`, `classification`, `evidenceReference`, `limitations`, `versionFingerprint`, and `decisionEligibility=UNASSESSED`. Trace-dependent facts are never `NATIVE_STABLE`; a missing trace remains `INSUFFICIENT`, not evidence that a canary event did not occur. `skill-used` metadata and reading `SKILL.md` never establish causal contribution.

`experiment:report` copies only sanitized E1, capability, Experimental Ownership, and G2 JSON reports into `docs/experiments/`. G2 emits one or more responsibility options only: `CONTINUE_WITH_CODEX_SDK`, `CONTINUE_WITH_SMALL_ADAPTER`, `SPIKE_APP_SERVER`, `WEAKEN_SUPPORTED_CLAIMS`, or `STOP_AND_REASSESS`. It cannot implement any option. With absent deep command traces, the implemented recommender conservatively selects `SPIKE_APP_SERVER` and `WEAKEN_SUPPORTED_CLAIMS`.

## Progress

- [x] Consulted THEORY commit `572e963e`, RFC 0001, and ADR 0002.
- [x] Saved and indexed this ExecPlan.
- [x] Completed E0 scaffold, exact lockfile, strict ESM compilation, lint/format configuration, offline checkpoint, canonical serialization, redaction, isolation, freeze, drift detection, budget ledger, and synthetic workspace.
- [x] Implemented E1 and E2 command paths directly over dynamic `promptfoo.evaluate()` loading; no generic runner or production provider abstraction was added.
- [x] Implemented sanitised E1/G1 records and E2 capability/G2 reporting paths.
- [x] Completed offline validation: `npm ci`, typecheck, lint, 19 behavior tests, Prettier, build, and `experiment:verify` (zero provider imports).
- [ ] Create an instrument freeze with the operator's dedicated external login path.
- [ ] Execute the one E1 invocation and record G1.
- [ ] Execute the one baseline E2 invocation and the one safe deep E2 invocation, then record G2.
- [ ] Commit the resulting curated reports only after verifying they contain no raw traces, SQLite, credentials, reasoning, or workspace content.
- [ ] Final live closeout validation after the three separate live gates.

## Decisions

- Direct `promptfoo.evaluate()` is the only provider invocation surface; Promptfoo is dynamically loaded after credential checks and inside isolated storage.
- The public offline checkpoint is `npm run experiment:verify`. It performs no provider import and reports zero provider imports.
- The three-invocation maximum is enforced as E1, baseline, and deep, one each, with no retry path.
- Dependency resolution was explicitly checked against the recorded candidates before lockfile creation. Post-freeze version drift fails closed.
- Curated provenance never promotes requested Luna/max settings to observed effective settings.

## Risks and mitigations

- Forbidden host, provider, suite, and CLI API-key sources abort before Promptfoo evaluation; regression tests prove the loader seam remains untouched.
- Promptfoo config, cache, and logs use unique temporary directories; telemetry, updates, and caching are disabled before dynamic import and are restored/removed in `finally`.
- The external login path is replaced with `<EXTERNAL_CODEX_HOME>` before any fingerprint or persisted report.
- Promptfoo's default test discovery would have traversed pre-existing ignored `.skill-evidence` fixtures. `vitest.config.ts` now limits discovery to `test/**/*.test.ts`, preserving those artifacts without deletion.
- Deep OTEL configuration remains a requested experimental condition. A receiver bind failure or provider/configuration error produces a bounded error/insufficient result and does not authorize mutating `config.toml` or retrying.

## Lessons learned

- The frozen Promptfoo provider exposes the requested Codex fields (`model`, `model_reasoning_effort`, sandbox, approval, network, web search, streaming, persistence, deep tracing, `cli_env`, and `cli_config`) and supports the planned root OTLP receiver gate.
- Promptfoo's provider response can expose final output, session ID, token usage, and error information, but this implementation intentionally leaves effective model/reasoning unobserved unless a provider-reported field is independently added and qualified.
- Filesystem snapshots establish the synthetic canary's known consequences even when no trace is emitted; they cannot establish an unobserved command trajectory or skill contribution.

## Validation

The implemented offline validation sequence is:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
git status --short
```

Live invocations are intentionally excluded from this sequence and remain pending until an operator explicitly supplies the dedicated authenticated path and starts a campaign.
