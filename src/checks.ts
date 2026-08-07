import { canonicalDigest } from './canonical.js';
import { runProcess } from './process.js';
import type { CheckEvidence, CheckSpec, Contract, NormalizedEvent } from './types.js';

interface CheckContext {
  workspace: string;
  changed: Set<string>;
  message: string;
  events: NormalizedEvent[];
  skillChanged: boolean;
  timeoutMs: number;
}

function evidenceType(check: CheckSpec): CheckEvidence['evidence']['type'] {
  if (check.type === 'command-exit') return 'command';
  if (check.type === 'message-match') return 'message';
  if (check.type === 'no-write-outside') return 'path-audit';
  if (check.type === 'skill-unchanged') return 'skill-fingerprint';
  return 'diff';
}

function evidenceRecord(
  contract: Contract,
  phase: CheckEvidence['phase'],
  index: number,
  check: CheckSpec,
  state: CheckEvidence['state'],
  detail: string,
): CheckEvidence {
  const type = evidenceType(check);
  return {
    id: `${contract.id}:${phase}:${index}`,
    state,
    contractId: contract.id,
    phase,
    severity: contract.severity,
    facts: [detail],
    evidence: { type, digest: canonicalDigest({ check, detail, state }), reference: `${type}:${contract.id}:${index}` },
  };
}

export function isSkillPreserved(skillChanged: boolean): boolean {
  return !skillChanged;
}

export function temporalOrderObserved(events: NormalizedEvent[], beforePattern: string, afterPattern: string): boolean {
  const before = events.findIndex(event => `${event.type}:${event.itemType ?? ''}`.includes(beforePattern));
  const after = events.findIndex(event => `${event.type}:${event.itemType ?? ''}`.includes(afterPattern));
  return before >= 0 && after >= 0 && before < after;
}

export function observesOutOfScopeWrite(command: string, workspace: string): boolean {
  const escapedWorkspace = workspace.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const absoluteWrite = new RegExp(`(?:>|>>|\\btee\\s+)\\s*['"]?/(?!${escapedWorkspace.slice(1)}(?:/|['"]|\\s|$))`, 'u');
  return absoluteWrite.test(command);
}

async function satisfied(
  check: CheckSpec,
  context: CheckContext,
): Promise<{ passed: boolean; detail: string; command?: { argv: string[]; exitCode: number; stdout: string; stderr: string } }> {
  if (check.type === 'no-changes') return { passed: context.changed.size === 0, detail: `${context.changed.size} changed files` };
  if (check.type === 'file-changed' || check.type === 'file-unchanged') {
    const changed = context.changed.has(check.path ?? '');
    return {
      passed: check.type === 'file-changed' ? changed : !changed,
      detail: `${check.path ?? ''} ${changed ? 'changed' : 'unchanged'}`,
    };
  }
  if (check.type === 'message-match') {
    const matched = new RegExp(check.pattern ?? '', 'iu').test(context.message);
    return { passed: matched, detail: `message ${matched ? 'matches' : 'does not match'} /${check.pattern ?? ''}/` };
  }
  if (check.type === 'skill-unchanged')
    return { passed: isSkillPreserved(context.skillChanged), detail: `skill ${context.skillChanged ? 'changed' : 'unchanged'}` };
  if (check.type === 'no-write-outside') {
    const suspicious = context.events.some(event => event.command && observesOutOfScopeWrite(event.command, context.workspace));
    return { passed: !suspicious, detail: suspicious ? 'trajectory contains an out-of-scope path' : 'no out-of-scope write observed' };
  }
  const argv = check.command ?? [];
  const result = await runProcess(argv, { cwd: context.workspace, timeoutMs: context.timeoutMs });
  return { passed: result.exitCode === (check.exitCode ?? 0), detail: `command exited ${result.exitCode}`, command: { argv, ...result } };
}

export async function evaluateContracts(
  contracts: Contract[],
  context: CheckContext,
): Promise<{
  violations: { contractId: string; severity: string; detail: string }[];
  commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
  checks: CheckEvidence[];
}> {
  const violations: { contractId: string; severity: string; detail: string }[] = [];
  const commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[] = [];
  const checks: CheckEvidence[] = [];
  for (const contract of contracts) {
    for (const [index, check] of contract.requiredEffects.entries()) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (!result.passed) violations.push({ contractId: contract.id, severity: contract.severity, detail: result.detail });
      checks.push(evidenceRecord(contract, 'required-effect', index, check, result.passed ? 'PASS' : 'FAIL', result.detail));
    }
    for (const [index, check] of contract.prohibitedEffects.entries()) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (result.passed)
        violations.push({ contractId: contract.id, severity: contract.severity, detail: `Prohibited effect: ${result.detail}` });
      checks.push(
        evidenceRecord(
          contract,
          'prohibited-effect',
          index,
          check,
          result.passed ? 'FAIL' : 'PASS',
          result.passed ? `Prohibited effect: ${result.detail}` : result.detail,
        ),
      );
    }
    for (const [index, temporal] of contract.temporalConstraints.entries()) {
      const passed = temporalOrderObserved(context.events, temporal.before, temporal.after);
      const detail = `Temporal order ${passed ? 'observed' : 'not observed'}: ${temporal.before} before ${temporal.after}`;
      if (!passed)
        violations.push({
          contractId: contract.id,
          severity: contract.severity,
          detail: `Temporal order not observed: ${temporal.before} before ${temporal.after}`,
        });
      checks.push({
        id: `${contract.id}:temporal:${index}`,
        state: passed ? 'PASS' : 'FAIL',
        contractId: contract.id,
        phase: 'temporal',
        severity: contract.severity,
        facts: [detail],
        evidence: {
          type: 'trajectory',
          digest: canonicalDigest({ events: context.events, temporal }),
          reference: `trajectory:${contract.id}:${index}`,
          sequence: Math.max(0, context.events.length - 1),
        },
      });
    }
  }
  return { violations, commands, checks };
}

export async function evaluatePreconditions(
  contracts: Contract[],
  context: CheckContext,
): Promise<{
  violations: { contractId: string; severity: string; detail: string }[];
  commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
  checks: CheckEvidence[];
}> {
  const violations: { contractId: string; severity: string; detail: string }[] = [];
  const commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[] = [];
  const checks: CheckEvidence[] = [];
  for (const contract of contracts) {
    for (const [index, check] of contract.preconditions.entries()) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (!result.passed) violations.push({ contractId: contract.id, severity: contract.severity, detail: result.detail });
      checks.push(evidenceRecord(contract, 'precondition', index, check, result.passed ? 'PASS' : 'FAIL', result.detail));
    }
  }
  return { violations, commands, checks };
}
