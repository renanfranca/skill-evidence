# Diagnose the E4 Author provider boundary

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current throughout execution.

Safety boundary: this work is authorized, defensive maintenance in this repository. It adds offline diagnostic observability only. It does not authorize a model-backed invocation, R3, E5, direct credential access, raw provider-error persistence, or model/condition changes.

The intended executor is `gpt-5.6-terra` with `xhigh` reasoning. The baseline is `feat/e4-evaluation-author-v0` at `21e5c31877987aba28b37f3b0fda9384213b5c7b`. The normative THEORY was read in full at `572e963ea6f1207ab53c533592cb70a8239e221c` on 2026-08-10. Official OpenAI model guidance was checked the same day and still lists Terra and xhigh; it does not establish account-specific availability or the Codex SDK error contract, so the pinned local SDK 0.147.0 types and behavior are the executable source for this diagnosis.

## Purpose / Big Picture

Make failures at the Promptfoo-to-Codex boundary observable without leaking their raw messages. Today Promptfoo retains a provider error, but Skill Evidence catches and collapses every invocation failure into bare `PROVIDER_ERROR`. After this plan, operators can distinguish failure stage and a conservative category before deciding whether a separately authorized real collection is justified.

## Scope

Included: a bounded diagnostic type; conservative classification; structured CLI error projection; behavior tests in the existing E4 suite; a zero-egress qualifier that exercises real Promptfoo and Codex SDK against a local fake Codex executable; an internal `experiment:qualify:author-provider` command; deterministic CI; post-GREEN design review; and documentation reconciliation.

Excluded: any `experiment:author` execution, R3 fixture/campaign/reservation, changes to Terra/xhigh, prompt/schema/lifecycle semantics, API-key use, authentication-file reads, raw error/log persistence, historical report rewriting, and conclusions about Author semantic quality.

## Definitions

- **Failure stage** is one of `EVALUATION`, `RESULT`, or `OUTPUT`: Promptfoo rejected, Promptfoo returned an absent/error result, or the result lacked text.
- **Failure category** is one of `AUTHENTICATION`, `MODEL_ACCESS`, `RATE_LIMIT`, `TIMEOUT`, `CONFIGURATION`, `PROCESS`, or `UNKNOWN`.
- **Safe code** is one of `HTTP_401`, `HTTP_403`, `HTTP_404`, `HTTP_429`, `ABORTED`, `EXIT_NONZERO`, `NO_RESULT`, `NO_TEXT`, or `UNCLASSIFIED`.
- **Local fake Codex** is an executable fixture that implements only the pinned SDK's `codex exec --experimental-json` JSONL boundary. It never opens a network connection.
- **Diagnostic qualification** proves projection and integration mechanics only. It does not prove live provider availability.

## Existing Context

R1 and R2 are independently closed `INSUFFICIENT`; both terminated quickly as `PROVIDER_ERROR` before an observed model or candidate. Authentication, configuration, runtime, websocket, and reachability preflights passed for R2, which is insufficient to attribute the failure.

The pinned Codex SDK wraps a CLI child process and exposes `turn.failed` and fatal error messages. Promptfoo 0.122.0 catches those messages and returns them in `result.error`. `createPromptfooAuthorInvoker` throws a plain `Error`, then `authorEvaluationBlueprint` catches it without inspection. The information loss is therefore in Skill Evidence.

## Desired End State

`AuthorRunResult` remains a discriminated union. Provider errors additionally contain:

```ts
interface AuthorProviderDiagnostic {
  stage: 'EVALUATION' | 'RESULT' | 'OUTPUT';
  category: 'AUTHENTICATION' | 'MODEL_ACCESS' | 'RATE_LIMIT' | 'TIMEOUT' | 'CONFIGURATION' | 'PROCESS' | 'UNKNOWN';
  code: 'HTTP_401' | 'HTTP_403' | 'HTTP_404' | 'HTTP_429' | 'ABORTED' | 'EXIT_NONZERO' | 'NO_RESULT' | 'NO_TEXT' | 'UNCLASSIFIED';
}
```

Only `PROVIDER_ERROR` carries this object. No raw message, cause, stack, absolute path, credential-like value, email, URL, response body, prompt, or session identifier crosses the Author boundary or CLI stderr.

The command reports a canonical safe JSON error containing its command code, status, and optional provider diagnostic. Existing success output remains unchanged.

