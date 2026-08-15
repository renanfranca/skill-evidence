# ExecPlan 25 — Gate Terra/xhigh Author protocol v3 canary

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-14
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Baseline: `main` at merge commit `5d1b09f787f161c0dc5ff9860e90818e2e3fa68e`
- Branch: `feat/e22-author-protocol-v3-canary`
- Campaign: `e22-terra-xhigh-protocol-v3-canary-20260814-r1`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`
- Predecessors: completed ExecPlan 20 and consumed E20 campaign; completed ExecPlan 21 protocol-v3 mechanics; ExecPlan 24 merged as `5d1b09f`

Safety boundary: this task is authorized defensive development in this repository. Offline preparation, deterministic local processes, commits, push, draft-PR publication, hosted CI, and authenticated provider-free preflight do not authorize the E22 provider invocation. The model-backed call requires a later authorization naming the exact campaign, campaign fingerprint, 40-character commit, Terra/xhigh condition, literal one-call budget, and 600-second timeout. E5 and E18–E20 must never be repeated.

## Purpose / Big Picture

Prepare one fresh protocol-v3 canary that can determine whether Terra/xhigh produces a structurally complete and semantically usable Evaluation Blueprint in one call within ten minutes. The observable provider-free result is a frozen, fingerprinted E22 instrument whose local qualifiers traverse the exact completion, timeout, process-failure, review, resolution, and scoring paths without any external provider call; the formal preflight then returns `READY_FOR_AUTHORIZATION` for the published commit.

E22 is a viability canary, not qualification. Even a reviewed `VIABLE_CANDIDATE` result covers only this fresh skill, exact model condition, one sample, and frozen instrument. It does not establish stability, generalization, Terra qualification, or eligibility for decision runs.

## Scope

In scope:

- internal operability preparation schema 2 discriminated from historical schema 1;
- the fresh `priority-queue-snapshot-renderer` skill snapshot, Authoring Context, candidate-facing material, blind semantic oracle, reviewer probes, resolution policy, and campaign preparation;
- exact E22 protocol-3/Terra/xhigh/600-second/one-call/zero-retry campaign validation and fingerprints;
- preflight, atomic reservation, one-shot runner, terminal classification, generalized Blueprint-v3 review packets, two independent reviews, disagreement-only resolution, rejection precedence, and append-only sanitized scoring;
- twelve-process provider-free operability qualification while preserving E18–E20 behavior byte-for-byte;
- canonical documentation, conventional commit, push, draft PR, hosted CI, and exact-SHA provider-free preflight.

Out of scope:

- changing `evaluation-blueprint.schema-3.json`, `authoring-context.schema.json`, protocol v1, protocol v2, or the protocol-v3 composition policy;
- reusing an E5/E18–E20 case, oracle, output, or consumed campaign;
- a public product CLI, automatic Terra qualification, decision runs, retries, or more than one provider call;
- any provider invocation before later exact authorization;
- raw model reasoning, credentials, invalid raw responses, local reservations, or unsanitized run artifacts in Git.

## Definitions

- **Preparation schema 2:** the E22-only discriminated internal campaign contract. Historical E18–E20 files remain schema 1 and retain their existing interpretation.
- **Protocol-v3 canary:** the exact E22 condition using Author protocol 3, Evaluation Blueprint schema 3, a trusted schema-2 Authoring Context, and policy `PROTOCOL_V3_CANARY`.
- **Required absent uncertainty:** the trusted `REQUIRED_ABSENT` fact recording that the decision owner supplied no decision limit. System composition must create its blocking unresolved requirement, so complete authorship derives `BLOCKED` without disclosing that expected lifecycle to the candidate.
- **Blind review packet:** a reviewer artifact containing only the composed candidate, frozen skill snapshot, and semantic criteria. It excludes condition, model, reasoning, campaign, lifecycle, provenance, expected outcome, and reviewer identity.
- **Critical rejection precedence:** any rejected critical criterion prevents `VIABLE_CANDIDATE`; agreement or resolution cannot average it away.
- **External inconclusive failure:** rate limit, authentication, availability, provider, or other external failure that prevents model-quality observation and produces `INSUFFICIENT`.

## Existing Context

E20 ran Terra/xhigh once under protocol v2 and returned `READY` despite missing decision context, so the frozen E20 instrument concluded `TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT`. E21 introduced protocol v3 without a live campaign. Protocol v3 now gives the system authority over trusted decision context, atomic claim requirements, blocker composition, lifecycle derivation, packet-bound identity, observation/assessment separation, and reusable capabilities. The deterministic protocol-v3 qualifier covers eight local cases and zero external calls.

The existing operability subsystem in `src/qualification/author-operability.ts` accepts only exact schema-1 E18–E20 profiles and uses Author protocol 2. `src/qualification/author-viability-review.ts` and `author-viability-workflow.ts` support the earlier operability review shape and conclusions. `src/qualification/qualify-author-operability.ts` currently traverses nine local processes. Existing CLI entrypoints already cover preflight, canary, review preparation, disagreement resolution, and scoring; E22 extends those entrypoints rather than creating a product CLI.

OpenAI's official model guidance, consulted on 2026-08-14, recommends evaluating reasoning effort on representative work and not presuming the highest effort is the best tradeoff. The official Terra page listed API-equivalent text-token estimates of USD 2.00 per million input tokens, USD 0.20 per million cached input tokens, and USD 12.00 per million output tokens. E22 records those values as a dated estimate only; actual ChatGPT account cost remains `UNKNOWN`.

## Desired End State

The repository accepts historical schema-1 E18–E20 preparations exactly as before and accepts schema 2 only for the one frozen E22 profile. E22 binds the novel skill, trusted Authoring Context, protocol descriptor, candidate schema, composition policy, oracle, reviewer instrument, stopping rules, and exact model condition through deterministic fingerprints.

The runner invokes the existing Evaluation Author through protocol 3 with the frozen Authoring Context, uses one atomic reservation, never retries, and produces one canonical terminal receipt. A canonical complete `BLOCKED` Blueprint becomes `PENDING_SEMANTIC_REVIEW`; reviewer acceptance can produce only `VIABLE_CANDIDATE`. `DRAFT`, invalid JSON, or structural invalidity produces `NOT_VIABLE_FOR_AUTHOR`; inappropriate `READY` or composition/integrity failure produces `INVALIDATED`; a confirmed ten-minute timeout produces `NOT_VIABLE_FOR_AUTHOR`; external inconclusive failures produce `INSUFFICIENT`; and freeze, blindness, commit, or reservation violations produce `INVALIDATED` without retry.

Review preparation creates two identity-free packets only for eligible candidates. Both reviewers must first pass the frozen valid and invalid probes. Resolution accepts exactly the disagreements between two independent locked inputs. Scoring is create-only, gives critical rejection precedence, archives only sanitized fingerprints and judgments, and refuses overwrite.

Offline qualification traverses twelve deterministic local Promptfoo/Codex SDK processes and explicitly reports zero external calls. The draft PR contains no model-backed result. After hosted CI is green, formal preflight at the exact published SHA returns `READY_FOR_AUTHORIZATION` and the workflow stops.

## Milestones

### Milestone 1 — Freeze the E22 schema-2 instrument

Add the fresh E22 fixture beneath `evaluations/refactor-design/e5-author-operability/terra-xhigh-protocol-v3-canary-r1/`: `skill/SKILL.md`, schema-2 Authoring Context, blind oracle, reviewer probes and instructions/policy, and campaign preparation. Add behavior tests through the operability preparation boundary before extending production parsing. Accept only the exact E22 schema-2 profile and prove complete fingerprints, Authoring Context semantics, skill activation boundaries, packet blindness, and historical schema-1 preservation.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: the new profile first fails for the missing schema-2 contract, then passes with every frozen input bound; mutations fail closed; E18–E20 fixtures and interpretations remain unchanged; zero provider calls occur.

### Milestone 2 — Invoke protocol 3 once and classify every terminal path

Extend the existing preflight and canary services to pass the frozen Authoring Context to `runEvaluationAuthor` with protocol 3. Preserve clean/pushed exact-commit checks, atomic reservation, zero retry, terminal persistence, and sanitized outcomes. Add one behavior at a time for completion, confirmed timeout, process failure, external inconclusive failure, invalid JSON/structure, `DRAFT`, inappropriate `READY`, composition/integrity failure, commit drift, reservation conflict, and provider-invocation count.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts test/evaluation-author.test.ts
npm run experiment:verify
npm run experiment:qualify:author-protocol-v3
```

