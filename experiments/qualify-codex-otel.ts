import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from './canonical.js';

const pinnedCodexCliVersion = '0.147.0' as const;
const expectedLegacyParserDiagnostic = 'invalid type: unit variant, expected struct variant';

export type CodexOtelQualificationResult = 'EXACT_SUPPORTED' | 'INSUFFICIENT' | 'BLOCKED';
export type CodexOtelParserClassification = 'ACCEPTED' | 'EXPECTED_STRUCT_VARIANT_REJECTION' | 'OTHER_REJECTION' | 'BLOCKED';

export interface CodexOtelQualificationCondition {
  configOverride: string;
  id: 'exact-nested' | 'legacy-scalar';
}

export const codexOtelQualificationConditions: Readonly<Record<CodexOtelQualificationCondition['id'], CodexOtelQualificationCondition>> =
  Object.freeze({
    'exact-nested': Object.freeze({
      configOverride: 'otel.exporter={"otlp-http"={endpoint="http://127.0.0.1:4318/v1/logs",protocol="json"}}',
      id: 'exact-nested',
    }),
    'legacy-scalar': Object.freeze({ configOverride: 'otel.exporter="otlp-http"', id: 'legacy-scalar' }),
  });

export interface CodexOtelQualificationAttempt {
  cliVersion: string;
  condition: CodexOtelQualificationCondition;
  exitStatus: 'ZERO' | 'NONZERO' | 'UNAVAILABLE';
  parserClassification: CodexOtelParserClassification;
  repetition: 1 | 2;
}

export interface CodexOtelWorkerRequest {
  condition: CodexOtelQualificationCondition;
  repetition: 1 | 2;
}

export interface CodexOtelWorkerExecution {
  attempt: CodexOtelQualificationAttempt;
  codexHomeIdentity: string;
  processId: number;
}

export type CodexOtelWorkerLauncher = (request: CodexOtelWorkerRequest) => Promise<CodexOtelWorkerExecution>;

export interface CodexOtelQualificationReport {
  cliVersion: string;
  codexHomeIsolationVerified: boolean;
  conditions: Array<{ attempts: CodexOtelQualificationAttempt[]; condition: CodexOtelQualificationCondition }>;
  limitations: string[];
  processIsolationVerified: boolean;
  purpose: 'DEVELOPMENT';
  result: CodexOtelQualificationResult;
  schemaVersion: 1;
}

function reportCondition(condition: CodexOtelQualificationCondition): CodexOtelQualificationCondition {
  return { configOverride: condition.configOverride, id: condition.id };
}

function reportAttempt(attempt: CodexOtelQualificationAttempt): CodexOtelQualificationAttempt {
  return {
    cliVersion: attempt.cliVersion,
    condition: reportCondition(attempt.condition),
    exitStatus: attempt.exitStatus,
    parserClassification: attempt.parserClassification,
    repetition: attempt.repetition,
  };
}

function blockedAttempt(request: CodexOtelWorkerRequest): CodexOtelQualificationAttempt {
  return {
    cliVersion: 'UNAVAILABLE',
    condition: reportCondition(request.condition),
    exitStatus: 'UNAVAILABLE',
    parserClassification: 'BLOCKED',
    repetition: request.repetition,
  };
}

function conditionIsKnown(condition: CodexOtelQualificationCondition): boolean {
  return canonicalJson(condition) === canonicalJson(codexOtelQualificationConditions[condition.id]);
}

function hasBothRepetitions(attempts: readonly CodexOtelQualificationAttempt[]): boolean {
  return attempts.length === 2 && new Set(attempts.map((attempt) => attempt.repetition)).size === 2;
}

function attemptIsConsistent(attempt: CodexOtelQualificationAttempt): boolean {
  if (attempt.parserClassification === 'ACCEPTED') {
    return attempt.exitStatus === 'ZERO';
  }
  if (attempt.parserClassification === 'EXPECTED_STRUCT_VARIANT_REJECTION' || attempt.parserClassification === 'OTHER_REJECTION') {
    return attempt.exitStatus === 'NONZERO';
  }
  return attempt.exitStatus === 'UNAVAILABLE';
}

function classifyAttempts(attempts: readonly CodexOtelQualificationAttempt[]): CodexOtelQualificationResult {
  const exact = attempts.filter((attempt) => attempt.condition.id === 'exact-nested');
  const legacy = attempts.filter((attempt) => attempt.condition.id === 'legacy-scalar');
  if (
    !hasBothRepetitions(exact) ||
    !hasBothRepetitions(legacy) ||
    attempts.some(
      (attempt) =>
        !conditionIsKnown(attempt.condition) ||
        attempt.cliVersion !== pinnedCodexCliVersion ||
        attempt.parserClassification === 'BLOCKED' ||
        !attemptIsConsistent(attempt),
    )
  ) {
    return 'BLOCKED';
  }
  const exactClassifications = new Set(exact.map((attempt) => attempt.parserClassification));
  const legacyClassifications = new Set(legacy.map((attempt) => attempt.parserClassification));
  if (exactClassifications.size !== 1 || legacyClassifications.size !== 1) {
    return 'BLOCKED';
  }
  if (
    exact.every((attempt) => attempt.parserClassification === 'ACCEPTED') &&
    legacy.every((attempt) => attempt.parserClassification === 'EXPECTED_STRUCT_VARIANT_REJECTION')
  ) {
    return 'EXACT_SUPPORTED';
  }
  return 'INSUFFICIENT';
}

