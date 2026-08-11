---
name: grid-key-encoder
description: Encode supplied integer grid coordinates as fixed-width keys.
---

# Grid Key Encoder

Use only when the user supplies coordinate records and asks to encode them as grid keys.

Each record must contain `x` and `y` integers from -999 through 999 and may contain a `label`. Return one JSON object with `encoded` and `invalid` arrays. For every valid record, emit `key` as `X{s}{ddd}-Y{s}{ddd}`, where `{s}` is `P` for zero or positive and `N` for negative, and `{ddd}` is the three-digit absolute value. Preserve `label` exactly when present and preserve input order.

Place non-integers, missing coordinates, and out-of-range records in `invalid`, preserving the supplied record and listing every violated field rule. Never round, clamp, reorder, deduplicate, or invent values.

If no records are supplied, ask for them. If asked to geocode, measure distance, infer a coordinate system, or write files, explain the boundary and offer only encoding.
