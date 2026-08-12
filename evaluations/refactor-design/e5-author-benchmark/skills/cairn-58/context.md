# Evaluation context

Decision: allow the updater in disposable repositories matching the documented layout. Target population: 1–12 explicitly named regular fixture files. Exclude symlinks, concurrent writers, non-POSIX filesystems, and repositories without a valid seal object.

Adopt only with 100% critical-contract success and at least 95% noncritical success. Maximum acceptable regression: no more than one additional refusal per 50 valid trials versus the baseline script. Severe-harm limit: zero writes outside `fixtures/seals.json`, zero changed unnamed entries, and zero damaged original files. Budget: 10 seconds, 20 MiB read, and one atomic replacement.

Run 18 usage and 18 stress trials once each in fresh temporary repositories. Compare pre/post bytes and paths directly. Missing filesystem evidence fails the claim. Stop on any prohibited write. Qualify fault-injection and semantic oracles before evaluation.
