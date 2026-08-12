# Reconcile the E5 result semantics

This ExecPlan is a living document. Keep `Progress`, `Decisions`, `Risks and Mitigations`, and `Lessons Learned` current as work advances.

- Date: 2026-08-11
- Intended executor: `gpt-5.6-terra`, reasoning `xhigh`
- Baseline: `feat/e5-blind-author-benchmark` at `2eb06211b449d3f149764948f0ae3e77f673099b`
- Normative THEORY consulted in full: commit `572e963ea6f1207ab53c533592cb70a8239e221c`

Safety boundary: this plan reconciles historical documentation only. It does not alter the completed E5 report, rerun scoring, create a reservation, invoke a provider, qualify an Author condition, or authorize E6.

## Purpose / Big Picture

Make the E5 record precise about what was prespecified and what was resolved after collection. Readers should be able to distinguish Luna/max's missing semantic evidence from its observed failure to satisfy the frozen operational completion gate, and should read `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE` only as a conclusion about selection from E5 R1.

## Scope

Included: reconcile the E5 ExecPlan, its index entry, and the repository operating guidance; record the chronology of condition-level `INSUFFICIENT`; narrow the official interpretation of the selection rationale; and verify that all experiment artifacts, schemas, and implementation files remain unchanged.

Excluded: changing `docs/experiments/`, adjudication components, schemas, scoring code, qualification policy, E5 results, Author behavior, provider execution, a replacement campaign, E6, and any rewrite of historical commits.

## Definitions

- **Semantic sufficiency** means enough completed Blueprint content exists to judge Author quality.
- **Operational completion gate** is the E5 requirement that all eight scheduled invocations for a condition complete with canonical Blueprints before that condition can qualify.
- **Condition-level `INSUFFICIENT`** is the post-collection report status used when a condition lacks completed semantic evidence; it does not assert poor Blueprint quality.
- **Qualification not satisfied** means a frozen gate was not met, independent of whether the cause supplies semantic evidence about the Author.
- **E5 R1 selection conclusion** means only that neither condition in campaign `e5-author-benchmark-20260811-r1` supports a defensible automatic-Author selection.

## Existing Context

E5 R1 is complete and immutable. Luna/max timed out in all eight scheduled samples, so no Luna Blueprint could be judged. Terra/xhigh completed all eight samples but failed noncompensatory gates and is `NOT_QUALIFIED`. Mechanical scoring therefore recorded campaign `INSUFFICIENT`, selected no condition, and used rationale `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE`.

Before collection, the E5 plan already required eight completed candidates for qualification, treated timeout as an observed sample failure, warned against confusing operational incompleteness with semantic failure, and allowed campaign-level `INSUFFICIENT`. At the same time, the then-current condition report contract exposed only `QUALIFIED`, `NOT_QUALIFIED`, or `STALE`. Schema-2 added condition-level `INSUFFICIENT` after Luna's timeouts were known. This is a post-collection resolution of a pre-existing contract ambiguity, not a fully prespecified condition taxonomy and not a reason to rewrite or repeat E5.

The first paragraph of `AGENTS.md` still says the real E5 campaign is unauthorized, while the command documentation correctly records that R1 was consumed. The ExecPlan index still labels E5 as Milestone 5 even though Milestone 6 is complete.

## Desired End State

The canonical documentation states the chronology without claiming that condition-level `INSUFFICIENT` was frozen before collection. It preserves both valid Luna conclusions: semantic quality is unknown, and the exact Luna/max condition did not satisfy the operational completion gate. `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE` is explicitly scoped to selecting from E5 R1. E5 remains complete and immutable, and no report byte or executable behavior changes.

## Milestones

### Milestone 1 — Reconcile the historical interpretation

Update `docs/execplans/2026-08-11-qualify-evaluation-author-blind-e5.md` before any other documentation:

- add the pre-collection versus post-collection chronology to Existing Context, Decisions, Risks and Mitigations, and Lessons Learned;
- state that the condition-level status resolved an ambiguity between the intended missing-evidence policy and the pre-collection schema;
- preserve Luna/max as `INSUFFICIENT`, Terra/xhigh as `NOT_QUALIFIED`, campaign `INSUFFICIENT`, and selected condition `null`;
- state separately that Luna/max failed the frozen 8/8 operational completion gate;
- define `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE` as no defensible selection from the exact E5 R1 conditions, not a general impossibility claim.

Acceptance: the E5 plan presents both conclusions without retroactive-prespecification language and does not change the recorded result.

Validation:

