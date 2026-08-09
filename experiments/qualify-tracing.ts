import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { canonicalJson } from './canonical.js';

export type TracingAttemptStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'BLOCKED';

export type TracingQualificationResult = 'EXACT_SUPPORTED' | 'ALTERNATIVE_SUPPORTED' | 'INSUFFICIENT' | 'BLOCKED';

export interface TracingQualificationAttempt {
  condition: {
    writeLatestResults: boolean;
  };
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
  repetition: 1 | 2;
  writeLatestResults: boolean;
}

export interface TracingWorkerExecution {
  attempt: TracingQualificationAttempt;
  processId: number;
}

export type TracingWorkerLauncher = (request: TracingWorkerRequest) => Promise<TracingWorkerExecution>;

export interface TracingQualificationReport {
  conditions: Array<{
    attempts: TracingQualificationAttempt[];
    writeLatestResults: boolean;
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
  schemaVersion: 1;
}

function attemptsFor(attempts: readonly TracingQualificationAttempt[], writeLatestResults: boolean): TracingQualificationAttempt[] {
  return attempts.filter((attempt) => attempt.condition.writeLatestResults === writeLatestResults);
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
  const exactAttempts = attemptsFor(attempts, false);
  const alternativeAttempts = attemptsFor(attempts, true);
  const exact = exactAttempts.map((attempt) => attempt.status);
  const alternative = alternativeAttempts.map((attempt) => attempt.status);
  if (
    exact.length !== 2 ||
    alternative.length !== 2 ||
    !hasBothRepetitions(exactAttempts) ||
    !hasBothRepetitions(alternativeAttempts) ||
    attempts.some((attempt) => attempt.status === 'BLOCKED' || !attemptIsConsistent(attempt))
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
    condition: { writeLatestResults: attempt.condition.writeLatestResults },
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
    condition: { writeLatestResults: request.writeLatestResults },
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
    { repetition: 1, writeLatestResults: false },
    { repetition: 2, writeLatestResults: false },
    { repetition: 1, writeLatestResults: true },
    { repetition: 2, writeLatestResults: true },
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
      { attempts: attempts.filter((attempt) => !attempt.condition.writeLatestResults), writeLatestResults: false },
      { attempts: attempts.filter((attempt) => attempt.condition.writeLatestResults), writeLatestResults: true },
    ],
    documentationFacts: {
      getTracesStableReferenceEstablishedForPinnedVersion: false,
      writeLatestResultsCurrentlyDocumentedAsPersistence: true,
    },
    limitations: [
      'Local deterministic evidence does not establish Codex deep tracing, authenticated identity, absence of egress, or live readiness.',
      'An alternative condition is a development candidate and cannot change the frozen live instrument without a later authorized plan.',
    ],
    processIsolationVerified,
    promptfooVersion: '0.122.0',
    purpose: 'DEVELOPMENT',
    result: processIsolationVerified ? classifyTracingAttempts(attempts) : 'BLOCKED',
    schemaVersion: 1,
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
    const child = fork(workerPath, [String(request.writeLatestResults), String(request.repetition)], {
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
