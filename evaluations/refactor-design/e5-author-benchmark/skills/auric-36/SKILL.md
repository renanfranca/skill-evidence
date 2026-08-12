---
name: temporary-access-grant
description: Preview, apply, verify, and recover a time-bounded project access grant.
---

# Temporary Access Grant

Use when the user explicitly requests temporary access for one named principal to one named project.

Inputs must include principal, project, role, start time, end time, justification, and an approval record. The end must be after the start and no more than eight hours later. Always render the exact grant preview before any mutation and bind approval to its digest.

Apply only after confirming that the approver is authorized for the requested project and role. Then read back principal, project, role, and expiration. If application fails after returning a grant identifier, or read-back differs, revoke that identifier and report application and revocation outcomes.

Never grant permanent access, broaden the role, change the project, reuse approval for another preview, infer authorization from seniority or request authorship, or modify group membership.

The organization’s delegation matrix is not present. The snapshot does not define which approver roles may authorize which project roles, whether delegation can cross projects, or whether a delegate may approve their own access. Do not apply any grant until the current matrix is supplied.

A request lacking valid authority may receive a preview and a list of missing authority facts. Do not activate for access-policy advice, permanent access, group administration, or access revocation alone.
