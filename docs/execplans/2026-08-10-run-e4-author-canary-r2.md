# Run a fresh E4 Author canary — R2

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current throughout execution.

Safety boundary: this work is authorized, defensive maintenance in this repository. It authorizes exactly one new development-only provider invocation. It does not authorize a retry, a decision run, automatic Author qualification, direct credential access, or progression to E5 without the prespecified result.

The intended executor is `gpt-5.6-terra` with `xhigh` reasoning. The baseline is `feat/e4-evaluation-author-v0` at `2089a3d54970d09e790d514e468168e21cc15304`. The normative THEORY was read in full at commit `572e963ea6f1207ab53c533592cb70a8239e221c` on 2026-08-10. Official OpenAI model guidance was checked on 2026-08-10 and identifies `gpt-5.6-terra` as the GPT-5.6 balance of intelligence and cost and `xhigh` as a supported reasoning effort.

Closure status: `CLOSED — INSUFFICIENT`. The sole R2 invocation ended in `PROVIDER_ERROR` before producing a candidate or observed model. Milestone 4 experimental success was not satisfied, no retry is authorized, and E5 remains unauthorized.

## Purpose / Big Picture

Run one fresh E4 development canary after the original campaign closed `INSUFFICIENT` on `PROVIDER_ERROR`. This collection uses a novel skill fixture, campaign, reservation, snapshot, and packet so it cannot overwrite or retrospectively adapt the first result. A successful candidate may satisfy the missing E4 development acceptance checks and support planning E5; it does not qualify the Author or erase the prior provider failure.

## Scope

Included: preserve the first campaign unchanged; record a sanitized diagnosis; add one new development fixture and its mechanical oracle; create a clean preparation commit; preflight the exact instrument, authentication mode, connectivity, credentials environment, fingerprints, output target, and reservation; reserve and invoke Terra/xhigh exactly once through Promptfoo; publish a sanitized canonical report; reconcile the E4 status; and run deterministic final validation without another provider call.

Excluded: reuse or modification of the timeline-normalizer fixture or campaign; retry under any terminal outcome; model comparison; model substitution; prompt or schema adaptation after observing R2; E5 benchmark material; qualification claims; public CLI work; decision runs; access to `auth.json` contents; raw provider errors, model reasoning, Promptfoo raw output, local Codex state, or credentials in committed artifacts.

## Definitions

- **R1** is the closed `e4-timeline-normalizer-20260810` campaign whose only invocation ended in `PROVIDER_ERROR`.
- **R2** is the new `e4-dependency-change-ledger-20260810-r2` campaign authorized by the user on 2026-08-10 for one invocation.
- **Novel fixture** means a skill with a different task family and content from R1, prepared before R2 collection and never adapted after the reservation.
- **Sanitized diagnosis** means only bounded status categories and non-secret health checks; it excludes raw provider messages, authentication material, prompts, output, and reasoning.
- **Terminal outcome** means completed candidate, provider error, timeout, invalid JSON, fenced JSON, structural invalidity, or fabrication. Every terminal outcome consumes R2 and prohibits another call under this plan.

## Existing Context

E4 product intake, Blueprint semantics, Author orchestration, deterministic qualification, and CI are implemented and green. The original E4 plan is canonically `CLOSED — INSUFFICIENT`: R1 consumed one reservation but produced no candidate, leaving every candidate-dependent check `NOT_OBSERVED`.

The R1 implementation normalized the provider failure before persisting a safe subtype, so its root cause cannot be reconstructed from committed evidence. Read-only R2 diagnosis found Codex CLI/SDK 0.147.0 installed, ChatGPT authentication configured in `/home/renanfranca/.codex`, no stored API key, the configured model `gpt-5.6-terra`, parseable configuration, healthy local state databases, successful websocket handshake, and reachable ChatGPT provider endpoints. `codex doctor` also reported an npm global-versus-project install-management mismatch and missing historical rollout inventory rows; neither finding demonstrates invocation failure. Its server-model-presence check was false, so account-specific Terra availability remains unverified until the sole R2 invocation. No model-backed diagnostic call was made.

