import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  authorEvaluationBlueprint,
  prepareAuthorInvocation,
  type AuthorConditionSpec,
  type AuthorInvoker,
  type AuthorTokenUsage,
} from '../author/evaluation-author.js';
import { createPromptfooAuthorInvoker } from '../author/promptfoo-author-invoker.js';
import type { AuthorProviderFailureCategory } from '../author/provider-diagnostic.js';
import type { EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import type { AuthorBenchmarkCampaignPreflightReport, AuthorBenchmarkCampaignPreparation } from './author-benchmark-preflight.js';
import {
  validateAuthorBenchmarkBundle,
  verifyAuthorBenchmarkPacketBlindness,
  type AuthorBenchmarkBundleCandidate,
  type AuthorBenchmarkScheduleEntry,
} from './author-benchmark.js';

const execFileAsync = promisify(execFile);

export type AuthorBenchmarkRunnerErrorCode =
  | 'BENCHMARK_APPROVAL_REQUIRED'
  | 'BENCHMARK_ALREADY_RESERVED'
  | 'BENCHMARK_ARGUMENT_INVALID'
  | 'BENCHMARK_COMMIT_MISMATCH'
  | 'BENCHMARK_PREFLIGHT_BLOCKED'
  | 'BENCHMARK_RESERVATION_FAILED';

export class AuthorBenchmarkRunnerError extends Error {
  readonly code: AuthorBenchmarkRunnerErrorCode;

  constructor(code: AuthorBenchmarkRunnerErrorCode, message: string) {
    super(message);
    this.name = 'AuthorBenchmarkRunnerError';
    this.code = code;
  }
}

export interface RunAuthorBenchmarkCampaignInput {
  approval: string;
  bundle: AuthorBenchmarkBundleCandidate;
  bundleDirectory: string;
  campaign: AuthorBenchmarkCampaignPreparation;
  codexHome: string;
  expectedCommit: string;
  preflight: AuthorBenchmarkCampaignPreflightReport;
  repositoryRoot: string;
}

export interface AuthorBenchmarkRunnerDependencies {
  createInvoker?: (workingDirectory: string) => AuthorInvoker;
  createWorkspace?: () => Promise<{ cleanup: () => Promise<void>; path: string }>;
  currentCommit?: () => Promise<string>;
  now?: () => number;
  workingTreeClean?: () => Promise<boolean>;
}

export interface AuthorBenchmarkCollectedSample {
  blueprint?: EvaluationBlueprint;
  caseId: string;
  condition: AuthorBenchmarkScheduleEntry['condition'];
  conditionFingerprint: string;
  elapsedMs: number;
  error?: { code: string; diagnostic?: unknown };
  order: number;
  packetFingerprint: string | null;
  providerLatencyMs: number | null;
  sampleId: string;
  snapshotFingerprint: string;
  status: 'COMPLETED' | 'ERROR' | 'NOT_RUN';
  tokenUsage: AuthorTokenUsage | null;
}

export interface AuthorBenchmarkCollection {
  bundleFingerprint: string;
  campaignFingerprint: string;
  campaignId: string;
  currentCommit: string;
  expectedCommit: string;
  providerInvocations: number;
  purpose: 'AUTHOR_QUALIFICATION_COLLECTION';
  samples: AuthorBenchmarkCollectedSample[];
  schemaVersion: 1;
  status: 'COMPLETE' | 'INSUFFICIENT' | 'INVALIDATED';
  stopReason: string | null;
}

async function writeExclusive(path: string, value: unknown): Promise<void> {
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new AuthorBenchmarkRunnerError('BENCHMARK_ALREADY_RESERVED', 'exclusive campaign artifact already exists');
    }
    throw error;
  }
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

async function defaultWorkspace(): Promise<{ cleanup: () => Promise<void>; path: string }> {
  const path = await mkdtemp(join(tmpdir(), 'skill-evidence-author-benchmark-'));
  return { cleanup: async () => await rm(path, { force: true, recursive: true }), path };
}

