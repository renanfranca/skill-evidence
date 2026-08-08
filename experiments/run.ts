import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { reserveProviderInvocation } from './budget.js';
import { canonicalJson } from './canonical.js';
import { foundationConditions } from './conditions.js';
import { createExperimentInvocation } from './configuration.js';
import type { ExperimentKind } from './configuration.js';
import { assertFreezeCurrent } from './freeze.js';
import type { InstrumentFreeze } from './freeze.js';
import { assertCredentialPolicy, runProviderInvocation } from './invocation.js';
import { withPromptfooIsolation } from './isolation.js';
import { assessE1, assessE2 } from './report.js';
import { sanitizeForPersistence } from './redaction.js';
import { createSyntheticWorkspace, snapshotWorkspace } from './workspace.js';

interface SummaryCapable {
  toEvaluateSummary?: () => Promise<unknown>;
}

export interface RunLiveExperimentInput {
  artifactRoot: string;
  campaignId: string;
  environment: NodeJS.ProcessEnv;
  externalCodexHome: string;
  kind: ExperimentKind;
  loadPromptfoo: () => Promise<{ evaluate: (suite: unknown, options: unknown) => Promise<unknown> }>;
  lockfilePath: string;
  manifestPath: string;
  repositoryCommit: string;
}

export interface LiveExperimentResult {
  kind: ExperimentKind;
  report: unknown;
  status: 'PASS' | 'ERROR';
}

function isSummaryCapable(value: unknown): value is SummaryCapable {
  return value !== null && typeof value === 'object';
}

async function getSummary(value: unknown): Promise<unknown> {
  if (isSummaryCapable(value) && typeof value.toEvaluateSummary === 'function') {
    return value.toEvaluateSummary();
  }
  return value;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function loadFreeze(artifactRoot: string, campaignId: string): Promise<InstrumentFreeze> {
  try {
    return JSON.parse(await readFile(join(artifactRoot, 'campaigns', campaignId, 'freeze.json'), 'utf8')) as InstrumentFreeze;
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(`no instrument freeze exists for campaign ${campaignId}`);
    }
    throw error;
  }
}

async function persistJson(path: string, value: unknown, externalCodexHome: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(sanitizeForPersistence(value, externalCodexHome), null, 2)}\n`);
}

async function assertExternalCodexHome(path: string): Promise<void> {
  if (path.trim().length === 0) {
    throw new Error('SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME must name a dedicated logged-in CODEX_HOME');
  }
  await access(path);
}

function e2Report(kind: ExperimentKind, summary: unknown, before: unknown, after: unknown): Record<string, unknown> {
  const e2 = assessE2(summary);
  return {
    condition: kind,
    limitations: [
      'Filesystem snapshots are experimental ground truth, not evidence of a causal skill contribution.',
      'Effective model and reasoning are null unless the provider exposes them independently.',
    ],
    providerError: e2.providerError,
    rawSummaryObserved: summary !== null,
    response: e2.response,
    status: e2.status,
    workspaceAfter: after,
    workspaceBefore: before,
  };
}

export async function runLiveExperiment(input: RunLiveExperimentInput): Promise<LiveExperimentResult> {
  await assertExternalCodexHome(input.externalCodexHome);
  assertCredentialPolicy({ options: {}, provider: 'openai:codex-sdk', suite: {} }, input.environment);
  const freeze = await loadFreeze(input.artifactRoot, input.campaignId);
  await assertFreezeCurrent({
    conditions: foundationConditions(input.externalCodexHome),
    freeze,
    lockfilePath: input.lockfilePath,
    manifestPath: input.manifestPath,
    repositoryCommit: input.repositoryCommit,
  });

  const workspace = await createSyntheticWorkspace();
  try {
    const invocation = createExperimentInvocation({
      externalCodexHome: input.externalCodexHome,
      kind: input.kind,
      workingDirectory: workspace.path,
    });
    if (input.kind !== 'e1') {
      invocation.suite.prompts = [workspace.instructions];
    }
    assertCredentialPolicy(
      {
        cliEnv: invocation.providerConfig.cli_env,
        options: invocation.options,
        provider: 'openai:codex-sdk',
        providerConfig: invocation.providerConfig,
        suite: invocation.suite,
      },
      input.environment,
    );
    await reserveProviderInvocation({ artifactRoot: input.artifactRoot, campaignId: input.campaignId, kind: input.kind });
    let summary: unknown;
    let providerError: string | null = null;
    try {
      const raw = await withPromptfooIsolation(async () =>
        runProviderInvocation({
          environment: input.environment,
          loadPromptfoo: input.loadPromptfoo,
          request: {
            cliEnv: invocation.providerConfig.cli_env,
            options: invocation.options,
            provider: 'openai:codex-sdk',
            providerConfig: invocation.providerConfig,
            suite: invocation.suite,
          },
        }),
      );
      summary = await getSummary(raw);
    } catch (error) {
      providerError = error instanceof Error ? error.message : String(error);
      summary = { results: [{ response: { error: providerError } }] };
    }
    const workspaceAfter = await snapshotWorkspace(workspace.path);
    const directory = join(input.artifactRoot, 'campaigns', input.campaignId);
    await persistJson(join(directory, 'raw', `${input.kind}-summary.json`), summary, input.externalCodexHome);
    const report = input.kind === 'e1' ? assessE1(summary) : e2Report(input.kind, summary, workspace.before, workspaceAfter);
    await writeFile(
      join(directory, `${input.kind}-curated.json`),
      `${canonicalJson(sanitizeForPersistence(report, input.externalCodexHome))}\n`,
    );
    const status = input.kind === 'e1' ? (assessE1(summary).g1 === 'PASS' ? 'PASS' : 'ERROR') : assessE2(summary).status;
    return { kind: input.kind, report, status };
  } finally {
    await workspace.dispose();
  }
}
