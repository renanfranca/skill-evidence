import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { canonicalJson } from './canonical.js';

export type ArchaeologicalDisposition = 'BLOCKED' | 'FAIL' | 'INCONCLUSIVE' | 'PASS';
export type ArchaeologicalOwner =
  | 'PROMPTFOO_ASSERTION'
  | 'PROMPTFOO_GRADER'
  | 'PROMPTFOO_SCORING'
  | 'SKILL_EVIDENCE_INPUT_PROJECTION'
  | 'SKILL_EVIDENCE_NORMALIZATION'
  | 'SKILL_EVIDENCE_PREFLIGHT';

export interface ArchaeologicalObservationResult {
  actual: ArchaeologicalDisposition;
  expected: ArchaeologicalDisposition;
  id: string;
}

export interface ArchaeologicalRuleResult {
  id: `R${1 | 2 | 3 | 4 | 5 | 6}`;
  observations: ArchaeologicalObservationResult[];
  owner: ArchaeologicalOwner | ArchaeologicalOwner[];
}

export interface ArchaeologicalWorkerEvidence {
  executionProviderCalls: number;
  graderCalls: number;
  promptfooVersion: string;
  rules: ArchaeologicalRuleResult[];
}

export interface ArchaeologicalQualificationReport extends ArchaeologicalWorkerEvidence {
  limitations: string[];
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_WITH_THIN_CONTROL_PLANE';
  schemaVersion: 1;
}

export type ArchaeologicalWorkerLauncher = () => Promise<ArchaeologicalWorkerEvidence>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const expectedRuleOwners: ReadonlyArray<{ id: ArchaeologicalRuleResult['id']; owner: ArchaeologicalRuleResult['owner'] }> = [
  { id: 'R1', owner: 'PROMPTFOO_ASSERTION' },
  { id: 'R2', owner: ['SKILL_EVIDENCE_PREFLIGHT', 'SKILL_EVIDENCE_NORMALIZATION'] },
  { id: 'R3', owner: 'PROMPTFOO_GRADER' },
  { id: 'R4', owner: 'SKILL_EVIDENCE_INPUT_PROJECTION' },
  { id: 'R5', owner: ['SKILL_EVIDENCE_PREFLIGHT', 'SKILL_EVIDENCE_NORMALIZATION'] },
  { id: 'R6', owner: 'PROMPTFOO_SCORING' },
];

function ownerMatches(actual: ArchaeologicalRuleResult['owner'], expected: ArchaeologicalRuleResult['owner']): boolean {
  if (typeof actual === 'string' || typeof expected === 'string') {
    return actual === expected;
  }
  return actual.length === expected.length && actual.every((owner, index) => owner === expected[index]);
}

function evidenceIsWellFormed(evidence: ArchaeologicalWorkerEvidence): boolean {
  return (
    evidence.promptfooVersion === '0.122.0' &&
    evidence.executionProviderCalls === 10 &&
    evidence.graderCalls === 3 &&
    evidence.rules.length === expectedRuleOwners.length &&
    evidence.rules.every((rule, index) => {
      const expectedRule = expectedRuleOwners[index];
      const observationIds = rule.observations.map((observation) => observation.id);
      return (
        expectedRule !== undefined &&
        rule.id === expectedRule.id &&
        ownerMatches(rule.owner, expectedRule.owner) &&
        rule.observations.length >= 2 &&
        new Set(observationIds).size === observationIds.length &&
        rule.observations.every(
          (observation) =>
            observation.id.length > 0 &&
            ['BLOCKED', 'FAIL', 'INCONCLUSIVE', 'PASS'].includes(observation.actual) &&
            ['BLOCKED', 'FAIL', 'INCONCLUSIVE', 'PASS'].includes(observation.expected),
        )
      );
    })
  );
}

function evidenceMatchesExpectations(evidence: ArchaeologicalWorkerEvidence): boolean {
  return evidence.rules.every((rule) => rule.observations.every((observation) => observation.actual === observation.expected));
}

function blockedEvidence(): ArchaeologicalWorkerEvidence {
  return { executionProviderCalls: 0, graderCalls: 0, promptfooVersion: 'UNAVAILABLE', rules: [] };
}

export async function qualifyArchaeologicalRegressions(
  launchWorker: ArchaeologicalWorkerLauncher,
): Promise<ArchaeologicalQualificationReport> {
  let evidence: ArchaeologicalWorkerEvidence;
  try {
    evidence = await launchWorker();
  } catch {
    evidence = blockedEvidence();
  }
  if (!isWorkerEvidence(evidence)) {
    evidence = blockedEvidence();
  }
  const wellFormed = evidenceIsWellFormed(evidence);
  return {
    executionProviderCalls: evidence.executionProviderCalls,
    graderCalls: evidence.graderCalls,
    limitations: [
      'Development conformance does not evaluate a skill or authorize decision evidence.',
      'Deterministic local providers do not establish model-backed Judge validity or independence.',
      'The thin control plane is limited to capability preflight, blind input projection, and structured status normalization.',
    ],
    promptfooVersion: evidence.promptfooVersion,
    purpose: 'DEVELOPMENT',
    result: !wellFormed ? 'BLOCKED' : evidenceMatchesExpectations(evidence) ? 'SUPPORTED_WITH_THIN_CONTROL_PLANE' : 'INSUFFICIENT',
    rules: evidence.rules,
    schemaVersion: 1,
  };
}

function minimalWorkerEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of ['LANG', 'LC_ALL', 'PATH', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR']) {
    const value = process.env[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }
  return environment;
}

function isWorkerEvidence(value: unknown): value is ArchaeologicalWorkerEvidence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.executionProviderCalls === 'number' &&
    typeof value.graderCalls === 'number' &&
    typeof value.promptfooVersion === 'string' &&
    Array.isArray(value.rules) &&
    value.rules.every(
      (rule) =>
        isRecord(rule) &&
        typeof rule.id === 'string' &&
        (typeof rule.owner === 'string' || (Array.isArray(rule.owner) && rule.owner.every((owner) => typeof owner === 'string'))) &&
        Array.isArray(rule.observations) &&
        rule.observations.every(
          (observation) =>
            isRecord(observation) &&
            typeof observation.actual === 'string' &&
            typeof observation.expected === 'string' &&
            typeof observation.id === 'string',
        ),
    )
  );
}

export async function launchArchaeologicalWorker(): Promise<ArchaeologicalWorkerEvidence> {
  const workerPath = fileURLToPath(new URL('./qualify-archaeological-worker.js', import.meta.url));
  return await new Promise<ArchaeologicalWorkerEvidence>((resolve, reject) => {
    const child = fork(workerPath, [], {
      cwd: process.cwd(),
      env: minimalWorkerEnvironment(),
      execPath: process.execPath,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    let evidence: ArchaeologicalWorkerEvidence | undefined;
    child.on('message', (message: unknown) => {
      if (isWorkerEvidence(message)) {
        evidence = message;
      }
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code !== 0 || signal !== null || evidence === undefined) {
        reject(new Error('archaeological qualification worker did not complete'));
        return;
      }
      resolve(evidence);
    });
  });
}

export function renderArchaeologicalQualification(report: ArchaeologicalQualificationReport): string {
  return canonicalJson(report) + '\n';
}

async function main(): Promise<void> {
  const report = await qualifyArchaeologicalRegressions(launchArchaeologicalWorker);
  process.stdout.write(renderArchaeologicalQualification(report));
  process.exitCode = report.result === 'SUPPORTED_WITH_THIN_CONTROL_PLANE' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
