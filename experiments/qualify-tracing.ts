import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { canonicalJson } from './canonical.js';
import { createE2PromptfooRuntimeCondition } from './configuration.js';

export type TracingAttemptStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'BLOCKED';

export type TracingQualificationResult = 'EXACT_SUPPORTED' | 'ALTERNATIVE_SUPPORTED' | 'INSUFFICIENT' | 'BLOCKED';

export interface TracingQualificationCondition {
  cache: false;
  exact: boolean;
  id: 'e2-exact' | 'non-persisted-comparison';
  sharing: false;
  temporaryDatabase: true;
  telemetryDisabled: true;
  updatesDisabled: true;
  writeLatestResults: boolean;
}

const e2RuntimeCondition = createE2PromptfooRuntimeCondition();

export const tracingQualificationConditions: Readonly<Record<TracingQualificationCondition['id'], TracingQualificationCondition>> =
  Object.freeze({
    'e2-exact': Object.freeze({
      cache: e2RuntimeCondition.cache,
      exact: true,
      id: 'e2-exact',
      sharing: e2RuntimeCondition.sharing,
      temporaryDatabase: true,
      telemetryDisabled: true,
      updatesDisabled: true,
      writeLatestResults: e2RuntimeCondition.writeLatestResults,
    }),
    'non-persisted-comparison': Object.freeze({
      cache: false,
      exact: false,
      id: 'non-persisted-comparison',
      sharing: false,
      temporaryDatabase: true,
      telemetryDisabled: true,
      updatesDisabled: true,
      writeLatestResults: false,
    }),
  });

export interface TracingQualificationAttempt {
  condition: TracingQualificationCondition;
  correlatedSpanRecovered: boolean;
  promptfooVersion: string;
  providerCompleted: boolean;
  receiverAcceptedSpan: boolean;
  repetition: 1 | 2;
  runtimeGetTracesPresent: boolean;
  status: TracingAttemptStatus;
  summaryAvailable: boolean;
  typedGetTracesPresent: boolean;
}

export interface TracingWorkerRequest {
  condition: TracingQualificationCondition;
  repetition: 1 | 2;
}

export interface TracingWorkerExecution {
  attempt: TracingQualificationAttempt;
  processId: number;
}

export type TracingWorkerLauncher = (request: TracingWorkerRequest) => Promise<TracingWorkerExecution>;

export interface TracingQualificationReport {
  conditions: Array<{
    attempts: TracingQualificationAttempt[];
    condition: TracingQualificationCondition;
  }>;
  documentationFacts: {
    getTracesStableReferenceEstablishedForPinnedVersion: false;
    writeLatestResultsCurrentlyDocumentedAsPersistence: true;
  };
  limitations: string[];
  processIsolationVerified: boolean;
  promptfooVersion: '0.122.0';
  purpose: 'DEVELOPMENT';
  result: TracingQualificationResult;
  schemaVersion: 2;
}

function reportCondition(condition: TracingQualificationCondition): TracingQualificationCondition {
  return {
    cache: condition.cache,
    exact: condition.exact,
    id: condition.id,
    sharing: condition.sharing,
    temporaryDatabase: condition.temporaryDatabase,
    telemetryDisabled: condition.telemetryDisabled,
    updatesDisabled: condition.updatesDisabled,
    writeLatestResults: condition.writeLatestResults,
  };
}

function conditionIsKnown(condition: TracingQualificationCondition): boolean {
  return canonicalJson(condition) === canonicalJson(tracingQualificationConditions[condition.id]);
}

function attemptsFor(attempts: readonly TracingQualificationAttempt[], exact: boolean): TracingQualificationAttempt[] {
  return attempts.filter((attempt) => attempt.condition.exact === exact);
}

function hasBothRepetitions(attempts: readonly TracingQualificationAttempt[]): boolean {
  const repetitions = attempts.map((attempt) => attempt.repetition);
  return repetitions.length === 2 && new Set(repetitions).size === 2;
}