export async function qualifyCodexOtel(launchWorker: CodexOtelWorkerLauncher): Promise<CodexOtelQualificationReport> {
  const requests: CodexOtelWorkerRequest[] = [
    { condition: codexOtelQualificationConditions['exact-nested'], repetition: 1 },
    { condition: codexOtelQualificationConditions['exact-nested'], repetition: 2 },
    { condition: codexOtelQualificationConditions['legacy-scalar'], repetition: 1 },
    { condition: codexOtelQualificationConditions['legacy-scalar'], repetition: 2 },
  ];
  const attempts: CodexOtelQualificationAttempt[] = [];
  const processIds = new Set<number>();
  const codexHomeIdentities = new Set<string>();
  for (const request of requests) {
    try {
      const execution = await launchWorker(request);
      processIds.add(execution.processId);
      codexHomeIdentities.add(execution.codexHomeIdentity);
      attempts.push(reportAttempt(execution.attempt));
    } catch {
      attempts.push(blockedAttempt(request));
    }
  }
  const processIsolationVerified = processIds.size === requests.length;
  const codexHomeIsolationVerified = codexHomeIdentities.size === requests.length;
  const evidenceResult = classifyAttempts(attempts);
  const observedVersions = new Set(attempts.map((attempt) => attempt.cliVersion));
  const cliVersion = observedVersions.size === 1 ? (attempts[0]?.cliVersion ?? 'UNAVAILABLE') : 'INCONSISTENT';
  return {
    cliVersion,
    codexHomeIsolationVerified,
    conditions: [
      {
        attempts: attempts.filter((attempt) => attempt.condition.id === 'exact-nested'),
        condition: codexOtelQualificationConditions['exact-nested'],
      },
      {
        attempts: attempts.filter((attempt) => attempt.condition.id === 'legacy-scalar'),
        condition: codexOtelQualificationConditions['legacy-scalar'],
      },
    ],
    limitations: [
      'Parsing qualification does not establish OTEL delivery.',
      'Parsing qualification does not establish authenticated identity.',
      'Parsing qualification does not establish zero egress.',
      'Parsing qualification does not establish live readiness.',
    ],
    processIsolationVerified,
    purpose: 'DEVELOPMENT',
    result: processIsolationVerified && codexHomeIsolationVerified ? evidenceResult : 'BLOCKED',
    schemaVersion: 1,
  };
}

export function renderCodexOtelQualification(report: CodexOtelQualificationReport): string {
  return canonicalJson(report) + '\n';
}

function workerEnvironment(codexHome: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { CODEX_HOME: codexHome };
  for (const key of ['LANG', 'LC_ALL', 'SystemRoot']) {
    const value = process.env[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }
  return environment;
}

async function installedCodexCliVersion(root: string): Promise<string> {
  const manifest: unknown = JSON.parse(await readFile(join(root, 'node_modules', '@openai', 'codex', 'package.json'), 'utf8'));
  if (manifest === null || typeof manifest !== 'object' || typeof (manifest as Record<string, unknown>).version !== 'string') {
    throw new Error('Codex CLI package version is unavailable');
  }
  return (manifest as { version: string }).version;
}

export async function launchCodexOtelWorker(request: CodexOtelWorkerRequest): Promise<CodexOtelWorkerExecution> {
  const root = process.cwd();
  const codexHome = await mkdtemp(join(tmpdir(), 'skill-evidence-codex-otel-'));
  try {
    const homeStat = await stat(codexHome);
    const codexHomeIdentity = createHash('sha256').update(`${codexHome}:${homeStat.dev}:${homeStat.ino}`).digest('hex');
    const cliVersion = await installedCodexCliVersion(root);
    const cliPath = resolve(root, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    return await new Promise<CodexOtelWorkerExecution>((resolveExecution, rejectExecution) => {
      const child = spawn(process.execPath, [cliPath, '--config', request.condition.configOverride, 'features', 'list'], {
        cwd: root,
        env: workerEnvironment(codexHome),
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      const processId = child.pid;
      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        if (stderr.length < 65_536) {
          stderr += chunk.slice(0, 65_536 - stderr.length);
        }
      });
      child.once('error', rejectExecution);
      child.once('close', (code, signal) => {
        if (signal !== null || processId === undefined || code === null) {
          rejectExecution(new Error('Codex OTEL qualification process did not complete'));
          return;
        }
        const accepted = code === 0;
        resolveExecution({
          attempt: {
            cliVersion,
            condition: request.condition,
            exitStatus: accepted ? 'ZERO' : 'NONZERO',
            parserClassification: accepted
              ? 'ACCEPTED'
              : stderr.includes(expectedLegacyParserDiagnostic)
                ? 'EXPECTED_STRUCT_VARIANT_REJECTION'
                : 'OTHER_REJECTION',
            repetition: request.repetition,
          },
          codexHomeIdentity,
          processId,
        });
      });
    });
  } finally {
    await rm(codexHome, { force: true, recursive: true });
  }
}

async function main(): Promise<void> {
  const report = await qualifyCodexOtel(launchCodexOtelWorker);
  process.stdout.write(renderCodexOtelQualification(report));
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