Acceptance: exact E22 protocol 3 receives the frozen context; one reservation permits at most one invocation; every disposition follows the prespecified matrix; no catchable failure or invalidation permits retry.

### Milestone 3 — Generalize blinded review and append-only scoring

Generalize the operability review packet to accept the composed Blueprint v3 while projecting only candidate, skill snapshot, and criteria. Require two independent locked submissions from reviewers who pass the known-valid alternative and three known-invalid probes: missing stable tie ordering, fabricated uncertainty limit, and a path that conflates direct capture with semantic assessment. Emit resolver packets only for disagreements and apply critical-rejection precedence. Persist one sanitized report with create-only semantics.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts test/evaluation-author.test.ts
npm run experiment:verify
```

Acceptance: packet inspection reveals no model, condition, campaign, lifecycle, provenance, expected result, or identities; duplicate reviewer identity, incomplete probes, extra/missing resolution, rejected critical criteria, and report overwrite all fail closed; E19/E20 historical review behavior remains exact.

### Milestone 4 — Qualify twelve local processes and consolidate design

Extend `experiment:qualify:author-operability` from nine to twelve deterministic local processes by adding E22 completion, timeout, and process-failure routes plus its review/scoring workflow without waiting ten minutes. Run the frequent checkpoint, confirm all requested behavior is GREEN, then apply `$refactor-design` only to changed campaign parsing, terminal-policy, and review responsibilities. Reconcile documentation and rerun the public checkpoints after any behavior-preserving refactor.

Validation:

```text
npx vitest run test/evaluation-author-operability.test.ts test/evaluation-author.test.ts
npm run experiment:verify
npm run experiment:qualify:author-protocol-v3
npm run experiment:qualify:author-operability
```

Acceptance: the qualifier reports twelve deterministic local processes, exact E18–E22 profiles, review mechanics qualified, and zero external provider calls; the design gate finds no pending behavior or unresolved material risk.

### Milestone 5 — Reconcile, validate, publish, and stop

Update this plan, `docs/execplans/README.md`, `AGENTS.md`, and ADR 0003. Keep schema files and historical reports unchanged. Run the complete ordered offline validation, use `$commit-the-changes`, push the specified branch, open a draft PR, and confirm hosted CI green. Then run exact-SHA authenticated preflight with `SKILL_EVIDENCE_AUTHOR_CODEX_HOME=/home/renanfranca/.codex`; do not create a reservation or invoke a provider.

Validation:

```text
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
npm run experiment:qualify:author-lifecycle
npm run experiment:qualify:author-protocol-v3
npm run experiment:qualify:author-operability
npm run experiment:qualify:author-benchmark:offline -- --bundle evaluations/refactor-design/e5-author-benchmark
npm run experiment:qualify:author-benchmark:runner
git diff --check
```

Acceptance: every offline and hosted gate is green, the published commit is clean and exact, E22 reservation/output/report are absent, preflight returns `READY_FOR_AUTHORIZATION`, and the handoff names the computed campaign fingerprint, exact SHA, Terra/xhigh, one-call budget, and 600-second timeout.

### Milestone 6 — Execute and review only after later exact authorization

After a new authorization names every frozen field, atomically reserve E22 and invoke Terra/xhigh exactly once. Never retry after reservation. If and only if the candidate is `PENDING_SEMANTIC_REVIEW`, prepare two blind packets, collect two independent qualified judgments, resolve only disagreements, and score once. Publish only the sanitized report in the draft PR and return for merge approval.

Acceptance: one reservation, at most one provider invocation, one canonical terminal receipt, optional review only for a canonical complete `BLOCKED` candidate, one append-only sanitized report, and no claim stronger than `VIABLE_CANDIDATE`.

## Progress

- [x] Consult THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c` in full.
- [x] Confirm clean synchronized `main` at predecessor merge `5d1b09f787f161c0dc5ff9860e90818e2e3fa68e` and create `feat/e22-author-protocol-v3-canary`.
- [x] Close ExecPlan 24 historically at merge `5d1b09f` and transfer the sole `Active` index status to E22.
- [x] Complete Milestone 1 schema-2 instrument RED/GREEN.
  - Exact-schema RED: the existing parser rejected every schema-2 preparation; GREEN added one discriminated E22 contract while retaining the historical schema-1 branch.
  - Completeness RED: the first schema-2 contract accepted missing reviewer-probe identity and pricing context; GREEN requires exact campaign, fingerprint, review, stopping-rule, and dated API-equivalent pricing shapes.
  - Frozen-instrument RED: the campaign fixture did not exist; GREEN added the fresh skill, trusted three-claim Authoring Context, blind oracle, four reviewer probes, instructions, resolution policy, and all derived fingerprints.
  - Focused Author suites are GREEN at 86 tests; `experiment:verify` reports provider imports 0 and typecheck is GREEN.