function both(statuses: readonly TracingAttemptStatus[], expected: TracingAttemptStatus): boolean {
  return statuses.length === 2 && statuses.every((status) => status === expected);
}

function attemptIsConsistent(attempt: TracingQualificationAttempt): boolean {
  if (attempt.status === 'BLOCKED') {
    return true;
  }
  if (attempt.status === 'UNSUPPORTED') {
    return !attempt.correlatedSpanRecovered;
  }
  return (
    attempt.correlatedSpanRecovered &&
    attempt.providerCompleted &&
    attempt.receiverAcceptedSpan &&
    attempt.runtimeGetTracesPresent &&
    attempt.summaryAvailable &&
    attempt.typedGetTracesPresent
  );
}

export function classifyTracingAttempts(attempts: readonly TracingQualificationAttempt[]): TracingQualificationResult {
  const exactAttempts = attemptsFor(attempts, true);
  const alternativeAttempts = attemptsFor(attempts, false);
  const exact = exactAttempts.map((attempt) => attempt.status);
  const alternative = alternativeAttempts.map((attempt) => attempt.status);
  if (
    exact.length !== 2 ||
    alternative.length !== 2 ||
    !hasBothRepetitions(exactAttempts) ||
    !hasBothRepetitions(alternativeAttempts) ||
    attempts.some((attempt) => attempt.status === 'BLOCKED' || !conditionIsKnown(attempt.condition) || !attemptIsConsistent(attempt))
  ) {
    return 'BLOCKED';
  }
  if (both(exact, 'SUPPORTED')) {
    return 'EXACT_SUPPORTED';
  }
  if (both(exact, 'UNSUPPORTED') && both(alternative, 'SUPPORTED')) {
    return 'ALTERNATIVE_SUPPORTED';
  }
  if (both(exact, 'UNSUPPORTED') && both(alternative, 'UNSUPPORTED')) {
    return 'INSUFFICIENT';
  }
  return 'BLOCKED';
}

function reportAttempt(attempt: TracingQualificationAttempt): TracingQualificationAttempt {
  return {
    condition: reportCondition(attempt.condition),
    correlatedSpanRecovered: attempt.correlatedSpanRecovered,
    promptfooVersion: attempt.promptfooVersion,
    providerCompleted: attempt.providerCompleted,
    receiverAcceptedSpan: attempt.receiverAcceptedSpan,
    repetition: attempt.repetition,
    runtimeGetTracesPresent: attempt.runtimeGetTracesPresent,
    status: attempt.status,
    summaryAvailable: attempt.summaryAvailable,
    typedGetTracesPresent: attempt.typedGetTracesPresent,
  };
}

function blockedAttempt(request: TracingWorkerRequest): TracingQualificationAttempt {
  return {
    condition: reportCondition(request.condition),
    correlatedSpanRecovered: false,
    promptfooVersion: '0.122.0',
    providerCompleted: false,
    receiverAcceptedSpan: false,
    repetition: request.repetition,
    runtimeGetTracesPresent: false,
    status: 'BLOCKED',
    summaryAvailable: false,
    typedGetTracesPresent: false,
  };
}

