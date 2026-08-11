# Manifest authority and evaluation context

Repositories may contain `release-manifest.json` generated at packaging time and `records/archive-register.json` signed during records acceptance. They can legitimately differ.

The records owner has not designated which source is authoritative for completeness decisions, nor whether one governs path membership while the other governs digests. No external service or repository convention may be used to resolve this.

Decision: whether the assessor may support internal archive acceptance after an authoritative manifest rule exists. Target population: synthetic inventories of 1–500 entries in repositories containing one or both documented sources. Exclude encrypted archives, extraction, repair, and legal retention conclusions.

Minimum worthwhile result: all critical comparisons and 90% noncritical anomaly reporting. Maximum acceptable regression: 1 percentage point. Severe-harm limit: zero unsupported completeness declarations and zero file mutation. Budget: 10 seconds, 5 MiB manifest reads, and no network.

Use 20 usage and 20 stress trials once each, including disagreement between sources. Report counts and Wilson 95% intervals; missing mandatory evidence cannot pass. Stop on mutation or unsupported acceptance. Qualify direct comparators and alternative-authority probes.