function conditionFor(sample: AuthorBenchmarkScheduleEntry): AuthorConditionSpec {
  return sample.condition === 'TERRA_XHIGH'
    ? { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' }
    : { model: 'gpt-5.6-luna', reasoningEffort: 'max' };
}

function globalStopReason(category: AuthorProviderFailureCategory): string | null {
  const stops: Partial<Record<AuthorProviderFailureCategory, string>> = {
    AUTHENTICATION: 'GLOBAL_AUTHENTICATION',
    CONFIGURATION: 'GLOBAL_CONFIGURATION',
    MODEL_ACCESS: 'GLOBAL_MODEL_ACCESS',
    PROCESS: 'GLOBAL_PROCESS',
  };
  return stops[category] ?? null;
}

export async function runAuthorBenchmarkCampaign(
  input: RunAuthorBenchmarkCampaignInput,
  dependencies: AuthorBenchmarkRunnerDependencies = {},
): Promise<AuthorBenchmarkCollection> {
  if (input.approval !== '16') {
    throw new AuthorBenchmarkRunnerError(
      'BENCHMARK_APPROVAL_REQUIRED',
      'benchmark collection requires approval for exactly 16 invocations',
    );
  }
  if (
    input.preflight.result !== 'READY_FOR_AUTHORIZATION' ||
    input.preflight.campaignId !== input.campaign.campaignId ||
    input.preflight.campaignFingerprint !== sha256(input.campaign) ||
    input.preflight.expectedCommit !== input.expectedCommit ||
    input.preflight.currentCommit !== input.expectedCommit
  ) {
    throw new AuthorBenchmarkRunnerError('BENCHMARK_PREFLIGHT_BLOCKED', 'benchmark collection requires the exact ready preflight');
  }
  const currentCommit =
    dependencies.currentCommit ??
    (async () => (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: input.repositoryRoot, encoding: 'utf8' })).stdout.trim());
  const workingTreeClean =
    dependencies.workingTreeClean ??
    (async () =>
      (await execFileAsync('git', ['status', '--porcelain'], { cwd: input.repositoryRoot, encoding: 'utf8' })).stdout.trim() === '');
  const [commit, clean] = await Promise.all([currentCommit(), workingTreeClean()]);
  if (!clean || commit !== input.expectedCommit) {
    throw new AuthorBenchmarkRunnerError('BENCHMARK_COMMIT_MISMATCH', 'benchmark collection requires the clean expected commit');
  }
  const validation = validateAuthorBenchmarkBundle(input.bundle);
  if (!validation.valid || validation.fingerprint === null || validation.fingerprint !== input.campaign.bundleFingerprint) {
    throw new AuthorBenchmarkRunnerError('BENCHMARK_PREFLIGHT_BLOCKED', 'benchmark bundle no longer matches the ready preflight');
  }
  const campaignFingerprint = sha256(input.campaign);
  const reservationPath = resolve(input.repositoryRoot, input.campaign.reservationPath);
  const outputDirectory = resolve(input.repositoryRoot, input.campaign.outputDirectory);
  await mkdir(dirname(reservationPath), { recursive: true });
  await writeExclusive(reservationPath, {
    bundleFingerprint: validation.fingerprint,
    campaignFingerprint,
    campaignId: input.campaign.campaignId,
    currentCommit: commit,
    expectedCommit: input.expectedCommit,
    invocationBudget: 16,
    schedule: input.bundle.schedule,
    schemaVersion: 1,
    status: 'RESERVED',
  });
  try {
    await mkdir(dirname(outputDirectory), { recursive: true });
    await mkdir(outputDirectory);
    await Promise.all([mkdir(join(outputDirectory, 'reservations')), mkdir(join(outputDirectory, 'samples'))]);
  } catch (error) {
    throw new AuthorBenchmarkRunnerError(
      'BENCHMARK_RESERVATION_FAILED',
      `campaign output could not be claimed after reservation: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
  const createWorkspace = dependencies.createWorkspace ?? defaultWorkspace;
  const createInvoker =
    dependencies.createInvoker ??
    ((workingDirectory: string) => createPromptfooAuthorInvoker({ codexHome: input.codexHome, workingDirectory }));
  const now = dependencies.now ?? Date.now;
  const samples: AuthorBenchmarkCollectedSample[] = [];
  let providerInvocations = 0;
  let status: AuthorBenchmarkCollection['status'] = 'COMPLETE';
  let stopReason: string | null = null;
  const schedule = [...input.bundle.schedule].sort((left, right) => left.order - right.order);
  for (const scheduled of schedule) {
    const benchmarkCase = input.bundle.cases.find((entry) => entry.id === scheduled.caseId);
    if (benchmarkCase === undefined) {
      status = 'INVALIDATED';
      stopReason = 'SCHEDULE_DRIFT';
      break;
    }
    const snapshot = await createSkillSnapshot({ rootDirectory: join(input.bundleDirectory, benchmarkCase.skillPath) });
    const condition = conditionFor(scheduled);
    const prepared = prepareAuthorInvocation(snapshot, condition);
    const expectedConditionFingerprint = input.campaign.conditions.find((entry) => entry.id === scheduled.condition)?.conditionFingerprint;
    if (snapshot.fingerprint !== benchmarkCase.snapshotFingerprint) {
      status = 'INVALIDATED';
      stopReason = 'SNAPSHOT_DRIFT';
      break;
    }
    if (prepared.conditionFingerprint !== expectedConditionFingerprint) {
      status = 'INVALIDATED';
      stopReason = 'CONDITION_DRIFT';
      break;
    }
    if (!verifyAuthorBenchmarkPacketBlindness(input.bundle, benchmarkCase, prepared.request.prompt).valid) {
      status = 'INVALIDATED';
      stopReason = 'PACKET_BLINDNESS';
      break;
    }
    let workspace: Awaited<ReturnType<typeof createWorkspace>>;
    try {
      workspace = await createWorkspace();
    } catch {
      status = 'INSUFFICIENT';
      stopReason = 'INFRASTRUCTURE_WORKSPACE';
      break;
    }
    try {
      await writeExclusive(
        join(outputDirectory, 'reservations', `${String(scheduled.order).padStart(2, '0')}-${scheduled.sampleId}.json`),
        {
          campaignFingerprint,
          caseId: scheduled.caseId,
          condition: scheduled.condition,
          conditionFingerprint: prepared.conditionFingerprint,
          currentCommit: commit,
          expectedCommit: input.expectedCommit,
          order: scheduled.order,
          packetFingerprint: prepared.packetFingerprint,
          sampleId: scheduled.sampleId,
          schemaVersion: 1,
          snapshotFingerprint: snapshot.fingerprint,
          status: 'RESERVED',
        },
      );
      const startedAt = now();
      providerInvocations += 1;
      const run = await authorEvaluationBlueprint({
        campaignId: `${input.campaign.campaignId}:${scheduled.sampleId}`,
        condition,
        invoke: createInvoker(workspace.path),
        snapshot,
      });
      const elapsedMs = Math.max(0, now() - startedAt);
      const record: AuthorBenchmarkCollectedSample =
        run.status === 'COMPLETED'
          ? {
              blueprint: run.blueprint,
              caseId: scheduled.caseId,
              condition: scheduled.condition,
              conditionFingerprint: prepared.conditionFingerprint,
              elapsedMs,
              order: scheduled.order,
              packetFingerprint: prepared.packetFingerprint,
              providerLatencyMs: run.providerLatencyMs,
              sampleId: scheduled.sampleId,
              snapshotFingerprint: snapshot.fingerprint,
              status: 'COMPLETED',
              tokenUsage: run.tokenUsage,
            }
          : {
              caseId: scheduled.caseId,
              condition: scheduled.condition,
              conditionFingerprint: prepared.conditionFingerprint,
              elapsedMs,
              error: run.error,
              order: scheduled.order,
              packetFingerprint: prepared.packetFingerprint,
              providerLatencyMs: run.providerLatencyMs,
              sampleId: scheduled.sampleId,
              snapshotFingerprint: snapshot.fingerprint,
              status: 'ERROR',
              tokenUsage: run.tokenUsage,
            };
      await writeExclusive(
        join(outputDirectory, 'samples', `${String(scheduled.order).padStart(2, '0')}-${scheduled.sampleId}.json`),
        record,
      );
      samples.push(record);
      if (run.status === 'ERROR' && run.error.code === 'PROVIDER_ERROR') {
        const globalStop = globalStopReason(run.error.diagnostic.category);
        if (globalStop !== null) {
          status = 'INSUFFICIENT';
          stopReason = globalStop;
          break;
        }
      }
    } finally {
      await workspace.cleanup();
    }
  }
  for (const scheduled of schedule.slice(samples.length)) {
    const benchmarkCase = input.bundle.cases.find((entry) => entry.id === scheduled.caseId)!;
    const conditionFingerprint = input.campaign.conditions.find((entry) => entry.id === scheduled.condition)!.conditionFingerprint;
    const record: AuthorBenchmarkCollectedSample = {
      caseId: scheduled.caseId,
      condition: scheduled.condition,
      conditionFingerprint,
      elapsedMs: 0,
      order: scheduled.order,
      packetFingerprint: null,
      providerLatencyMs: null,
      sampleId: scheduled.sampleId,
      snapshotFingerprint: benchmarkCase.snapshotFingerprint,
      status: 'NOT_RUN',
      tokenUsage: null,
    };
    await writeExclusive(
      join(outputDirectory, 'samples', `${String(scheduled.order).padStart(2, '0')}-${scheduled.sampleId}.json`),
      record,
    );
    samples.push(record);
  }
  const collection: AuthorBenchmarkCollection = {
    bundleFingerprint: validation.fingerprint,
    campaignFingerprint,
    campaignId: input.campaign.campaignId,
    currentCommit: commit,
    expectedCommit: input.expectedCommit,
    providerInvocations,
    purpose: 'AUTHOR_QUALIFICATION_COLLECTION',
    samples,
    schemaVersion: 1,
    status,
    stopReason,
  };
  await writeExclusive(join(outputDirectory, 'collection.json'), collection);
  return collection;
}