export async function qualifyPromptfooTracing(launchWorker: TracingWorkerLauncher): Promise<TracingQualificationReport> {
  const requests: TracingWorkerRequest[] = [
    { condition: tracingQualificationConditions['e2-exact'], repetition: 1 },
    { condition: tracingQualificationConditions['e2-exact'], repetition: 2 },
    { condition: tracingQualificationConditions['non-persisted-comparison'], repetition: 1 },
    { condition: tracingQualificationConditions['non-persisted-comparison'], repetition: 2 },
  ];
  const attempts: TracingQualificationAttempt[] = [];
  const processIds = new Set<number>();
  for (const request of requests) {
    try {
      const execution = await launchWorker(request);
      processIds.add(execution.processId);
      attempts.push(reportAttempt(execution.attempt));
    } catch {
      attempts.push(blockedAttempt(request));
    }
  }
  const processIsolationVerified = processIds.size === requests.length;
  return {
    conditions: [
      { attempts: attempts.filter((attempt) => attempt.condition.exact), condition: tracingQualificationConditions['e2-exact'] },
      {
        attempts: attempts.filter((attempt) => !attempt.condition.exact),
        condition: tracingQualificationConditions['non-persisted-comparison'],
      },
    ],
    documentationFacts: {
      getTracesStableReferenceEstablishedForPinnedVersion: false,
      writeLatestResultsCurrentlyDocumentedAsPersistence: true,
    },
    limitations: [
      'Local deterministic evidence does not establish Codex deep tracing, authenticated identity, absence of egress, or live readiness.',
      'Qualification supports the local tracing condition but does not authorize a live campaign.',
    ],
    processIsolationVerified,
    promptfooVersion: '0.122.0',
    purpose: 'DEVELOPMENT',
    result: processIsolationVerified ? classifyTracingAttempts(attempts) : 'BLOCKED',
    schemaVersion: 2,
  };
}

export function renderTracingQualification(report: TracingQualificationReport): string {
  return canonicalJson(report) + '\n';
}

function workerEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of ['LANG', 'LC_ALL', 'PATH', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR']) {
    const value = process.env[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }
  return environment;
}

function isAttempt(value: unknown): value is TracingQualificationAttempt {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  const condition = record.condition;
  return (
    condition !== null &&
    typeof condition === 'object' &&
    ((condition as Record<string, unknown>).id === 'e2-exact' ||
      (condition as Record<string, unknown>).id === 'non-persisted-comparison') &&
    typeof (condition as Record<string, unknown>).exact === 'boolean' &&
    (condition as Record<string, unknown>).cache === false &&
    (condition as Record<string, unknown>).sharing === false &&
    (condition as Record<string, unknown>).temporaryDatabase === true &&
    (condition as Record<string, unknown>).telemetryDisabled === true &&
    (condition as Record<string, unknown>).updatesDisabled === true &&
    typeof (condition as Record<string, unknown>).writeLatestResults === 'boolean' &&
    typeof record.correlatedSpanRecovered === 'boolean' &&
    typeof record.promptfooVersion === 'string' &&
    typeof record.providerCompleted === 'boolean' &&
    typeof record.receiverAcceptedSpan === 'boolean' &&
    (record.repetition === 1 || record.repetition === 2) &&
    typeof record.runtimeGetTracesPresent === 'boolean' &&
    (record.status === 'SUPPORTED' || record.status === 'UNSUPPORTED' || record.status === 'BLOCKED') &&
    typeof record.summaryAvailable === 'boolean' &&
    typeof record.typedGetTracesPresent === 'boolean'
  );
}

export async function launchTracingWorker(request: TracingWorkerRequest): Promise<TracingWorkerExecution> {
  const workerPath = fileURLToPath(new URL('./qualify-tracing-worker.js', import.meta.url));
  return await new Promise<TracingWorkerExecution>((resolve, reject) => {
    const child = fork(workerPath, [request.condition.id, String(request.repetition)], {
      cwd: process.cwd(),
      env: workerEnvironment(),
      execPath: process.execPath,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const processId = child.pid;
    let attempt: TracingQualificationAttempt | undefined;
    child.on('message', (message: unknown) => {
      if (isAttempt(message)) {
        attempt = message;
      }
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code !== 0 || signal !== null || processId === undefined || attempt === undefined) {
        reject(new Error('tracing qualification worker did not complete'));
        return;
      }
      resolve({ attempt, processId });
    });
  });
}

async function main(): Promise<void> {
  const report = await qualifyPromptfooTracing(launchTracingWorker);
  process.stdout.write(renderTracingQualification(report));
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
