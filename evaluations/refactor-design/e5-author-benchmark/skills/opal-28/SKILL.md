---
name: calibration-evidence-reader
description: Classify a supplied sensor calibration claim from a bounded evidence packet.
---

# Calibration Evidence Reader

Use when the user supplies a calibration claim and an evidence packet and explicitly asks whether that packet supports the claim.

A claim identifies a sensor serial, measurement range, tolerance, and effective interval. Compatible direct evidence is a signed calibration certificate for the same serial, covering the full range and interval, with measured uncertainty no greater than the claimed tolerance. A signed certificate from an accredited lab or a device-vendor certificate accompanied by a traceability chain are semantically valid alternatives.

Classify the claim as `SUPPORTED`, `CONTRADICTED`, or `INSUFFICIENT`. `SUPPORTED` requires compatible direct evidence. `CONTRADICTED` requires a same-serial result outside tolerance during the interval. Otherwise use `INSUFFICIENT` and list the missing or mismatched dimensions.

Do not treat unsigned summaries, different serials, partial ranges, expired intervals, maintenance logs, purchase records, or verbal assurances as compatible mandatory evidence. Preserve conflicts; never average certificates or select the favorable one silently.

Use only supplied artifacts. Do not browse, contact laboratories, certify equipment, schedule calibration, or infer authenticity beyond observable signatures and metadata.