`npm run experiment:qualify:author-provider` uses real Promptfoo and Codex SDK with a temporary local fake executable. It emits a canonical `DEVELOPMENT` report, zero external calls, explicit limitations, and `SUPPORTED_FOR_DEVELOPMENT` only when success and failure projections match.

## Milestones

### Milestone 1 — Preserve safe provider diagnostics

Add the first behavior to `test/evaluation-author.test.ts`: a Promptfoo `result.error` containing an absolute path, email, bearer token, and model-access signal must yield only `{stage:'RESULT', category:'MODEL_ACCESS', code:'HTTP_404'}`. Add behaviors for evaluation rejection, missing result, missing text, timeout, rate limit, authentication, configuration, process exit, and unknown failures one at a time.

Implement the smallest diagnostic module, typed provider error, `AuthorRunResult` projection, and structured command error required for GREEN. Classification is conservative: strict known patterns only; ambiguity becomes `UNKNOWN`. Numeric HTTP code precedence is 429, 401, 404, then 403; timeout/abort takes precedence over prose categories; model access requires an explicit model plus unavailable/not-found/unsupported/access signal.

Validation: `npm test -- --run test/evaluation-author.test.ts`, `npm run typecheck`, and `npm run experiment:verify`. Acceptance requires exact diagnostics, one attempt, no raw leakage, and provider imports still zero in the public checkpoint.

### Milestone 2 — Qualify the real local adapter boundary

Add a deterministic fake executable under `evaluations/refactor-design/e4-author/providers/`. It accepts the SDK arguments/stdin and selects a scenario from a qualifier-only environment variable. It emits valid JSONL for a completed turn, a `turn.failed` event, or a nonzero process exit. It never interprets the Author prompt, touches credentials, or connects to a network.

Add `src/author/qualify-author-provider.ts` and `experiment:qualify:author-provider`. The qualifier uses the production Promptfoo invocation, changes only `codex_path_override` and the fake-scenario environment, and checks success, model access, authentication, rate limit, timeout/abort, and process failure. It records local process calls and external calls separately.

Validation: focused behavior suite, the new command twice for deterministic equality, and `npm run experiment:verify`. Acceptance requires real Promptfoo/SDK traversal, canonical identical reports, zero external calls, and no credential/model-backed prerequisites.

### Milestone 3 — Review, reconcile, and validate

After the behavior suite, provider-free checkpoint, and qualifier are green, run `refactor-design`. Missing behavior returns to TDD; refactors remain behavior-preserving. Update `AGENTS.md`, this plan, its index, `package.json`, and CI. Add the new qualifier after `experiment:qualify:author`. Keep R1/R2 reports, reservations, fixtures, and E4 plan history unchanged.

Final validation without `experiment:author`:

```text
npm ci
npm audit --json
npm run typecheck
npm run lint
npm test
npm run prettier:check
npm run build
npm run experiment:verify
npm run experiment:qualify:archaeological
npm run experiment:qualify:author
npm run experiment:qualify:author-provider
npm run experiment:qualify:codex-otel
npm run experiment:qualify:tracing
npm run experiment:verify:tracing
git diff --check
git status --short
```

Acceptance requires every command green, zero external provider calls in the new qualifier, no real Author reservation, and canonical documentation aligned with behavior.

## Progress

- [x] Receive authorization to implement the proposed diagnostic plan.
- [x] Read THEORY in full at the recorded commit.
- [x] Inspect the pinned Promptfoo/Codex SDK error path.
- [x] Create this ExecPlan and its index entry.
- [x] Complete Milestone 1 through behavior TDD: 27 focused tests, typecheck, and provider-free checkpoint green.
- [x] Complete Milestone 2 through behavior TDD: real Promptfoo/SDK traversal, six local process calls, and zero external calls.
- [x] Pass the post-GREEN design review with no behavior-preserving refactor required.
- [x] Reconcile documentation and CI.
- [ ] Complete final deterministic validation.

## Decisions

- Decision: make no third real invocation in this plan.
  Rationale: R1/R2 establish repeatable boundary failure but not its cause; another opaque call would add cost without diagnostic evidence.
  Date/Author: 2026-08-10 / user and implementation agent.
