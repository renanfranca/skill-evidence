# Diagnose Luna/max Author operability

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-12
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Planning baseline: `feat/e5-blind-author-benchmark` at `9f9bece6b2c52763798ee3c16863d6ccb81627f2`
- Execution baseline: the clean commit that completes `2026-08-11-remediate-evaluation-author-lifecycle.md`; record its exact SHA and protocol-v2 fingerprints before implementation
- Intended branch: `feat/e5-luna-max-operability-diagnosis`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`
- Official OpenAI documentation consulted on 2026-08-12: [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model), [Responses API Multi-agent](https://developers.openai.com/api/docs/guides/responses-multi-agent), and [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Safety boundary: this plan diagnoses the authorized repository's Author provider path. Planning and offline instrumentation are authorized only when explicitly requested. Any model-backed invocation requires later authorization naming the exact fixture, protocol and condition fingerprints, commit, timeout, campaign, and call budget. E5 R1 must never be repeated.

## Purpose / Big Picture

Determine why the exact Luna/max Author workload failed to complete in E5 R1 and whether a fresh protocol-v2 Luna/max development canary can complete within a bounded diagnostic window. The result characterizes operational completion only; it does not score Blueprint semantics, qualify Luna, alter E5, or authorize normal Author use.

## Scope

Included: preserve E5 timeout evidence; verify relevant official model and subagent capabilities; improve sanitized observation of the Promptfoo/Codex SDK/CLI timeout boundary if needed; qualify that instrumentation with a deterministic local executable; prepare one novel development fixture and one optional single-call Luna/max canary under protocol v2; report a terminal operational result without retry.

Excluded: E5 cases, references, packets, scoring, adjudication, replacement or rerun; semantic comparison with Terra; Luna/xhigh or other condition comparison; enabling multi-agent; evaluating subagent quality; adaptive timeout increases; Blueprint qualification; production promotion; E6; and claims about general Luna reliability.

## Definitions

- **Operability** is the ability of the exact requested condition and adapter path to return a terminal canonical Author result within a declared wall-clock budget.
- **Diagnostic budget** is a prespecified observation window, not a relaxed E5 qualification threshold. This plan uses one 600-second hard ceiling for the optional canary.
- **Progress evidence** is sanitized event timing or stage transition data that proves how far the adapter path advanced without retaining response content, reasoning, credentials, or absolute paths.
- **Provider acceptance** means the provider path accepted the request; it is not proof of effective model identity or eventual completion.
- **Subagent hypothesis** is the suggestion that Luna/max may not support subagents. Official documentation contradicts that general claim, and E5 disabled multi-agent, so it is excluded as the direct E5 timeout cause unless new direct evidence shows the configuration was not honored.

## Existing Context

E5 R1 ran eight Luna/max samples once each, interleaved with eight successful Terra/xhigh samples. All Luna samples ended with `PROVIDER_ERROR`, diagnostic category `TIMEOUT`, code `ABORTED`, stage `RESULT`, no token usage, and no Blueprint. Seven elapsed values are approximately 300 seconds; one is approximately 263 seconds. The evidence establishes failure of the frozen five-minute completion gate but does not distinguish model latency from Promptfoo, Codex SDK, Codex CLI, session, cancellation, or telemetry behavior.

The Author adapter in `src/author/promptfoo-author-invoker.ts` sets `cli_config.features.multi_agent` to `false`, disables streaming, and applies Promptfoo `timeoutMs: 300000`. Therefore E5 did not request subagents. Official OpenAI documentation currently states that multi-agent is available for all GPT-5.6 API models; the Codex subagent guide explicitly recommends `gpt-5.6-luna` for narrow high-volume agents and includes Luna custom-agent examples. The Luna model page lists `max` as supported, while model guidance warns that higher reasoning effort increases latency and recommends comparing `max` with lower efforts on representative workloads. These sources establish capability, not account-specific availability or E5 root cause.

ExecPlan 17 changes the Author instructions and protocol fingerprint. Its stable protocol-v2 condition is the relevant future workload; this plan must not diagnose against a moving prompt or reuse the exposed E5 material.

## Desired End State

The repository can distinguish which layer initiated a timeout and whether any sanitized progress was observed, with deterministic offline evidence for cancellation and terminal projection. If separately authorized, exactly one fresh Luna/max protocol-v2 canary runs with multi-agent still disabled, zero retries, and a 600-second ceiling. A canonical report records `COMPLETED_WITHIN_DIAGNOSTIC_BUDGET`, `NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET`, or `INSUFFICIENT`, plus the narrower fact of whether the original 300-second operational target would have been met. No semantic score or qualification status is produced.

## Milestones

### Milestone 1 — Freeze the diagnosis and rule out unsupported hypotheses

Record the ExecPlan 17 completion commit and protocol-v2 instruction, protocol, schema, packet, and Luna/max condition fingerprints. Recompute the eight E5 Luna timeout facts from the immutable public report without opening raw local artifacts. Inspect the pinned Promptfoo 0.122.0, Codex SDK 0.147.0, and Codex CLI 0.147.0 timeout/cancellation surfaces to map the exact ownership of `timeoutMs`, `maxEvalTimeMs`, abort propagation, and available progress events.

Record official documentation snapshots by URL and consultation date. Treat these findings as bounded:

- Luna supports `max` reasoning;
- official API multi-agent supports all GPT-5.6 models;
- Codex documentation explicitly permits Luna custom subagents;
- E5 configured multi-agent off, so subagent capability does not explain its observed timeout;
- official documentation does not establish account-specific Luna availability, completion latency, or which local layer produced E5's abort.

Acceptance: every causal hypothesis is labeled supported, contradicted, or unresolved from direct evidence; no provider command, reservation, or model-backed probe runs.

Validation:

```text
git diff --exit-code -- docs/experiments/e5-author-benchmark-20260811-r1.json docs/experiments/e5-author-benchmark-20260811-r1
npm run typecheck
git diff --check
```

### Milestone 2 — Qualify sanitized timeout observability offline

Use `tdd-behavior-autonomous-quiet` to extend the existing Author provider boundary only where Milestone 1 demonstrates an observability gap. Preserve current error codes and avoid raw provider payloads. The stable result may add bounded fields such as timeout owner, last observed stage, progress-event presence, and cancellation acknowledgement only when the pinned surfaces expose them reliably.

Extend the deterministic local executable and Author provider qualifier to cover: no progress before timeout, progress followed by timeout, provider completion near but before the limit, cancellation acknowledgement, Promptfoo timeout, SDK/CLI process termination, and missing telemetry. Keep multi-agent disabled and prove the serialized invocation still contains `features.multi_agent: false` for Luna/max.

Acceptance: local tests identify timeout ownership without inference from elapsed time alone; no response text, reasoning, credentials, session content, or absolute path enters canonical evidence; external calls are zero.

Validation:

```text
npx vitest run test/evaluation-author.test.ts
npm run experiment:qualify:author-provider
npm run experiment:verify
npm run typecheck
npm run lint
```

### Milestone 3 — Prepare and separately authorize one development canary

Create a novel, non-E5 development skill whose snapshot is representative in packet size and Blueprint complexity but whose oracle tests only canonical completion, provenance, lifecycle control, and absence of invented context. Keep the oracle outside the nested skill root. Freeze one clean commit, campaign ID, snapshot, packet, protocol-v2 condition fingerprints, `gpt-5.6-luna`/`max`, multi-agent disabled, no retry, and a 600-second timeout.

Run provider-free preflight first. Stop and request explicit authorization naming all frozen identities and exactly one provider invocation. Planning, fixture creation, preflight, or offline qualification does not imply this authorization.

Acceptance before authorization: clean exact commit; writable authenticated Codex home; absent API-key variables; correct pinned versions and fingerprints; no prior reservation or output; one-call budget; zero calls performed.

### Milestone 4 — Execute once and report operational evidence

Only after exact authorization, atomically reserve the canary and invoke Luna/max exactly once through the final Promptfoo/Codex SDK path. Never retry under any terminal result. Classify mechanically:

- `COMPLETED_WITHIN_DIAGNOSTIC_BUDGET` when a canonical Author result completes within 600 seconds;
- `NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET` for a clean timeout at the 600-second ceiling;
- `INSUFFICIENT` for authentication, access, configuration, rate-limit, infrastructure, ambiguous cancellation, or another result that does not measure Luna/max completion.

Report whether elapsed time also met the historical 300-second target. Preserve requested model separately from observed model, which may remain `null`. Do not evaluate semantic quality beyond minimal artifact validity and safety checks, and do not convert completion into Author qualification.

Acceptance: exactly one reservation and at most one invocation exist; the sanitized report contains the declared status, stage evidence, elapsed time, normalized usage if available, limitations, and zero raw response/reasoning or secrets; E5 remains untouched.

### Milestone 5 — Review, reconcile, and validate

After offline behavior is green, execute `refactor-design`; return to TDD if it finds missing observable behavior. Update this plan, its index status, `AGENTS.md`, and operational command documentation. Preserve RFC 0001, ADR 0002, E4/E5 artifacts, and ExecPlan 17 unless a direct contradiction is discovered.

Run the repository's deterministic final validation without repeating any canary. Archive a sanitized report only after an authorized call terminates. The outcome may motivate a later model/effort comparison, but does not authorize Luna/xhigh, another timeout, or a blind campaign.

## Progress

- [x] Re-read THEORY commit `572e963` in full.
- [x] Inspect immutable E5 Luna timeout evidence and the multi-agent-disabled Author adapter.
- [x] Consult official OpenAI Luna, model-guidance, API multi-agent, and Codex subagent documentation.
- [x] Rule out unsupported Luna-subagent capability as the direct explanation for E5 R1.
- [x] Create this planned ExecPlan and its index entry.
- [ ] Receive authorization to execute Milestones 1 and 2 only.
- [ ] Record the completed ExecPlan 17 baseline and protocol-v2 identities.
- [ ] Complete offline diagnosis and observability qualification.
- [ ] Receive separate authorization to prepare a novel canary.
- [ ] Freeze and preflight the one-call canary without invoking a provider.
- [ ] Receive exact one-call authorization.
- [ ] Execute and report the canary exactly once.
- [ ] Complete post-GREEN review, documentation reconciliation, and final validation.

## Decisions

- Decision: investigate Luna/max operability separately from lifecycle remediation.
  Rationale: completion and semantic correctness are distinct claims; changing both prompt semantics and runtime diagnosis together would weaken attribution.
  Date/Author: 2026-08-12 / user and planning agent.

- Decision: run any future canary against the stable protocol-v2 condition, not E5's exposed protocol-v1 material.
  Rationale: protocol v2 is the candidate future workload, while E5 R1 is consumed and cannot provide fresh evidence.
  Date/Author: 2026-08-12 / user and planning agent.

- Decision: keep multi-agent disabled and treat subagent incompatibility as contradicted for E5 R1.
  Rationale: official documentation supports Luna subagents, and the actual E5 invocation explicitly disabled multi-agent.
  Date/Author: 2026-08-12 / planning agent.

- Decision: use one 600-second diagnostic canary without retry, while reporting the historical 300-second threshold separately.
  Rationale: twice the failed E5 window can distinguish a bounded latency mismatch from continued noncompletion without retrospectively changing E5's gate or permitting open-ended waiting.
  Date/Author: 2026-08-12 / planning agent.

- Decision: do not compare Luna/max with Luna/xhigh in this plan.
  Rationale: a reasoning-effort contrast would answer a different causal question, require another condition and provider budget, and should be considered only after basic completion is observed.
  Date/Author: 2026-08-12 / planning agent.

## Risks and Mitigations

- Risk: E5 is effectively rerun under a longer timeout. Mitigation: use a novel development fixture, new campaign and fingerprints, and report the 300-second miss separately without reclassifying E5.
- Risk: a longer ceiling is selected because five minutes failed. Mitigation: label 600 seconds diagnostic rather than acceptable production latency, freeze it before the call, and permit no further extension or retry.
- Risk: model support documentation is mistaken for observed account availability. Mitigation: treat official sources as capability documentation only; preserve actual access as an observed canary outcome.
- Risk: Luna completion is mistaken for semantic quality. Mitigation: score only operational completion and minimal canonical validity; no reference evaluation or Author qualification is included.
- Risk: elapsed time is used to infer timeout ownership. Mitigation: add only directly observable stage/cancellation fields and leave ownership unknown when pinned surfaces cannot establish it.
- Risk: enabling subagents changes the workload. Mitigation: retain `features.multi_agent: false` and assert it in deterministic tests and preflight.
- Risk: investigation expands into adaptive model comparison. Mitigation: exclude Luna/xhigh, Terra, retries, repeated samples, and follow-up calls from this plan.

## Validation Strategy

Progress from immutable-report inspection to pinned dependency analysis, behavior-focused timeout tests, the public provider-free checkpoint, deterministic local provider qualification, and an exact clean preflight. A real canary is optional and separately authorized only after every offline gate passes. Its terminal result is preserved without retry. Final validation never repeats it.

## Documentation Impact

- This ExecPlan and `docs/execplans/README.md`: canonical roadmap and living diagnostic record.
- `2026-08-11-remediate-evaluation-author-lifecycle.md`: explicit protocol-v2 handoff, without absorbing diagnosis.
- `AGENTS.md`: updated only when an offline diagnostic or separately authorized canary command exists.
- Official OpenAI documentation: dated operational input about supported capabilities, not evidence of account access, latency, or E5 cause.
- RFC 0001 and ADR 0002: unchanged unless direct inspection finds a normative contradiction.
- E5 reports, bundle, preparation, reservations, packets, scoring, and adjudication: immutable.

## Rollout and Recovery

There is no deployment. Land offline observability changes separately from any fixture/preflight and from any later canary report, using `commit-the-changes`. Revert code normally before a real reservation. After a canary reservation, preserve its terminal outcome and never reuse its campaign or fixture for another call.

## Lessons Learned

- Eight uniform timeouts establish a condition-level completion problem under the frozen budget but do not identify its layer or semantic cause.
- Official OpenAI documentation supports Luna for subagents and `max` reasoning; capability documentation cannot replace direct runtime evidence.
- E5 explicitly disabled multi-agent, so subagent support is orthogonal to its timeout unless future evidence proves the configuration was ignored.
- A diagnostic timeout may be wider than a historical qualification gate only when both are reported separately and the wider window does not rewrite the prior result.
