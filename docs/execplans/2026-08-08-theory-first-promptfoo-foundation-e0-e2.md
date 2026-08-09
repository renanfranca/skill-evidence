# ExecPlan 1 — Theory First Promptfoo Foundation: E0–E2

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Foundation commit: `b1d087898e18c3929d024e47bd52ef2331781cae`
- Hardened instrument commit: `60c024062df5aa1c1eadf08ced3de9e61bb7536f`
- Requalified instrument: ExecPlan 3 based on `63e6dc1`; Gate 2 must bind its freeze to the resulting clean Gate 1 commit
- Status: Gate 2 campaign `foundation-e0-e2-gate2-20260808` stopped at E1 with `g1: ERROR`; one live invocation was consumed and G2 was not produced.
- Follow-up: [ExecPlan 4 — Harden Live Preflight and Error Projection](2026-08-08-harden-live-preflight-and-error-projection.md); this pointer does not modify or reopen the stopped campaign.

This is the living execution record for the RFC 0001 E0–E2 scope. It implements only the smallest direct Promptfoo Node API harness needed to investigate authentication and observability. It does not authorize product architecture, E3, an App Server, an adapter, a Judge, a decision evaluation, copied V1 code, or any live invocation before separate Gate 2 authorization.

## Purpose and boundaries

The campaign tests two bounded hypotheses under one immutable instrument freeze: Promptfoo can invoke `openai:codex-sdk` using an existing dedicated ChatGPT/Codex login under requested Luna/max conditions; and normal plus deep surfaces expose enough observable evidence for a later SDK-first decision. A negative or insufficient result is valid. Development qualification is separate from decision evidence and cannot authorize E1 or E2.

The harness persists raw summaries, traces, SQLite state, workspaces, budgets, and freezes only below ignored `.skill-evidence/` or temporary directories. It does not persist credentials, raw reasoning, the content of `CODEX_HOME`, or a real external `CODEX_HOME` path. Curated reports are emitted to `docs/experiments/` only by `experiment:report` after E2 has run.

## Operational interface

```text
npm run experiment:verify
npm run experiment:freeze -- --campaign <campaign-id>
npm run experiment:e1 -- --campaign <campaign-id>
npm run experiment:e2:baseline -- --campaign <campaign-id>
npm run experiment:e2:deep -- --campaign <campaign-id>
npm run experiment:report -- --campaign <campaign-id>
```

The live commands require `SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME` to name a dedicated, already authenticated login directory. The harness checks directory identity but cannot establish authenticated-account continuity. `OPENAI_API_KEY` and `CODEX_API_KEY` must be absent. Forbidden keys fail closed before Promptfoo is dynamically imported and do not reserve a provider invocation.

## Contracts and gates

The exact frozen dependencies are Promptfoo `0.122.0`, `@openai/codex-sdk` `0.147.0`, and the SDK-packaged `@openai/codex` `0.147.0`. Each freeze records canonical lockfile and manifest digests, Git commit, resolved versions, the typed scientific configuration, and its digest. Drift requires a new campaign, E1, and G1.

Each campaign permits at most one started provider invocation for each of `e1`, `e2-baseline`, and `e2-deep`; reservations are exclusive. All conditions set `maxRetries=0`, `cache=false`, `maxConcurrency=1`, `sharing=false`, `timeoutMs=300000`, and `maxEvalTimeMs=360000`. E1 retains `writeLatestResults=false`; E2 baseline and deep use `writeLatestResults=true` only for isolated temporary local persistence. Promptfoo telemetry and updates remain disabled, and the temporary database is removed only after sanitized summary and trace projections have been copied into ignored campaign storage.

E1 requests `openai:codex-sdk`, `gpt-5.6-luna`, reasoning `max`, read-only sandbox, no approval, no network, disabled web search, omitted collaboration mode, `features.multi_agent=false`, no persisted or resumed thread, no inherited process environment, no streaming, and no deep tracing. Its sole accepted response is `E1_AUTH_OK`. G1 reports requested and observed settings separately.

E2 creates a new synthetic Git workspace per condition. The baseline and deep conditions share the workspace-write condition and root Promptfoo tracing receiver on `127.0.0.1`; receiver bind failure is a gate. Deep alone requests `deep_tracing=true` and an OTEL endpoint of `http://127.0.0.1:4318/v1/logs`, JSON protocol, and `log_user_prompt=false`. A mechanical canary requires provider success, the literal response, and all byte-exact filesystem effects.

Capability rows use signal-specific evidence. Trace-dependent facts are never `NATIVE_STABLE`; a missing trace remains `INSUFFICIENT`, not evidence that an event did not occur. Skill metadata never establishes causal contribution. G2 may recommend options but cannot implement one.

## Progress

