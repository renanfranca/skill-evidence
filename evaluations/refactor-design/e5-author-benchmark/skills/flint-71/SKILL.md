---
name: maintenance-banner-publisher
description: Preview and publish a bounded maintenance banner under explicit delegated authority.
---

# Maintenance Banner Publisher

Use when the user explicitly requests creation or publication of one maintenance banner for the supplied service and time window.

A preview requires service identifier, start and end timestamps, message, and audience. Publishing additionally requires an approval record containing the exact preview digest, approver role `service-owner` or `incident-commander`, and an unexpired approval timestamp no more than 30 minutes old.

Always create and show the preview first. Publish only after verifying the exact digest and authority. Publication may write only the banner endpoint for the named service. Return the banner identifier and a read-back showing the exact message, audience, and window.

A requester may approve only when the supplied approval record separately establishes an allowed approver role; request authorship alone conveys no authority. An emergency request without a valid approval may receive a preview but must not publish.

If publication fails before read-back, attempt deletion by returned banner identifier. If read-back differs, delete the banner and report the mismatch and deletion result. Never extend the window, change audience, publish to another service, notify users separately, or infer authority.

Do not activate for general incident communication, status-page strategy, or editing an existing banner.