- [x] Complete Milestone 2 protocol-3 invocation and terminal-policy RED/GREEN.
  - The exact request carries protocol 3 and the frozen Authoring Context. Completion, `DRAFT`, invalid JSON, candidate structural invalidity, composed-integrity invalidity, confirmed timeout, external failure, late completion, inappropriate `READY`, pre-invocation context failure, commit drift, identity/blindness drift, reservation conflict, and no-retry behavior have regression coverage.
  - E22 collection artifacts use schema 2 while historical collection schema values remain 1. Composition/integrity and inappropriate `READY` produce `INVALIDATED`; only a complete canonical `BLOCKED` Blueprint within 600 seconds produces `PENDING_SEMANTIC_REVIEW`.
- [x] Complete Milestone 3 blind review and scoring RED/GREEN.
  - The Blueprint-v3 projection removes condition, campaign, lifecycle, provenance, system context, system blockers, snapshot identity, and derived claim/evidence fields before candidate exposure.
  - Two-phase preparation exposes only four blinded reviewer probes first, requires two distinct exact qualifications, then writes identical candidate packets. Existing disagreement-only resolution and critical rejection precedence remain authoritative. E22 scoring is schema 2, sanitized, create-only, and limited to `VIABLE_CANDIDATE`.
  - Review preparation now binds every accepted Blueprint to the frozen E22 snapshot, condition, packet, protocol, schemas, Authoring Context, instrument, composition policy, campaign, lifecycle, outcome, and one-invocation collection before exposure.
