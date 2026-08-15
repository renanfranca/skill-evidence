---
name: supervise-skill-evidence
description: Supervise an ongoing skill-evidence delivery increment from orientation and ExecPlan approval through delegated implementation, validation, independent review, draft pull request publication, and merge approval. Use only when the user explicitly invokes this skill or resumes a Goal that explicitly names it and wants one durable control-plane task instead of manually transferring status, plan paths, implementation prompts, or review prompts between chats.
---

# Supervise Skill Evidence

Run the repository delivery loop autonomously between the user's plan, critical-risk, and merge decisions. Keep one visible task as the supervisor and delegate bounded implementation and review work to fresh subagents.

## Start or Resume

1. Read [references/supervisor-contract.json](references/supervisor-contract.json) and [references/supervisor-policy.md](references/supervisor-policy.md) completely before taking workflow action. The JSON contract is the machine-readable authority, state, review, identity, campaign, and merge-binding contract; the policy explains how to operate it. If the sources conflict, apply the contract deny rule and stop before the disputed action.
2. Pin this one supervisor task before any workflow action on first explicit activation. On continuation, if it is unpinned, re-enter `ORIENT` and pin it before continuing. Pinning is ordinary authority and is not another user gate.
3. Read the applicable repository instructions and reconstruct the current state from the evidence sources named in the policy. Do this even when the conversation appears complete.
4. If this is the explicit first activation and no unfinished Goal exists, create one with this durable objective:

   `Continuously supervise skill-evidence delivery through $supervise-skill-evidence: reconstruct state from repository truth, obtain explicit approval for each ExecPlan, delegate implementation and independent review, remediate material findings, publish only draft pull requests automatically, obtain explicit approval for critical or paid actions and merge, then orient to the next increment.`

5. If an unfinished Goal already carries that objective, resume it. Do not replace it or mark it complete after one delivery increment; complete it only when the user explicitly ends supervision.

An explicit invocation authorizes creation or resumption of this Goal and ordinary workflow actions within the policy. It does not approve an ExecPlan, a risk action, or a merge.

## Operate

- Begin or resume at `ORIENT`. Infer the state from durable evidence rather than from the last chat message.
- Continue automatically while an exit predicate is satisfied. Stop only at `WAIT_PLAN_APPROVAL`, `WAIT_RISK_APPROVAL`, `WAIT_MERGE_APPROVAL`, or a concrete external blocker that makes safe progress impossible.
- Treat the approved ExecPlan as the handoff contract. Give implementation subagents the plan and raw repository sources, not the supervisor's implicit reasoning.
- Use the repository's required implementation, TDD, review, worktree, commit, and GitHub skills when their trigger conditions apply. Never weaken a repository instruction through this skill.
- Require exactly one `Active` status cell in `docs/execplans/README.md`. Keep inactive plans terminal and route their current-delivery handoff through that index.
- Classify the current identities against a validated prior coverage receipt. Reuse complete unchanged coverage. For a composable operational-text delta, run only deterministic mechanical checks: reproduce the identities, prove the material identity is unchanged, enforce the operational allowlist and section cardinality, validate UTF-8/LF, and run applicable formatting, link, path, and diff checks. Never dispatch a reviewer, consolidator, model, or semantic/scientific adjudication for operational text. Send only material deltas through the full review selected by their surfaces. Invalid or incompatible receipts fail closed to full material review.
- Bind publication and merge to both current identities and the complete coverage receipt. Never dispatch a third reinforced round without `WAIT_RISK_APPROVAL`; its approval covers exactly one round at the bound base, plan revision, and material identity.
- Keep the ExecPlan's Progress, Decisions, Risks, and Lessons Learned current so compaction and fresh agents remain safe.
- After each delegated result, validation run, review, publication action, approval, or external-state change, re-enter `ORIENT` briefly and verify the evidence before selecting the next state.

## Communicate

At an approval gate, emit only the matching decision card from the policy plus any essential blocker detail. Make the requested choice obvious without requiring a magic phrase, command, or copied path.

During autonomous work, keep updates compact and evidence-based. Do not narrate repeated polling or ask non-blocking questions. At an operational blocker, state the failed condition, preserved state, and exact resume condition.

When handing off a completed increment, report the delivered behavior, branch and draft PR, validation evidence, review topology and finding disposition, residual risk, and the pending merge decision. Do not claim reliability, qualification, or generalization beyond the collected evidence.