- [x] Consulted THEORY commit `572e963`, RFC 0001, and ADR 0002.
- [x] Completed and validated the E0 offline foundation.
- [x] Preserved the pre-live hardening record separately at commit `60c0240`.
- [x] Receive `ALTERNATIVE_SUPPORTED` from ExecPlan 2: the exact condition remained unsupported and the persisted condition is only a future candidate.
- [x] Complete ExecPlan 3 Gate 1: version the promoted E2 condition, invalidate earlier freezes, and requalify it as `EXACT_SUPPORTED` with two fresh-process repetitions.
- [x] Pass the exact E2 loopback tracing checkpoint without credentials, external provider, or model invocation.
- [x] Obtain separate operator authorization for up to one E1, one baseline E2, and one deep E2 invocation.
- [x] Create the exclusive campaign freeze at clean commit `1fb8803` with scientific configuration digest `619ecfe10f997814259bc3d13d6a8ba625019ee0ed8778a554c25d659b14e658`.
- [x] Execute the one E1 invocation and observe `g1: ERROR` with no response and a provider error.
- [x] Stop before baseline E2 because G1 did not pass; deep E2 and G2 therefore remain unobserved.
- [x] Preserve the ignored campaign artifacts and do not generate interface-incompatible partial reports.

## Gate 2 campaign record

Campaign `foundation-e0-e2-gate2-20260808` froze schema 3 at repository commit `1fb8803fe014fed9c83a012bbb3e17271f63eb40`. The freeze records Promptfoo `0.122.0`, Codex SDK and CLI `0.147.0`, and scientific configuration digest `619ecfe10f997814259bc3d13d6a8ba625019ee0ed8778a554c25d659b14e658`. Before the freeze, the branch was clean, `codex login status` reported a ChatGPT login, forbidden host API keys were absent, and the offline checkpoint passed with zero provider imports.

The only live reservation was E1 attempt 1 at `2026-08-09T01:53:25.523Z`. Promptfoo started one test case, but Codex Exec exited before returning `E1_AUTH_OK`; the operator-visible error reported failure to initialize the in-process app-server client because of a read-only filesystem. The curated E1 artifact declares `g1: ERROR`, `response: null`, and `providerError: "cannot canonically serialize undefined"`. That mismatch limits diagnosis: the curated projection preserves the gate outcome but not the operator-visible causal error. It is an instrument or execution-environment defect for separately authorized development, not a reason to retry or adapt this frozen campaign.

The campaign consumed one of the authorized maximum of three live invocations. Baseline E2, deep E2, and G2 were not run. No four-report set was generated because the existing report interface requires E2 evidence and partial substitutes are prohibited. Mechanical inspection confirmed the six ignored campaign JSON artifacts are canonical and contain no real external `CODEX_HOME` path, credential-like value, `auth.json` reference, or raw reasoning field.

Result: G1 is `ERROR`; G2 and its recommendation are unavailable. The bounded operational recommendation is to stop this campaign and reassess the read-only app-server initialization and provider-error projection as separate development before seeking authorization for any new campaign.

## Decisions

- Direct `promptfoo.evaluate()` remains the only provider invocation surface.
- The public offline checkpoint is `npm run experiment:verify`; it imports no Promptfoo provider.
- At hardened commit `60c0240`, the live condition remained `writeLatestResults=false`; ExecPlan 2 could not mutate it retroactively.
- ExecPlan 3 prospectively supersedes the E2 portion of that condition with versioned `writeLatestResults=true`, while preserving E1 at `false`; schema-2 freezes are incompatible and cannot be reused.
- The hardening history is preserved as a closed record instead of being mixed into this RFC-scoped plan.
- E1 remains blocked regardless of a capability result until a later plan and explicit authorization change the frozen scientific configuration, if required.
- Campaign `foundation-e0-e2-gate2-20260808` is immutable and terminated after its failed E1 gate; it cannot be retried or extended.

## Risks and mitigations

- Forbidden credentials abort before Promptfoo evaluation; regression tests preserve this boundary.
- Promptfoo config, cache, and logs use unique temporary directories and are removed in `finally`.
- The external login path is sanitized before any persisted projection.
- Missing observation is never promoted to observed absence.
- Local persistence is distinct from sharing: all suites retain `sharing=false`, and every Promptfoo database remains temporary and isolated.
- The failed E1 reservation and all associated raw and curated artifacts remain ignored and preserved below `.skill-evidence/`.
- Any correction to app-server initialization or provider-error projection requires separate development and cannot modify this campaign's evidence.

## Lessons learned

- Typed presence, runtime presence, stable documentation, and operational integration are separate facts.
- Scientific configuration must not be changed adaptively after evidence is observed.
- The local deterministic provider can qualify only the bounded Promptfoo tracing lifecycle, not Codex deep tracing, authenticated-account continuity, zero egress, or live readiness.
- A provider failure can expose a second projection defect; the gate outcome remains usable while causal diagnosis must stay explicitly limited.

## Validation

The offline validation sequence is:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
git diff --check
git status --short
```

`experiment:verify:tracing` is a local integration checkpoint, not a live command. E1 and E2 remain outside validation and are prohibited until separate Gate 2 authorization.
ExecPlan 3 additionally requires `experiment:qualify:tracing` to emit `EXACT_SUPPORTED` and `experiment:verify:tracing` to pass before requesting Gate 2 authorization. Both commands use only a deterministic local provider and may require authorization for loopback bind.