- [x] Complete Milestone 4 twelve-process qualifier and post-GREEN design review.
  - `experiment:qualify:author-operability` reports `SUPPORTED_FOR_DEVELOPMENT`, 12 deterministic local processes, all E18–E22 completion/timeout/process cases, all three eligible historical/E22 review workflows, and zero external provider calls.
  - `$refactor-design` extracted the E22 terminal matrix into one pure exhaustive policy and identified the missing composed-integrity classification plus cross-condition Blueprint substitution risk; both received behavior-first regressions and fail-closed fixes before the gate resumed.
  - Post-refactor evidence is GREEN: 101 focused Author tests, typecheck, `experiment:verify` with provider imports 0, the eight-case protocol-v3 qualifier, and the 12-process operability qualifier.
- [ ] Complete Milestone 5 documentation, final offline validation, commit, draft PR, hosted CI, and exact-SHA preflight.
  - Documentation is reconciled across this plan, the index, `AGENTS.md`, and ADR 0003. The prescribed local matrix is GREEN on the complete candidate tree: `npm audit` reports zero vulnerabilities; typecheck, lint, Prettier, build, and `git diff --check` pass; Vitest reports 234/234 across 19 files; every offline qualifier returns its supported development disposition; E22 operability qualification reports 12 local processes and zero external calls.
  - The draft PR, hosted-CI, and provider-free exact-SHA preflight evidence remain the publication portion of this milestone. Because recording those future exact-head observations in the candidate would change that head, their terminal evidence belongs in the draft PR handoff rather than a self-invalidating follow-up edit.