## Desired End State

The R1 reservation, report, fixture, and history remain unchanged. R2 has one immutable reservation tied to a clean preparation commit and the new fixture fingerprints. Exactly one provider invocation is recorded, followed by a canonical sanitized report under `docs/experiments/`.

R2 is `SUPPORTED_FOR_E5` only if the provider returns pure JSON, Skill Evidence composes lifecycle `BLOCKED`, the candidate captures observable contracts and activation boundaries, missing decision context remains in structured blocking requirements, no absent context is fabricated, controlled fields remain system-owned, provenance stays `NOT_QUALIFIED`, and `decisionEligible` stays false. Any other outcome is `INSUFFICIENT`. Even `SUPPORTED_FOR_E5` permits only planning the blind E5 qualification; it is not Author qualification.

## Milestones

### Milestone 1 — Prespecify the independent collection

Create this plan and add it to `docs/execplans/README.md`. Record the R1 limitation, current sanitized health evidence, exact new campaign, one-call stopping rule, acceptance checks, and distinction between E4 development support and E5 qualification.

Validation: `npx prettier --check docs/execplans/2026-08-10-run-e4-author-canary-r2.md docs/execplans/README.md` and `git diff --check`. Acceptance requires a self-contained authorization that cannot be interpreted as permission to retry R1 or repeat R2.

### Milestone 2 — Prepare a novel fixture and hidden oracle

Add `evaluations/refactor-design/e4-author/development-canary-r2/skill/SKILL.md` for a dependency-change ledger that deterministically normalizes only user-supplied records and refuses compatibility, security, licensing, or upgrade inference. Add its mechanical oracle at `evaluations/refactor-design/e4-author/development-canary-r2/oracle.json`, outside the snapshot root. Do not place expected lifecycle, oracle checks, evaluation terms, or decision thresholds inside the skill.

Validation: `npm test -- --run test/evaluation-author.test.ts`, `npm run experiment:verify`, and packet inspection showing that only the `skill/` root enters the snapshot. Acceptance requires a new task family, observable positive/negative activation regions, direct output contracts, clear responsibility boundaries, deliberately absent decision context, and no R1 content reuse.

### Milestone 3 — Freeze preparation and pass preflight

Use `commit-the-changes` to create one clean preparation commit containing only this plan, its index entry, and the new fixture/oracle. From that exact clean commit, verify Codex CLI and SDK 0.147.0; Promptfoo 0.122.0; Node 24; a writable `/home/renanfranca/.codex` with ChatGPT login; absent `OPENAI_API_KEY` and `CODEX_API_KEY`; successful bounded Codex doctor checks for auth, runtime, configuration, websocket, and reachability; no existing R2 reservation; a nonexistent writable output target; and matching snapshot, schema, prompt, packet, and condition fingerprints. Record only sanitized outcomes.

Acceptance requires a clean exact commit and all mandatory checks green. Account-specific model availability may remain explicitly unknown because testing it would consume the authorized call.

### Milestone 4 — Reserve, invoke once, and classify

Run exactly:

```text
SKILL_EVIDENCE_AUTHOR_CODEX_HOME=/home/renanfranca/.codex npm run experiment:author -- \
  --skill evaluations/refactor-design/e4-author/development-canary-r2/skill \
  --out .skill-evidence/e4-dependency-change-ledger-20260810-r2.blueprint.json \
  --campaign e4-dependency-change-ledger-20260810-r2 \
  --approve-provider-invocations 1
```

