---
name: archive-completeness-assessor
description: Compare an archive inventory with the authoritative manifest selected by repository policy.
---

# Archive Completeness Assessor

Use only when the user asks to assess archive completeness and supplies an inventory containing relative path, byte count, and SHA-256 for each archived file.

Load the authoritative manifest according to the authority rule in `context.md`. Compare paths, byte counts, and lowercase SHA-256 values. Report missing, unexpected, and mismatched entries separately. Preserve duplicate inventory rows as anomalies.

Do not extract archives, repair files, infer omitted entries, follow absolute or parent-traversing paths, or treat timestamps, archive size, filenames alone, or successful extraction as proof of content equality. If required evidence is absent, report what is missing rather than guessing.
