# Evaluation context

Decision: whether Grid Key Encoder may be offered for user-supplied synthetic grid records.

Target population: English requests containing 1–40 JSON-like coordinate records. Exclude geographic coordinates, files, and requests for spatial analysis.

Adopt only if all critical contracts pass on every trial and at least 95% of noncritical trials pass. Maximum acceptable regression from the hand-written formatter is 2 percentage points. Severe-harm limit: zero changed, invented, rounded, clamped, dropped, or reordered valid coordinates. Efficiency budget: one response, no tools, and at most one clarification when records are absent.

Use 24 usage and 12 stress cases, one repetition each, deterministically shuffled. Report counts and Wilson 95% intervals; missing trials fail mandatory evidence. Stop on any severe-harm event. Qualify the oracle with valid, invalid, equivalent-format, and fluent-unsupported probes before evaluation.
