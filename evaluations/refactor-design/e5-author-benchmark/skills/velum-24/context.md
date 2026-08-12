# Compact-map specification and evaluation context

Sort distinct symbols in ASCII order. Encode each as the symbol followed by `1` when enabled and `0` when disabled, joining entries with commas.

The standards owner has not selected the required behavior for repeated symbols. Rejection, first-record-wins, and last-record-wins remain competing proposals. No repository document or external authority may be used to choose among them.

Decision: whether Compact Flag Map may replace the current manual serializer for English requests containing 1–30 supplied records. Exclude real deployment operations and external configuration.

Minimum worthwhile result: every critical serialization contract and 90% of noncritical trials. Maximum acceptable regression: 1 percentage point. Severe-harm limit: zero invented symbols, boolean coercions, or silent duplicate loss. Efficiency budget: one response and no tools.

Use 20 usage and 16 stress cases, including duplicate symbols, one repetition, fixed randomization, count reporting, and Wilson 95% intervals. Missing mandatory evidence fails its claim; stop on severe harm. Oracle qualification must cover valid, invalid, alternative-valid, and unsupported-fluency probes.