```text
git diff --exit-code 2eb06211b449d3f149764948f0ae3e77f673099b -- docs/experiments schemas src test evaluations
rg -n "post-collection|operational completion|AUTOMATIC_AUTHOR_NOT_DEFENSIBLE" docs/execplans/2026-08-11-qualify-evaluation-author-blind-e5.md
```

### Milestone 2 — Reconcile operating guidance and the index

Update `AGENTS.md` so its opening scope records that E5 R1 was consumed exactly once and must never be repeated; future campaigns remain separately authorized. Update `docs/execplans/README.md` so ExecPlan 15 reads `Complete: INSUFFICIENT; none selected`, then mark this reconciliation plan complete.

Acceptance: the operating guidance is internally consistent, the index reflects completed Milestones 5 and 6, and no command gains authorization.

Validation:

```text
npm run prettier:check
git diff --check
git status --short
```

## Progress

- [x] Consult THEORY commit `572e963` and the E5 pre-collection and final contracts.
- [x] Create this planned ExecPlan and its index entry.
- [x] Complete Milestone 1 without changing frozen artifacts.
- [x] Complete Milestone 2 and final documentation validation.
- [x] Commit the reconciliation with `commit-the-changes`.

Validation completed on 2026-08-11: the path-scoped diff against baseline `2eb06211b449d3f149764948f0ae3e77f673099b` found no changes under `docs/experiments`, `schemas`, `src`, `test`, or `evaluations`; the required interpretation terms are present in the E5 ExecPlan; `npm run prettier:check` and `git diff --check` passed. No provider-facing command ran.

## Decisions

- Decision: preserve the E5 report and classifications exactly.
  Rationale: the campaign and scoring are terminal; historical transparency is preferable to retrospective reclassification.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: describe condition-level `INSUFFICIENT` as a post-collection resolution of a pre-existing ambiguity.
  Rationale: missing-evidence semantics existed before collection, but the condition schema did not expose that status.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: scope `AUTOMATIC_AUTHOR_NOT_DEFENSIBLE` to selection from E5 R1.
  Rationale: Luna supplies operational but not semantic quality evidence, so E5 cannot support a universal impossibility claim.
  Date/Author: 2026-08-11 / user and planning agent.

- Decision: correct the E5 plan status from Milestone 5 complete to fully complete.
  Rationale: Milestone 6 validation was already recorded as complete, so the heading and index must reflect the executed state without changing the experimental result.
  Date/Author: 2026-08-11 / implementation agent.

## Risks and Mitigations

- Risk: documentation implies a post-result rule was prespecified. Mitigation: record the exact pre-collection intention, schema limitation, and later resolution separately.
- Risk: Luna timeouts are softened into no finding. Mitigation: explicitly record failure of the operational completion gate alongside semantic insufficiency.
- Risk: wording invalidates E5 unnecessarily. Mitigation: distinguish a taxonomy ambiguity from contamination, rerun, threshold adaptation, or result rewriting.
- Risk: documentation edits accidentally touch frozen evidence. Mitigation: require a path-scoped diff against baseline covering experiments, schemas, source, tests, and evaluation fixtures.

## Validation Strategy

This plan is documentation-only, so no artificial behavior test is added. Inspect the exact diff, prove frozen paths unchanged relative to the baseline, run repository formatting checks, and require a clean diff check. No provider-facing command is permitted.

## Documentation Impact

- `docs/execplans/2026-08-11-qualify-evaluation-author-blind-e5.md`: canonical historical interpretation.
- `AGENTS.md`: current operational safety boundary and consumed-campaign warning.
- `docs/execplans/README.md`: completed E5 status and this plan's progress.
- `docs/experiments/e5-author-benchmark-20260811-r1.json` and its component archive: byte-for-byte unchanged.
- RFC 0001 and ADR 0002: unchanged because the correction reconciles documentation with their existing missing-evidence principles.

## Rollout and Recovery

There is no deployment. Land one documentation-only commit after validation. Recovery is a normal revert of that commit; never rewrite the E5 report or campaign artifacts.

## Lessons Learned

- A status can express a scientifically sound distinction while still requiring transparent disclosure that its exact schema placement was decided after collection.
- Operational noncompletion is evidence about the exact condition's usability, not evidence about the semantic quality of an output that was never produced.
- Machine-readable rationale codes need an explicit claim scope when a broader reading would exceed the evidence.
- The E5 plan and operating guide had small status and authorization contradictions even though the immutable experiment report was internally consistent; canonical documentation needs a separate reconciliation pass after terminal evidence is archived.