- Decision: expose only bounded stage/category/code, not sanitized prose or message hashes.
  Rationale: bounded values answer operational routing questions without risking credential, path, identity, or low-entropy-message disclosure.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: classify conservatively and preserve `UNKNOWN`.
  Rationale: THEORY prohibits causal attribution without evidence; a false category is worse than an explicit unknown.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: qualify the actual Promptfoo/Codex SDK process boundary with a fake executable.
  Rationale: mock Promptfoo result objects alone would retest the existing mock seam and leave the failed integration layer unobserved.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: render command failures as canonical safe JSON, including the provider diagnostic only for `PROVIDER_ERROR`.
  Rationale: operators and report builders need a machine-readable boundary; unexpected errors must not fall back to arbitrary exception text.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: replace the empty Promptfoo test case with an explicit empty `vars` object.
  Rationale: Promptfoo 0.122.0 rejects `{}` before provider construction; `{vars:{}}` is the smallest valid, JSON-serializable case and lets the configured Codex SDK boundary execute.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: retain `UNCLASSIFIED` as the safe code when Promptfoo converts an observed HTTP 429 into its own rate-limit error without preserving the numeric status.
  Rationale: the category remains supported, but claiming an observed HTTP code after the adapter removed it would overstate the retained evidence.
  Date/Author: 2026-08-10 / implementation agent.

## Risks and Mitigations

- Risk: pattern matching invents a root cause. Mitigation: strict signals, precedence tests, and `UNKNOWN` fallback.
- Risk: diagnostics leak raw provider data. Mitigation: construct diagnostics from allowlisted enums only and test hostile messages through Author and CLI boundaries.
- Risk: the fake executable diverges from SDK 0.147.0. Mitigation: model only its documented/pinned argument and JSONL event contract and pin the qualifier report to SDK/Promptfoo versions.
- Risk: the qualifier accidentally uses the real Codex binary. Mitigation: require an absolute temporary override, assert a fake-call ledger, clear credential variables, and fail unless external calls remain zero.
- Risk: diagnostic support is mistaken for live readiness. Mitigation: `DEVELOPMENT` purpose, explicit limitations, unchanged E4/R1/R2 status, and no R3 authorization.
- Risk: a syntactically valid-looking Promptfoo suite can fail before provider construction. Mitigation: use the version-valid `{vars:{}}` case and traverse the real local adapter in CI.

## Validation Strategy

Every behavior follows `tdd-behavior-autonomous-quiet` through the existing E4 suite and stable Author/CLI contracts. The public-path checkpoint remains `experiment:verify`. The new qualifier supplies direct local evidence for the previously untested adapter boundary; it cannot support a live-readiness or Author-quality claim. Final validation runs only after GREEN and design review.

## Documentation Impact

- This plan and `docs/execplans/README.md` are canonical for diagnostic execution state.
- `AGENTS.md` documents the new zero-external-call qualifier and preserves the separately authorized live command.
- `package.json` and CI expose/run the deterministic qualifier.
- R1/R2 reports and plans, RFC 0001, ADR 0002, historical reports, schema, Author instructions, and model condition remain unchanged because this work changes observability, not evaluation semantics.

## Rollout and Recovery

There is no deployment or live collection. Commits can be reverted normally. If the qualifier cannot traverse Promptfoo/SDK without network, stop and keep the diagnostic types/tests without claiming boundary qualification. Any later R3 requires a separate plan and explicit one-call authorization.

## Lessons Learned

- R1/R2 did not show that the Author task is difficult; they showed that the live invocation boundary is opaque.
- The pinned dependencies already expose failure information. Skill Evidence currently discards it.
- Better observability must narrow uncertainty without converting error prose into unsupported causal attribution.
- Promptfoo failures can be projected at `EVALUATION`, `RESULT`, and `OUTPUT` without retaining their message. Known signals map to bounded categories, while ambiguous HTTP 403 and unknown prose remain explicit `UNKNOWN`.
- The local adapter qualifier reproduced the pre-provider failure from R1/R2: Promptfoo rejected `tests:[{}]` as structurally invalid, so those campaigns did not establish model difficulty or provider rejection.
- After changing the test case to `{vars:{}}`, all six local scenarios traversed Promptfoo and Codex SDK exactly once; the success scenario produced `READY` and each failure reached the bounded diagnostic projection.
- The post-GREEN design review found the qualifier cohesive and invocation-local: temporary paths, scenario state, and process ledgers do not escape a run. No refactor was justified beyond the existing typed adapter boundary.