Do not retry. After the process terminates, verify the exclusive reservation and invocation count. If a Blueprint exists, apply the prespecified oracle mechanically; otherwise mark candidate-dependent checks `NOT_OBSERVED`. Create `docs/experiments/e4-evaluation-author-canary-r2-20260810.json` with canonical JSON, safe statuses, exact preparation commit and fingerprints, requested and observed model, one attempt, zero retries, limitations, and `SUPPORTED_FOR_E5` or `INSUFFICIENT`.

Acceptance requires truthful terminal classification and preservation of the one-call rule. Experimental success additionally requires every prespecified candidate check to pass.

### Milestone 5 — Reconcile and validate without another call

Update this plan, `docs/execplans/README.md`, and the original E4 plan only as needed to distinguish R1 history, R2 result, E4 acceptance, and E5 authorization. Leave RFC 0001, ADR 0002, R1 report/reservation, E0–E3 history, and all raw local artifacts unchanged. Run the complete deterministic validation sequence without invoking `experiment:author` again.

Final validation:

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
npm run experiment:qualify:codex-otel
npm run experiment:qualify:tracing
npm run experiment:verify:tracing
git diff --check
git status --short
```

Acceptance requires every deterministic command green, no second provider call, and canonical documentation matching the R2 evidence.

## Progress

- [x] Receive explicit user authorization for one fresh attempt.
- [x] Read THEORY in full at `572e963ea6f1207ab53c533592cb70a8239e221c`.
- [x] Check current official OpenAI model guidance for Terra/xhigh.
- [x] Complete bounded read-only diagnosis without a model invocation.
- [x] Create the R2 ExecPlan and index entry.
- [x] Prepare the novel R2 fixture and hidden oracle.
- [x] Validate and commit the clean R2 preparation at `a11382265196cd67fece29934d716f1a2f36a839`.
- [x] Pass every mandatory preflight from the exact preparation commit.
- [x] Reserve and execute exactly one R2 invocation. It ended in terminal `PROVIDER_ERROR` before producing a candidate.
- [x] Publish and commit the sanitized R2 report as `INSUFFICIENT` with one attempt and zero retries.
- [x] Reconcile E4 status and complete deterministic final validation without another real call.

## Decisions

- Decision: interpret “Siga com nova tentativa” as authorization for exactly one new provider invocation under the existing one-call safety pattern.
  Rationale: the user explicitly requested a new attempt after being told that it requires new authorization; the command itself still enforces approval value `1`.
  Date/Author: 2026-08-10 / user and implementation agent.
- Decision: create R2 as an independent campaign rather than reopening R1.
  Rationale: R1 is terminal evidence; new campaign, fixture, snapshot, packet, output, and reservation identities prevent overwrite or retrospective adaptation.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: preserve Terra/xhigh and Codex 0.147.0.
  Rationale: changing model or instrument would change the condition and would not fill the missing E4 acceptance evidence for the prespecified baseline.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: do not change product code or add artificial TDD work before R2.
  Rationale: bounded diagnostics found no evidenced product defect; speculative changes would confound the new collection. Existing behavior tests and provider-free checkpoints validate the unchanged instrument.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: classify R2 as `INSUFFICIENT` and leave all candidate-dependent checks `NOT_OBSERVED`.
  Rationale: the sole invocation ended in `PROVIDER_ERROR` with no Blueprint output or observed model. Authentication and connectivity preflight success cannot manufacture the missing candidate evidence or establish a root cause.
  Date/Author: 2026-08-10 / implementation agent.
- Decision: keep E5 unauthorized after R2.
  Rationale: two provider failures provide no observation of Author semantics, so the missing E4 acceptance evidence remains missing even though the offline product core is green.
  Date/Author: 2026-08-10 / implementation agent.

## Risks and Mitigations

- Risk: R2 becomes an unauthorized retry of R1. Mitigation: immutable R1 artifacts and distinct fixture, campaign, reservation, output, fingerprints, and report.
- Risk: a positive R2 result hides the prior failure. Mitigation: report both campaigns separately and retain R1 as `INSUFFICIENT` evidence.
- Risk: unknown account-specific Terra access causes another provider error. Mitigation: verify documented model validity, ChatGPT auth and connectivity before cost, retain availability as explicit uncertainty, and classify failure terminally without retry.
- Risk realized: R2 also ended in `PROVIDER_ERROR`. Mitigation applied: preserve the exclusive reservation, make no retry, publish only sanitized bounded evidence, and keep E4 acceptance unsatisfied.
- Risk: diagnostic output leaks credentials or local state. Mitigation: inspect only redacted/bounded statuses, never read `auth.json`, and commit no doctor output or raw provider diagnostics.
- Risk: the hidden oracle leaks into the Author packet. Mitigation: snapshot only the nested `skill/` directory and inspect its manifest/fingerprint before reservation.
- Risk: post-result adaptation biases classification. Mitigation: commit plan, fixture, oracle, and checks before reservation; after invocation only mechanical classification and sanitization are allowed.
- Risk: `SUPPORTED_FOR_E5` is mistaken for qualification. Mitigation: preserve `NOT_QUALIFIED`, `decisionEligible: false`, development-only language, and require a separate blind E5 ExecPlan.

## Validation Strategy

Validation progresses from formatting and the existing E4 behavior suite to the provider-free checkpoint, clean preparation commit, bounded authentication/connectivity preflight, one terminal provider call, mechanical oracle application, documentation reconciliation, and the full deterministic suite. No offline check substitutes for the real call, and no successful development canary qualifies the Author. Failures are assigned only when direct evidence supports attribution; otherwise the report uses an explicit unknown or `NOT_OBSERVED` state.

## Documentation Impact

- `docs/execplans/2026-08-10-run-e4-author-canary-r2.md` is the canonical R2 authorization, progress record, and handoff.
- `docs/execplans/README.md` indexes R2 separately from the closed R1-backed E4 plan.
- `docs/execplans/2026-08-10-build-evaluation-author-v0.md` remains the canonical R1 history and changes only after R2 if its statement about E4 acceptance or E5 support changes.
- `docs/experiments/e4-evaluation-author-canary-r2-20260810.json` is the canonical sanitized R2 result and was created only after the invocation terminated.
- `AGENTS.md`, RFC 0001, ADR 0002, package configuration, CI, product code, deterministic fixtures, and historical reports remain accurate because R2 changes no software contract or normal automation.

## Rollout and Recovery

There is no deployment. Before reservation, the preparation commit can be reverted normally. Once the R2 reservation is written, its outcome is terminal and must be preserved; failure, timeout, invalid output, or semantic rejection cannot be retried under this plan. Recovery from another insufficient result requires stopping and reporting the evidence, not creating R3 implicitly.

## Lessons Learned

- A generic sanitized `PROVIDER_ERROR` protects secrets but cannot establish root cause after the fact.
- Codex doctor can validate authentication mode, configuration parsing, runtime health, and connectivity without a model-backed Author invocation, but it does not prove account-specific model availability or candidate production.
- A new development collection must preserve the failed campaign and use independent identities so that it adds evidence instead of rewriting history.
- R2 passed authentication, configuration, runtime, websocket, reachability, snapshot-blindness, and fingerprint preflights, yet its sole invocation failed before a model or candidate was observed. The evidence narrows neither account-specific model availability nor provider integration as the cause; attributing either would exceed observation.
- Two independent development canaries now show terminal provider failure under the same Author condition. This is evidence against declaring the E4 instrument operationally demonstrated, not evidence about the Author's semantic quality.
- Final deterministic validation passed: npm audit reported zero vulnerabilities; 85 tests passed; provider-free verification reported zero imports; archaeological and Author qualifiers remained supported; Codex OTEL and Promptfoo tracing remained `EXACT_SUPPORTED`; loopback tracing integration passed; formatting and `git diff --check` were clean. No second Author invocation occurred.
