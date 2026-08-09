# ExecPlan 1 — Theory First Promptfoo Foundation: E0–E2

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Foundation commit: `b1d087898e18c3929d024e47bd52ef2331781cae`
- Hardened instrument commit: `60c024062df5aa1c1eadf08ced3de9e61bb7536f`
- Requalified instrument: ExecPlan 3 based on `63e6dc1`; Gate 2 must bind its freeze to the resulting clean Gate 1 commit
- Status: Gate 1 complete with `EXACT_SUPPORTED`; Gate 2 remains unauthorized and no live call has occurred.

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
- [ ] Obtain separate operator authorization for E1 after qualification and review.
- [ ] Create an instrument freeze with the operator's dedicated external login path.
- [ ] Execute the one E1 invocation and record G1.
- [ ] Execute baseline E2 and deep E2 only after their preceding gates.
- [ ] Commit curated reports only after verifying their bounded, sanitized contents.

## Decisions

- Direct `promptfoo.evaluate()` remains the only provider invocation surface.
- The public offline checkpoint is `npm run experiment:verify`; it imports no Promptfoo provider.
- At hardened commit `60c0240`, the live condition remained `writeLatestResults=false`; ExecPlan 2 could not mutate it retroactively.
- ExecPlan 3 prospectively supersedes the E2 portion of that condition with versioned `writeLatestResults=true`, while preserving E1 at `false`; schema-2 freezes are incompatible and cannot be reused.
- The hardening history is preserved as a closed record instead of being mixed into this RFC-scoped plan.
- E1 remains blocked regardless of a capability result until a later plan and explicit authorization change the frozen scientific configuration, if required.

## Risks and mitigations

- Forbidden credentials abort before Promptfoo evaluation; regression tests preserve this boundary.
- Promptfoo config, cache, and logs use unique temporary directories and are removed in `finally`.
- The external login path is sanitized before any persisted projection.
- Missing observation is never promoted to observed absence.
- Local persistence is distinct from sharing: all suites retain `sharing=false`, and every Promptfoo database remains temporary and isolated.
- The qualified instrument still requires a new clean-commit campaign and freeze plus separate Gate 2 authorization before E1.

## Lessons learned

- Typed presence, runtime presence, stable documentation, and operational integration are separate facts.
- Scientific configuration must not be changed adaptively after evidence is observed.
- The local deterministic provider can qualify only the bounded Promptfoo tracing lifecycle, not Codex deep tracing, authenticated-account continuity, zero egress, or live readiness.

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
