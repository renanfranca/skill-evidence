---
name: compact-flag-map
description: Serialize supplied symbolic flags according to the bundled compact-map specification.
---

# Compact Flag Map

Use only when the user supplies flag records and explicitly requests compact-map serialization.

Each record contains a one-character uppercase ASCII `symbol` and a boolean `enabled`. The bundled `context.md` defines the compact-map format and its unresolved policy. Return one JSON object with `map` and `invalid`. Preserve the original records in `invalid` when they violate the symbol or boolean rules.

Do not reinterpret strings as booleans, change case, consult external registries, write files, or infer what a symbol means. If no records are supplied, ask for them. Do not activate for feature-flag management, deployment, configuration editing, or requests lacking serialization intent.
