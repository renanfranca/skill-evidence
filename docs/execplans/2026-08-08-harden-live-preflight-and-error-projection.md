# ExecPlan 4 — Harden Live Preflight and Error Projection

- Date: 2026-08-08
- Executor: `gpt-5.6-terra`, reasoning `xhigh`
- THEORY consulted in full: commit [`572e963ea6f1207ab53c533592cb70a8239e221c`](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Planning baseline: `80d392287e60b2255e3a548126c9e6a6b26adefe`
- Status: complete, green, and committed at `43cb680358ad2ee6b31c17962d5624a342d76d76`

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current while implementation advances. It is a self-contained handoff for the executor named above.

## Purpose / Big Picture

Harden the existing E0–E2 experiment instrument against the two defects exposed by the terminated Gate 2 campaign. A live command must reject an external `CODEX_HOME` that cannot be written before Promptfoo is loaded or provider budget is reserved, and Promptfoo summaries containing JavaScript `undefined` values must remain canonically persistable without replacing a legitimate provider error with a projection failure.

The observable result is fail-closed behavior with a sanitized, explicit login-directory error and lossless retention of a benign provider error in the curated E1 report, where G1 remains `ERROR`. This is authorized defensive instrument development only. It does not authorize a live invocation, freeze, campaign, credential inspection, commit, or push.

## Scope

In scope: the live preflight in `experiments/run.ts`; the opaque-evidence projection in `experiments/redaction.ts`; behavior tests in the existing suites; this living plan; the ExecPlan index; one follow-up pointer in the terminated campaign record; and, after explicit authorization on 2026-08-09, upgrading only the Vitest development dependency to a version whose timeout accounting uses a monotonic clock.

Out of scope: any `experiment:e1`, `experiment:e2:baseline`, `experiment:e2:deep`, or `experiment:freeze` command; a new or reused campaign; a new freeze; reading `auth.json` or any credential content; changing Promptfoo, Codex SDK, or Codex CLI versions; changing scientific configuration, APIs, command interfaces, freeze schema, reports, thresholds, budgets, retry policy, or provider configuration; modifying ignored campaign artifacts; generating `docs/experiments/`; committing; and pushing.

The completed implementation may run the deterministic local tracing qualifier and checkpoint. Those commands use a local provider and loopback receiver only. Filesystem or `127.0.0.1` bind authorization for those checkpoints does not authorize a model-backed or external provider call.

## Definitions

**External `CODEX_HOME`** is the dedicated, already logged-in directory supplied through `SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME`; the instrument may inspect directory metadata and access permissions but must not read credential files. **Writable preflight** is a Node filesystem `access` check with `W_OK`, completed before Promptfoo loading and before `reserveProviderInvocation()`. **Provider budget reservation** is the exclusive campaign reservation and ledger written by `experiments/budget.ts`; its presence means an invocation was considered started. **Opaque evidence** is provider-supplied summary or trace data that must be sanitized before canonical persistence. **Error projection** is the sanitized summary representation consumed by `assessE1()` and `assessProviderOutcome()`. **Canonical JSON** is the deterministic serialization defined by `experiments/canonical.ts`, which rejects JavaScript `undefined`. **Monotonic clock** is elapsed-time measurement that does not move when the host wall clock is corrected; unlike `Date.now()`, `performance.now()` is suitable for timeout duration. **Historical campaign** is `foundation-e0-e2-gate2-20260808`, already terminated with `g1: ERROR` and immutable evidence.

## Existing Context

At planning baseline `80d3922`, `runLiveExperiment()` in `experiments/run.ts` validates a non-empty external path, calls generic `access(path)`, derives a device/inode identity, checks credentials and freeze compatibility, creates a synthetic workspace, and only later reserves budget and dynamically loads Promptfoo. Generic access establishes existence but not write capability. A read-only login directory can therefore consume a reservation before the Codex provider fails while initializing its app-server client.

`sanitizeForPersistence()` in `experiments/redaction.ts` redacts credential-like fields, raw payloads, reasoning text, and the external login path. It recursively retains every object entry and array position. If Promptfoo includes an optional property with value `undefined`, the sanitizer returns `undefined`; `canonicalJson()` then throws `cannot canonically serialize undefined`. The live runner catches that projection error as though it were the provider failure, so the terminated campaign retained G1 as `ERROR` but its curated `providerError` did not preserve the operator-visible cause.

`assessE1()` in `experiments/report.ts` already preserves a string at `results[0].response.error` and yields G1 `ERROR`; it needs no contract change. `test/live-experiment-runner.test.ts` is the existing behavior suite for ordering, reservation, and persisted live projections. `test/redaction.test.ts` and `test/pre-live-hardening.test.ts` already protect redaction semantics. The baseline suite contains 43 tests; the two planned behavior cases bring the expected total to 45.

The THEORY requires direct evidence to be retained when available, evaluator failures to remain distinct from provider or environment failures, causal classification to follow evidence rather than outcome alone, and historical evidence to remain provenance after conditions change. ADR 0002 requires instrument development to occur out of band without adapting or reopening the observed campaign. This plan follows those constraints: it repairs future measurement, does not reinterpret the stopped run, and requires a later committed instrument revision and a separately authorized new campaign.

## Desired End State

`runLiveExperiment()` requires the external login directory to be accessible and writable with `W_OK` before any provider module can load and before any reservation or budget ledger can be created. A read-only filesystem or insufficient permission produces one explicit domain error that names the external `CODEX_HOME` writability problem but contains neither the supplied path nor a lower-level filesystem message that could disclose it.

`sanitizeForPersistence()` omits object properties whose values are `undefined`, converts `undefined` array positions to `null`, and converts a root `undefined` to `null`. Existing credential, external-path, raw-content, and reasoning redaction remains unchanged. Non-sensitive provider-error text and numeric reasoning-token metadata remain unchanged. The sanitized result always remains in the value domain accepted by `canonicalJson()` for these cases.

A Promptfoo E1 summary containing a legitimate provider error plus optional `undefined` fields is written as canonical JSON. Its raw sanitized projection and curated report contain the exact benign provider-error string, and the curated report retains `g1: ERROR`. Public APIs, CLI commands, scientific configuration, freeze schema, and reporting schema do not change.

The standard `npm test` command runs all 45 cases with timeout duration measured monotonically. Host wall-clock corrections cannot turn a test lasting milliseconds into a false five-second timeout. Test scheduling, assertions, timeout limits, and the public command remain unchanged.

Because a clean worktree is required for freeze and live execution and freezes bind the repository commit, the future hardening commit will naturally make older freezes non-current. No schema bump or scientific-configuration edit is needed. No prior freeze or campaign may be migrated, extended, retried, or reused.

## Milestones

### Milestone 1 — Reject a non-writable external login before cost

#### Goal

Make external-login writability a mechanical precondition that fails before Promptfoo load and before provider budget reservation.

#### Changes

- [ ] In `test/live-experiment-runner.test.ts`, add one behavior case that creates a valid freeze while a dedicated temporary login directory is writable, makes that existing directory non-writable, invokes E1 with a loader spy, and restores permissions in `finally`.
- [ ] Assert that the rejection explicitly identifies an inaccessible or non-writable external `CODEX_HOME`, does not include the real directory path, leaves the Promptfoo load count at zero, and creates neither `reservations/e1.json` nor `budget-ledger.json`.
- [ ] In `experiments/run.ts`, import Node's `W_OK` constant and strengthen the existing external-home preflight with `access(..., W_OK)` before freeze validation, workspace creation, reservation, or provider loading.
- [ ] Translate permission-denied and read-only-filesystem failures into one stable sanitized error. Do not interpolate the path, raw error message, credential state, or file contents.
- [ ] Preserve the existing stable directory-identity check and all downstream ordering. Do not read `auth.json` or probe login contents.
- [ ] Update this plan's `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` immediately with the observed RED and GREEN evidence.
- [ ] Canonical documentation needs no behavioral interface update in this milestone because commands, scientific contracts, and public report formats remain unchanged; this plan is the development record.

#### Validation

- [ ] RED command: `npm test`
- [ ] RED expected result: the suite runs 44 tests and only the new non-writable-login behavior fails for the predicted reason; the loader and reservation assertions demonstrate the missing preflight.
- [ ] GREEN command: `npm test`
- [ ] GREEN expected result: all 44 tests pass, including fail-before-load and fail-before-reservation assertions.

Observed on 2026-08-08: RED ran all 44 tests with 43 passing and only the new behavior failing because the call completed instead of rejecting. The minimum GREEN added `access(path, constants.W_OK)` with a fixed path-free domain error before identity, freeze, workspace, reservation, or provider loading. The first GREEN run reported an impossible pre-existing-test timeout in 9 ms; an immediate full-suite diagnostic repetition passed all 44 tests in 14 files, confirming the anomaly did not reproduce.

#### Acceptance Criteria

- [ ] An existing but non-writable external `CODEX_HOME` cannot reach Promptfoo loading or budget reservation.
- [ ] The caller receives a stable, explicit, path-free error for read-only or insufficient-permission conditions.
- [ ] Writable directories continue through the existing live orchestration behavior without an API or configuration change.

### Milestone 2 — Preserve provider errors across undefined normalization

#### Goal

Make opaque Promptfoo summaries with optional `undefined` values canonically persistable while preserving both safety redaction and the provider's causal error signal.

#### Changes

- [ ] Add one behavior case to the existing live runner or redaction behavior suite at the highest useful observation point. Feed a Promptfoo-style E1 summary containing a benign exact provider error, undefined object properties, undefined array positions, a root-undefined projection assertion, credential-like content, an external path, raw reasoning text, and numeric reasoning-token metadata.
- [ ] Assert canonical persistence succeeds; undefined object properties are absent; undefined array positions and root undefined become `null`; the exact benign provider error survives; credential-like values, the real external path, and raw reasoning do not survive; numeric reasoning metadata remains; and the curated E1 report has `g1: ERROR` with that same provider error.
- [ ] In `experiments/redaction.ts`, normalize `undefined` by container semantics: root and array values become `null`, while object entries with undefined values are filtered out before key-based redaction and recursive sanitization.
- [ ] Preserve the existing behavior for all defined primitives, arrays, objects, provider errors, credential-like keys, raw fields, paths, structured reasoning settings, reasoning text, and numeric reasoning-token values.
- [ ] Do not relax `canonicalJson()` or make it silently accept arbitrary unsupported values; normalization belongs at the opaque-evidence boundary.
- [ ] Update this plan's living sections immediately with RED and GREEN evidence.
- [ ] Canonical documentation needs no behavioral interface update in this milestone because the change repairs evidence fidelity inside the existing report contract.

#### Validation

- [ ] RED command: `npm test`
- [ ] RED expected result: the suite runs 45 tests and only the new undefined/provider-error projection behavior fails because canonical persistence still encounters `undefined` or loses the causal error.
- [ ] GREEN command: `npm test`
- [ ] GREEN expected result: all 45 tests pass and the persisted projection is canonical, sanitized, and error-faithful.
- [ ] Public checkpoint after both cycles: `npm run experiment:verify`
- [ ] Expected result: offline verification passes without importing Promptfoo or invoking any provider.

Observed on 2026-08-08: RED ran all 45 tests with 44 passing and only the new live projection behavior failing. The persisted fallback contained `providerError: "cannot canonically serialize undefined"`, directly reproducing the historical projection defect. The minimum GREEN maps root and array `undefined` values to `null` and filters undefined object entries before existing redaction. All 45 tests in 14 files then passed, preserving the exact benign provider error, G1 `ERROR`, canonical JSON, path and credential redaction, raw-reasoning redaction, and numeric reasoning-token metadata. `npm run experiment:verify` passed with `provider imports: 0`.

#### Acceptance Criteria

- [ ] Every `undefined` in the tested Promptfoo summary is normalized according to its object, array, or root position.
- [ ] The benign provider-error string survives byte-for-byte while existing sensitive-data and reasoning redaction remains effective.
- [ ] G1 remains `ERROR`, now with the provider cause rather than a sanitizer/canonicalizer error.

### Milestone 3 — Stabilize timeout accounting after the exception gate

#### Goal

Make the repository's unchanged `npm test` interface reliably execute all 45 behavior cases in a host whose wall clock jumps while processes are running.

#### Changes

- Record the bounded diagnostic matrix, the rejected file-serialization hypothesis, and direct wall-clock drift observations before dependency changes.
- Update only the `vitest` development dependency and its lockfile resolution from 3.2.7 to 4.1.10. Preserve Node 24/npm 11 engines and every production dependency.
- Confirm from the official packaged runner that 3.2.7 computes post-test timeout duration with `Date.now()` and 4.1.10 uses `performance.now()` when available.
- Treat the repeated false timeout under observed ±339-second wall-clock jumps as RED and require repeated standard `npm test` passes after the dependency update as stability GREEN evidence.
- Do not increase timeout values, patch `Date.now()`, skip tests, reduce assertions, change the `npm test` script, or serialize production or test operations.
- Run `npm run experiment:verify` after the dependency change. This checkpoint remains provider-free.
- Update this plan with the diagnostic evidence, rationale, stability repetitions, and any residual limitation.

#### Validation

- RED evidence: among eight standard runs, one failed with immediate false timeouts; among twelve explicit thread-pool runs, two failed. The failures moved among existing tests. A preload diagnostic directly observed wall-clock drift of approximately ±339 seconds during otherwise short test processes. File serialization was tested, failed immediately after promotion, and was reverted.
- GREEN command: run the unchanged `npm test` command repeatedly after upgrading Vitest.
- GREEN expected result: every repetition reports 14 files and exactly 45 passing tests, with no timeout, skipped test, retry, or assertion change.
- Public checkpoint: `npm run experiment:verify` passes with zero provider imports.

#### Acceptance Criteria

- The standard repository command, not a special preload or wrapper, owns stable monotonic timeout accounting.
- All existing and new behavior cases still execute and the expected count remains 45.
- No timeout is enlarged and no runtime, live, scientific, freeze, or report contract changes; only the development test runner changes.

Observed on 2026-08-09: a temporary preload that returned the real wall clock unchanged recorded repeated jumps near ±339 seconds across Vitest processes. Inspection of the installed 3.2.7 runner showed that its post-resolution timeout check subtracts `Date.now()` values; inspection of the official packaged 4.1.10 runner showed the same check using `performance.now()` when available. `npm install --save-dev vitest@4.1.10` changed only the direct Vitest development pin plus its locked transitive graph. The unchanged `npm test` command then passed all 45 tests in 14 files once, followed by 20 consecutive stability repetitions. A further instrumented run passed all 45 tests while directly observing a +339302 ms wall-clock jump, which would have generated the false timeout under 3.2.7. `npm run experiment:verify` then passed with `provider imports: 0`.

### Milestone 4 — Review design, reconcile records, and qualify the instrument

#### Goal

Confirm that the two instrument behaviors and the test-runner correction are structurally sound, preserve the stopped campaign as history, and produce complete local validation evidence without any live activity.

#### Changes

- [ ] Enter `$refactor-design` only after both behaviors, the 45-test suite, and `npm run experiment:verify` are green and no requested behavior remains pending.
- [ ] Read the skill's design-review rubric, inspect only the changed code and adjacent contracts, classify findings, and apply only behavior-preserving simplifications justified by a concrete design risk. If no material risk exists, record `No action`; do not manufacture an abstraction.
- [ ] Reuse the behavior tests and offline checkpoint after every material refactor. If review discovers missing behavior or requires an API, schema, scientific-configuration, or architecture change, stop at the skill's exception gate and return to a separately authorized behavior cycle rather than broadening this plan.
- [ ] Keep this ExecPlan current with exact command outcomes, design-review classifications, final diff, and validation evidence.
- [ ] Update `docs/execplans/README.md` from planned to complete only after every gate passes.
- [ ] Keep the existing campaign narrative and `g1: ERROR` result in `docs/execplans/2026-08-08-theory-first-promptfoo-foundation-e0-e2.md` unchanged except for its single pointer to this follow-up plan.
- [ ] Confirm mechanically that `AGENTS.md`, RFC 0001, ADR 0002, `docs/decisions/README.md`, and `docs/experiments/` remain unchanged for the reasons in `Documentation Impact`.

#### Validation

- [ ] Run in order: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run prettier:check`, `npm run build`, `npm run experiment:verify`, `npm run experiment:qualify:tracing`, `npm run experiment:verify:tracing`, `git diff --check`, `git status --short`.
- [ ] Expected result: the dependency install succeeds from the lockfile; typecheck, lint, Prettier, build, diff check, and offline verification pass; Vitest reports exactly 45 passing tests; local qualification emits canonical result `EXACT_SUPPORTED`; the exact tracing checkpoint passes; and status lists only the intended source, test, and documentation changes.
- [ ] Inspect the qualification and tracing configurations and output to reconfirm deterministic local-provider use, temporary isolated persistence, and loopback-only `127.0.0.1` transport. Do not infer zero egress from this checkpoint.
- [ ] Do not run `experiment:freeze`, `experiment:e1`, `experiment:e2:baseline`, `experiment:e2:deep`, or `experiment:report`; do not inspect `.skill-evidence/` campaign contents or `auth.json`.

#### Acceptance Criteria

- [ ] The final implementation satisfies both behavior contracts with 45 green tests and both public local checkpoints.
- [ ] No API, freeze schema, scientific configuration, production dependency, command, or public report contract changed; the Vitest development pin is the only direct dependency change.
- [ ] Historical campaign evidence is byte-for-byte untouched, apart from the prose document's single forward pointer.
- [ ] No freeze, campaign, live invocation, credential read, generated public experiment report, commit, or push occurred.

Post-GREEN design review on 2026-08-08: the required rubric was read in full and the changed data flow plus adjacent contracts were inspected. Classification: `No action`. The access check and fixed diagnostic are local to the live preflight; undefined normalization is local to the existing persistence boundary; neither introduces hidden state, temporal coupling, duplicate transformation, fragile mapping, or mixed policy that justifies an extraction. Moving the writability check across directory-identity resolution could change symlink and error semantics rather than provide a demonstrably neutral simplification, so it was not performed. The existing 45-test suite and offline checkpoint remain the entry-gate evidence; no code changed during review.

Final-validation exception gate on 2026-08-08: the first sandboxed `npm ci` left an incomplete `node_modules`, so the required command was repeated with authorization and restored the exact TypeScript dependency. The first ordered sequence then reached Prettier, which correctly rejected formatting in the new test; `npx prettier --write test/live-experiment-runner.test.ts` fixed it and the sequence restarted from `npm ci`. In that restarted sequence, typecheck and lint passed, but the full suite reported a five-second timeout against an existing live-runner case while recording 48 ms for that case and 505 ms for the entire run. This repeats the earlier impossible timeout signature, which had appeared against a different existing case in 9 ms before an immediate 44-test pass. Vitest has no custom timeout or fake-timer configuration, and repository search found no test clock manipulation. Per the TDD exception gate and the recorded mitigation, validation stopped instead of retrying until green or changing test infrastructure outside scope.

Final validation completed on 2026-08-09 after the authorized monotonic-timeout correction. `npm ci` installed the exact updated lockfile; it emitted only dependency deprecation warnings already outside this plan's behavior gates. `npm run typecheck`, `npm run lint`, `npm run prettier:check`, and `npm run build` passed. `npm test` used Vitest 4.1.10 and passed exactly 45 tests in 14 files. `npm run experiment:verify` passed with zero provider imports. The authorized deterministic local `npm run experiment:qualify:tracing` emitted canonical `result: "EXACT_SUPPORTED"`: both exact E2 repetitions were `SUPPORTED`, both non-persisted comparisons were `UNSUPPORTED`, and process isolation was verified. The authorized `npm run experiment:verify:tracing` bound only `127.0.0.1:4318`, ran one deterministic local case, and passed runtime, typed, and integration checks. `git diff --check` passed. `git status --short` listed only the intended ExecPlan/index/campaign-pointer documents, two source files, one behavior-test file, and the Vitest package/lockfile update; it listed no `dist/`, `.skill-evidence/`, `coverage/`, freeze, campaign, `docs/experiments/`, or credential artifact.

## Progress

- [x] Read THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full and confirmed it remains the `main` commit.
- [x] Inspected the planning baseline, relevant source and behavior tests, RFC 0001, ADR 0002, prior ExecPlans, and the ExecPlan index.
- [x] Created ExecPlan 4, indexed it, and added only the authorized follow-up pointer to the stopped campaign plan.
- [x] Milestone 1 started.
- [x] Milestone 1 completed with recorded RED and GREEN evidence.
- [x] Milestone 2 started.
- [x] Milestone 2 completed with recorded RED and GREEN evidence.
- [x] Offline checkpoint passed after both cycles.
- [x] Post-GREEN `$refactor-design` entry gate satisfied and review completed with `No action`.
- [x] Documentation reconciliation completed.
- [x] Received explicit authorization on 2026-08-09 to investigate the repeated Vitest exception gate.
- [x] Reproduced false timeouts, falsified file serialization, and directly observed ±339-second wall-clock jumps.
- [x] Milestone 3 test-runner stabilization completed with 20 standard passes and one pass during an observed +339-second wall-clock jump.
- [x] Post-stabilization design and documentation review completed with `No action`.
- [x] Final ordered validation passed with exactly 45 tests, local `EXACT_SUPPORTED`, and the exact tracing checkpoint.
- [x] Separate commit authorization received; the reviewed implementation was committed at `43cb680358ad2ee6b31c17962d5624a342d76d76`.

## Decisions

- Decision: treat the stopped E1 outcome as immutable historical evidence and this work as a new development-only instrument revision.
  Rationale: THEORY continuing-validity rules and ADR 0002 prohibit adapting or retrying the observed campaign after discovering an instrument or environment defect.
  Date/Author: 2026-08-08 / planning agent

- Decision: place writability enforcement in the live orchestration preflight and require Node `W_OK` rather than an attempted credential or sentinel-file write.
  Rationale: this proves the relevant host capability without reading or modifying login contents and can run before cost is reserved.
  Date/Author: 2026-08-08 / planning agent

- Decision: normalize `undefined` at `sanitizeForPersistence()`, not in `canonicalJson()`.
  Rationale: `undefined` is an opaque-provider interoperability concern; preserving a strict canonical serializer prevents unsupported values elsewhere from being silently accepted.
  Date/Author: 2026-08-08 / planning agent

- Decision: use JSON-compatible container semantics for `undefined`.
  Rationale: omitting object properties and converting array/root values to `null` is deterministic, preserves array position, and satisfies the declared persistence contract.
  Date/Author: 2026-08-08 / planning agent

- Decision: preserve provider-error text exactly only after the existing safety projection.
  Rationale: a benign error must survive byte-for-byte, while a path, credential, raw content, or reasoning fragment remains subject to the existing redaction boundary.
  Date/Author: 2026-08-08 / planning agent

- Decision: do not bump freeze or scientific-configuration schemas.
  Rationale: neither scientific condition nor serialized freeze contract changes; clean-worktree enforcement plus the committed repository identity naturally makes a future hardening revision incompatible with an earlier freeze.
  Date/Author: 2026-08-08 / planning agent

- Decision: reject and revert `fileParallelism: false` as a stabilization strategy.
  Rationale: although eight initial serialized probes passed, the first standard command after configuring serialization failed with the same immediate timeout. The hypothesis did not survive promotion and no unsupported configuration change remains.
  Date/Author: 2026-08-09 / implementation agent

- Decision: upgrade only Vitest from 3.2.7 to 4.1.10.
  Rationale: the pinned 3.2.7 runner uses wall-clock `Date.now()` for its post-resolution timeout check, the host was directly observed jumping approximately ±339 seconds, and the official 4.1.10 runner uses monotonic `performance.now()` for the same check. This corrects the measurement instrument rather than hiding failures with retries or larger limits.
  Date/Author: 2026-08-09 / implementation agent

## Risks and Mitigations

- Risk: the writability check happens after a side effect and still spends budget. Mitigation: behavior-test both loader count and absence of reservation/ledger files, and keep the check before workspace creation and all provider activity.
- Risk: a raw filesystem error leaks the dedicated login path. Mitigation: translate access failures to a fixed domain message and assert the supplied path is absent.
- Risk: permission-mode tests behave differently under an elevated user or non-POSIX filesystem. Mitigation: use the repository's supported Linux/Node environment, restore permissions in `finally`, and record an environment blocker rather than weakening the `W_OK` contract or mocking internal ordering.
- Risk: filtering undefined entries accidentally disables credential or reasoning redaction. Mitigation: cover undefined normalization and all existing redaction classes in the same behavior suite, then run all 45 tests.
- Risk: the provider error contains sensitive material. Mitigation: preserve a benign fixture exactly while retaining recursive path, credential, raw-content, and reasoning redaction for real summaries; never assert unconditional preservation ahead of safety projection.
- Risk: the sanitizer turns arrays into sparse or shorter arrays. Mitigation: require explicit `null` at every undefined array position and canonical round-trip assertions.
- Risk: a code change is mistaken for a scientific-condition change or an older freeze is reused. Mitigation: document the unchanged schema and configuration, rely on repository-commit drift plus clean-worktree enforcement, and prohibit all freeze and campaign commands in this cycle.
- Risk: local tracing authorization is confused with live authorization. Mitigation: inspect that both checkpoints use only deterministic local providers and `127.0.0.1`; state that filesystem/bind approval grants no provider, credential, network-egress, or campaign authority.
- Risk: post-GREEN cleanup broadens into architecture work. Mitigation: enforce `$refactor-design` entry and exception gates and accept `No action` when there is no supported structural risk.
- Risk: a full-suite run emits a non-reproducible timeout unrelated to the current behavior. Mitigation: record the anomaly, permit one immediate complete-suite diagnostic repetition, and stop if it recurs instead of hiding or weakening an existing test.
- Risk: a major Vitest update changes discovery, assertion, or worker semantics. Mitigation: keep configuration and the `npm test` interface unchanged, retain exactly 45 tests, run repeated stability probes, and execute the complete typecheck/lint/test/build/public-checkpoint sequence.
- Risk: `npm install` reported nine transitive audit findings without proving whether they are new to this change. Mitigation: do not run an unplanned `npm audit fix` or alter unrelated dependency pins; preserve the exact lockfile and leave security remediation to a separately scoped dependency review.

## Validation Strategy

Use `$tdd-behavior-autonomous-quiet` for implementation. Run exactly one observable behavior per cycle, using the existing live runner and persistence boundary rather than tests coupled to a new internal helper. In each cycle, run the entire Vitest suite once for the predicted RED and again after the minimum GREEN change. After the two cycles, run `npm run experiment:verify` as the public provider-free checkpoint.

After GREEN, run `$refactor-design` under its entry gate and rerun the relevant full suite and public checkpoint after any material structural change. Then execute the ordered final sequence in Milestone 4. The tracing qualifier must report `EXACT_SUPPORTED`, and the tracing verifier must exercise the exact E2 local persistence condition. These are qualification evidence for the pinned local instrument only; they establish neither authenticated-account continuity, Codex deep-tracing behavior, external-network absence, nor readiness to launch a campaign.

The authorized exception-gate follow-up uses repeated standard-command runs as stability evidence because a wall-clock correction is environmental rather than a deterministic application input. A temporary `/tmp` preload may observe clock drift during diagnosis, but it is never part of the repository command, committed files, or acceptance mechanism. Final validation uses only the unchanged public npm commands.

Record exact pass counts, result classifications, relevant output summaries, and any authorized loopback exception in this plan. Do not record secrets, external login paths, raw reasoning, or ignored campaign artifacts.

## Documentation Impact

`docs/execplans/2026-08-08-harden-live-preflight-and-error-projection.md` is the canonical living implementation record and receives continuous evidence updates. `docs/execplans/README.md` indexes the follow-up and later records its completed validation state. `docs/execplans/2026-08-08-theory-first-promptfoo-foundation-e0-e2.md` receives only one pointer from its immutable stopped-campaign account to this follow-up; its campaign ID, freeze, reservation, artifacts, `g1: ERROR`, limitations, and recommendation remain unchanged.

`package.json` and `package-lock.json` change only for Vitest 4.1.10 and its transitive development graph; package scripts, Node/npm engines, Promptfoo, Codex SDK, and Codex CLI remain unchanged. `vitest.config.ts` remains unchanged because scheduling was not causal. `AGENTS.md` remains unchanged because repository structure, commands, validation checkpoints, ExecPlan workflow, skill selection, commit policy, and safety boundaries remain accurate. RFC 0001, ADR 0002, and `docs/decisions/README.md` remain unchanged because no architecture, status semantics, scientific contract, budget, stopping rule, or public interface changes; this work is exactly the out-of-band instrument evolution they already require. `docs/experiments/` remains absent because this is development and local qualification, not a live campaign or public experimental result.

## Rollout and Recovery

There is no deployment, live run, or freeze in this plan. Keep implementation changes uncommitted for review. If a cycle or final checkpoint fails, retain the diagnostic evidence in this plan, revert only this plan's coherent uncommitted source/test/documentation edits if recovery is needed, and do not compensate by weakening redaction, changing scientific configuration, consuming a reservation, or retrying the terminated campaign.

After all validation is green, stop and request separate authorization to commit. Only after that future commit is clean and reviewed may an operator separately authorize a new campaign with a new ID and new freeze outside the external sandbox. That later authorization must independently cover any live invocation; neither this plan nor local filesystem/bind approval supplies it.

## Lessons Learned

- A directory identity proves replacement continuity, not operational writability; live preflight must test the capability needed by the provider before cost is recorded.
- JavaScript `undefined` is valid framework output but not JSON evidence; normalization must preserve container meaning before strict canonical serialization.
- Preserving a gate status while losing the causal provider error is an evaluator-instrument defect. Future projection must retain direct error evidence without weakening sensitive-data boundaries.
- The stopped campaign remains useful provenance for discovering these defects, but it cannot validate the corrected instrument or be reopened after the condition changes.
- The first Milestone 1 GREEN run attributed a five-second timeout to a test while recording only 9 ms of execution; the complete suite passed immediately afterward, so the anomaly is retained as non-reproduced validation context rather than treated as implementation evidence.
- The same impossible timeout signature later migrated to another existing live-runner test during restarted final validation. With no fake timers or custom timeout configuration present, repeated reruns would select a favorable stochastic infrastructure outcome rather than resolve the gate.
- Direct measurement established that the host wall clock moves approximately ±339 seconds during short processes. Vitest 3.2.7 used that non-monotonic value to double-check elapsed test time; Vitest 4.1.10 uses `performance.now()`, allowing a run to remain green while the same wall-clock jump is observed.
- Post-stabilization `$refactor-design` classification: `No action`. The dependency boundary is the smallest coherent correction, the rejected scheduling edit was fully reverted, and no source extraction or wrapper around clocks would improve the design without duplicating or bypassing the runner's corrected responsibility.
