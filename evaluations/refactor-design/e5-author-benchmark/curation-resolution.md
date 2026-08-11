# E5 blind benchmark curation resolution

Date: 2026-08-11

This resolution was completed before any Author output existed. Curators A and B worked independently from the E5 design, THEORY commit `572e963ea6f1207ab53c533592cb70a8239e221c`, RFC 0001, and ADR 0002. The resolver compared their complete proposals by observable support, decision completeness, genuine unavailability, valid semantic alternatives, and direct evidence compatibility. No E3, E4, V1 case, oracle, expected answer, or model output was used.

## Resolved set

| Stratum                              | Opaque case ID | Reference lifecycle | Source    |
| ------------------------------------ | -------------- | ------------------- | --------- |
| bounded deterministic transformation | `nacre-71`     | `READY`             | Curator A |
| bounded deterministic transformation | `velum-24`     | `BLOCKED`           | Curator A |
| repository or filesystem mutation    | `cairn-58`     | `READY`             | Curator A |
| repository or filesystem mutation    | `umber-83`     | `BLOCKED`           | Curator B |
| evidence-based analysis              | `opal-28`      | `READY`             | Curator B |
| evidence-based analysis              | `quartz-05`    | `BLOCKED`           | Curator A |
| authority-sensitive workflow         | `flint-71`     | `READY`             | Curator B |
| authority-sensitive workflow         | `auric-36`     | `BLOCKED`           | Curator B |

The selected IDs are opaque with respect to stratum and expected lifecycle. Each pair contains one complete decision context and one genuinely unavailable decision-critical requirement. No reference targets `DRAFT`.

## Adjudicated divergences

- For deterministic transformation, A's fixed-width grid encoder was selected over B's coordinate-envelope formatter because the exact encoding relation, preserved invalid records, and stable order produce stronger direct mechanical evidence without introducing external interpretation. A's compact flag map was selected over B's heading-key maker because all noncollision behavior is fully specified while the single collision-policy omission has three explicit, equally plausible alternatives.
- For filesystem mutation, A's fixture-seal updater was selected over B's marker-block updater because digest recomputation, path-write observation, byte preservation, and phase fault injection distinguish final-state correctness from atomicity and recovery. B's transcript renamer was selected over A's alias registrar because its unavailable journal retention and exposure policy is an independently decision-critical privacy constraint, while its forward mutation and reverse recovery remain directly observable.
- For evidence analysis, B's calibration reader was selected over A's cold-chain assessor because it tests two explicitly valid evidence paths, conflict preservation, and incompatible-evidence rejection rather than primarily deterministic numeric comparison. A's archive assessor was selected over B's retention-control assessor because the competing packaging and signed-records manifests make both the missing authority and the prohibited silent choice concrete and directly testable.
- For authority-sensitive workflow, B's maintenance banner publisher was selected over A's bulletin publisher because authority is established by a preview-bound, fresh role record rather than a magic token supplied by the requester. B's temporary access grant was selected over A's suspension workflow because the missing delegation matrix directly controls project-role, cross-project, and self-approval authority while preview, application, read-back, and compensating revocation remain observable.

## Normalization decisions

- Supporting specifications and evaluation charters were consolidated into each skill's authorized `context.md`; no hidden reference file is needed by the Author packet.
- Reference items use only the current `AtomicReferenceItem` categories. Positive, negative, and near-boundary semantics remain explicit in their statements even though the current type represents all three as `ACTIVATION_BOUNDARY`.
- Compatible and incompatible evidence are separate atomic `EVIDENCE` items when both are decision-critical. Accepted alternatives express semantic equivalence and never prescribe incidental wording or implementation.
- `READY` cases contain complete population, decision, thresholds, severe-harm limits, budgets, sampling, uncertainty, and evidence expectations. Their references contain no blocker item because inventing a blocker would be incorrect.
- `BLOCKED` cases retain all behavior that is supportable and add one critical `BLOCKER` item for the fact that the snapshot expressly leaves unavailable. The reference never chooses a placeholder policy or treats an evaluator preference as authority.

This resolution selects reference material only. It does not create the campaign bundle, reviewer probes, schedule, fingerprints, results, reservations, or provider calls.