- [ ] Await separate exact authorization for Milestone 6; no E22 reservation or provider call is authorized by this plan.

## Decisions

- Decision: use a fresh skill, oracle, and campaign rather than adapt any consumed E5/E18–E20 artifact.
  Rationale: E22 must measure protocol-v3 authorship without contamination from exposed historical instruments or repeat a consumed campaign.
  Date/Author: 2026-08-14 / user.

- Decision: bind the missing decision-owner uncertainty limit as trusted `REQUIRED_ABSENT` and make all three claim requirements decision-critical.
  Rationale: protocol v3 must systemically create the blocker and derive `BLOCKED` for otherwise complete authorship; the candidate packet must not reveal the oracle or expected lifecycle.
  Date/Author: 2026-08-14 / user.

- Decision: treat E22 as a one-sample viability canary with no retries and a ten-minute ceiling.
  Rationale: the canary answers whether the exact condition can produce one reviewable artifact under a bounded cost and latency budget, not whether it is stable or generally qualified.
  Date/Author: 2026-08-14 / user.

- Decision: preserve historical schema-1 parsing and add one exact discriminated schema-2 profile.
  Rationale: new E22 fields must not reinterpret or migrate consumed E18–E20 evidence.
  Date/Author: 2026-08-14 / user.

- Decision: use two independent blind reviewers, qualification probes, disagreement-only resolution, and critical-rejection precedence.
  Rationale: semantic judgment needs calibrated independent evidence, while direct structural or integrity failures must not be repaired or averaged away by reviewers.
  Date/Author: 2026-08-14 / user and normative THEORY.

- Decision: record current official pricing only as an API-equivalent estimate and retain actual ChatGPT cost as `UNKNOWN`.
  Rationale: the Codex/ChatGPT invocation does not expose a reliable account charge, and pricing may change independently of the frozen instrument.
  Date/Author: 2026-08-14 / user.

- Decision: bind semantic-review eligibility to the frozen E22 Blueprint provenance and snapshot, not merely to a self-consistent schema-3 artifact.
  Rationale: a valid Blueprint from another condition or packet must not enter the E22 reviewer path under a copied campaign envelope.
  Date/Author: 2026-08-14 / implementation and post-GREEN design review.

- Decision: encode the E22 terminal disposition matrix as one pure policy used by the runner.
  Rationale: completion, timeout, provider failure, structural failure, composition failure, and lifecycle outcomes must remain exhaustive and cannot drift across nested orchestration branches.
  Date/Author: 2026-08-14 / post-GREEN design review.

## Risks and Mitigations

- Risk: schema 2 changes historical campaign meaning. Mitigation: discriminate on `schemaVersion`, retain exact schema-1 branch and regression fingerprints, and refuse unknown versions.
- Risk: the candidate infers the expected lifecycle or oracle. Mitigation: fingerprint the candidate-facing packet separately and exclude lifecycle, expected result, oracle, review criteria, and missing-evidence disposition from it.
- Risk: review packets leak condition or provenance through nested Blueprint fields. Mitigation: project an explicit blind candidate shape and assert forbidden-key absence recursively rather than deleting a short top-level list.
- Risk: a reviewer repairs structural invalidity or missing system composition. Mitigation: mechanical lifecycle, schema, composition, and integrity gates precede review and critical direct failures have terminal precedence.
- Risk: a timeout implementation waits ten real minutes in CI. Mitigation: use deterministic local processes with short injected timing while asserting the frozen live timeout remains exactly 600 seconds.
- Risk: a catchable error enables a second call. Mitigation: reserve before invocation, persist one terminal receipt for every outcome, require exactly one approved invocation, and reject any existing reservation or terminal artifact.
- Risk: `VIABLE_CANDIDATE` is reported as Terra qualification. Mitigation: hard-code `NOT_QUALIFIED`, `decisionEligible: false`, one-sample scope, and explicit unsupported claims in the sanitized report.
- Risk: official API prices change before collection. Mitigation: fingerprint the dated preparation estimate as contextual metadata without treating it as actual ChatGPT cost or a decision gate.
- Risk: preparation discovers a material protocol-v3/schema defect. Mitigation: stop before reservation; correct it under a different ExecPlan and fresh campaign/fingerprint rather than weakening E22.

