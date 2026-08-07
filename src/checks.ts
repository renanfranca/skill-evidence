import { runProcess } from './process.js';
import type { CheckSpec, Contract, NormalizedEvent } from './types.js';

interface CheckContext {
  workspace: string;
  changed: Set<string>;
  message: string;
  events: NormalizedEvent[];
  skillChanged: boolean;
  timeoutMs: number;
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
}> {
  const violations: { contractId: string; severity: string; detail: string }[] = [];
  const commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[] = [];
  for (const contract of contracts) {
    for (const check of contract.requiredEffects) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (!result.passed) violations.push({ contractId: contract.id, severity: contract.severity, detail: result.detail });
    }
    for (const check of contract.prohibitedEffects) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (result.passed)
        violations.push({ contractId: contract.id, severity: contract.severity, detail: `Prohibited effect: ${result.detail}` });
    }
    for (const temporal of contract.temporalConstraints) {
      if (!temporalOrderObserved(context.events, temporal.before, temporal.after))
        violations.push({
          contractId: contract.id,
          severity: contract.severity,
          detail: `Temporal order not observed: ${temporal.before} before ${temporal.after}`,
        });
    }
  }
  return { violations, commands };
}

export async function evaluatePreconditions(
  contracts: Contract[],
  context: CheckContext,
): Promise<{
  violations: { contractId: string; severity: string; detail: string }[];
  commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
}> {
  const violations: { contractId: string; severity: string; detail: string }[] = [];
  const commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[] = [];
  for (const contract of contracts) {
    for (const check of contract.preconditions) {
      const result = await satisfied(check, context);
      if (result.command) commands.push(result.command);
      if (!result.passed) violations.push({ contractId: contract.id, severity: contract.severity, detail: result.detail });
    }
  }
  return { violations, commands };
}