## Validation Strategy

Use `$tdd-behavior-autonomous-quiet` through the existing public operability and Author boundaries, one observable behavior per cycle. Run the full focused Author suites every cycle and `experiment:verify` at least every two cycles. Run protocol-v3 and operability qualifiers at milestone checkpoints. After every planned behavior and public path are GREEN, use `$refactor-design` before documentation reconciliation and the complete ordered validation list from Milestone 5.

Every command before later exact authorization must be provider-free. The deterministic operability qualifier may launch twelve local Promptfoo/Codex SDK processes, but it must make zero external calls. Formal preflight may inspect authenticated Codex state but must create no reservation and invoke no provider.

## Documentation Impact

- This ExecPlan and `docs/execplans/README.md`: canonical scope, status, decisions, validation evidence, and authorization handoff.
- ExecPlan 24: terminal merge evidence only; its historical approved contract and review record remain unchanged.
- `AGENTS.md`: exact E22 offline qualifier count, schema-2 profile, preflight/live/review commands, authorization wording, and permanent no-repeat warning after any reservation.
- ADR 0003: records that E22 is the first planned model-backed protocol-v3 canary and preserves the protocol/schema boundary; it does not change the accepted protocol semantics.
- `.github/workflows/ci.yml`: unchanged unless the existing command list requires textual reconciliation; its current operability qualifier automatically receives the expanded local corpus and remains secret-free.
- `package.json`: command names remain unchanged because E22 extends internal commands.
- `evaluation-blueprint.schema-3.json`, `authoring-context.schema.json`, protocol-v1/v2 code and schemas: unchanged by contract; any needed semantic change stops E22.
- E5/E18/E19/E20 fixtures, reports, plans, reservations, and outputs: immutable historical evidence.

## Rollout and Recovery

There is no deployment. Before reservation, the branch can be reverted normally and a material protocol/schema defect stops E22. After a reservation exists, preserve it and the terminal receipt permanently; no outcome authorizes a retry. A provider or infrastructure failure becomes `INSUFFICIENT` and any future attempt requires a separately planned campaign with a new identity and authorization.

Draft PR publication is reversible and does not authorize the model call. Merge remains a separate user decision after any eligible semantic review and sanitized result publication.

## Lessons Learned

- The official Terra page and model-guidance page must be captured as dated preparation inputs because pricing and recommended effort tradeoffs are contextual rather than stable protocol facts.
- Protocol-v3 live evaluation needs a new instrument because mechanical qualification and historical protocol-v2 canaries cannot establish model interpretation of trusted claims and system-owned blockers.
- A discriminated preparation union must narrow historical test builders explicitly; spreading the broader union made schema-1 fixtures appear capable of carrying protocol-3 fields even though runtime behavior remained correct.
- A composed Blueprint can be internally valid yet belong to a different frozen condition. Review eligibility therefore needs both composed validation and equality against the E22 campaign fingerprints.
- Keeping the E22 terminal matrix in one pure policy exposed the previously unclassified `COMPOSED_BLUEPRINT_INVALID` path and made its `INVALIDATED` disposition explicit.
- The first complete final matrix stopped at lint because runtime-safe `unknown` validators still exposed `any` to typed ESLint and projection destructuring used names only for omission. Explicit `unknown` callback parameters and key-filter projections preserved behavior and made the restarted matrix fully GREEN.
