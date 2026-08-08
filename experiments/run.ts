import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { assertCleanWorktree, campaignArtifactPath, codexHomeDirectoryIdentity } from './campaign.js';
import { reserveProviderInvocation } from './budget.js';
import { canonicalJson } from './canonical.js';
import { foundationConditions } from './conditions.js';
import { createExperimentInvocation } from './configuration.js';
import type { ExperimentKind } from './configuration.js';
import { assertFreezeCurrent } from './freeze.js';
import type { InstrumentFreeze } from './freeze.js';
import { assertCredentialPolicy, runProviderInvocation } from './invocation.js';
import { withPromptfooIsolation } from './isolation.js';
import { assessE1, assessProviderOutcome } from './report.js';
import { sanitizeForPersistence } from './redaction.js';
import { assessCanary, createSyntheticWorkspace, snapshotWorkspace } from './workspace.js';

interface EvaluationResult {
  getTraces?: () => Promise<unknown>;
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
  repositoryRoot?: string;
}

export interface LiveExperimentResult {
  kind: ExperimentKind;
  report: unknown;
  status: 'ERROR' | 'INVALID_CANARY' | 'PASS';
}

function isEvaluationResult(value: unknown): value is EvaluationResult {
  return value !== null && typeof value === 'object';
}

async function evaluateArtifacts(value: unknown, externalCodexHome: string): Promise<{ summary: unknown; traces: unknown }> {
  const summary = isEvaluationResult(value) && typeof value.toEvaluateSummary === 'function' ? await value.toEvaluateSummary() : value;
  const traces = isEvaluationResult(value) && typeof value.getTraces === 'function' ? await value.getTraces() : [];
  return {
    summary: sanitizeForPersistence(summary, externalCodexHome),
    traces: sanitizeForPersistence(traces, externalCodexHome),
  };
}

async function loadFreeze(artifactRoot: string, campaignId: string): Promise<InstrumentFreeze> {
  return JSON.parse(await readFile(campaignArtifactPath(artifactRoot, campaignId, 'freeze.json'), 'utf8')) as InstrumentFreeze;
}

async function persistArtifact(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { mode: 0o700, recursive: true });
  await writeFile(path, canonicalJson(value) + '\n', { mode: 0o600 });
}

async function assertExternalCodexHome(path: string): Promise<string> {
  if (path.trim().length === 0) {
    throw new Error('SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME must name a dedicated logged-in CODEX_HOME');
  }
  await access(path);
  return (await codexHomeDirectoryIdentity(path)).canonicalPath;
}

async function assertBaselineCanaryPassed(artifactRoot: string, campaignId: string, kind: ExperimentKind): Promise<void> {
  if (kind !== 'e2-deep') {
    return;
  }
  try {
    const report = JSON.parse(await readFile(campaignArtifactPath(artifactRoot, campaignId, 'e2-baseline-curated.json'), 'utf8')) as {
      canary?: { status?: unknown };
    };
    if (report.canary?.status !== 'PASS') {
      throw new Error('baseline E2 did not produce a valid canary');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'baseline E2 did not produce a valid canary') {
      throw error;
    }
    throw new Error('a valid baseline E2 canary is required before E2 deep');
  }
}

export async function runLiveExperiment(input: RunLiveExperimentInput): Promise<LiveExperimentResult> {
  if (input.repositoryRoot !== undefined) {
    await assertCleanWorktree(input.repositoryRoot);
  }
  const externalCodexHome = await assertExternalCodexHome(input.externalCodexHome);
  assertCredentialPolicy({ options: {}, provider: 'openai:codex-sdk', suite: {} }, input.environment);
  const freeze = await loadFreeze(input.artifactRoot, input.campaignId);
  await assertFreezeCurrent({
    externalCodexHome,
    freeze,
    lockfilePath: input.lockfilePath,
    manifestPath: input.manifestPath,
    repositoryCommit: input.repositoryCommit,
    scientificConfiguration: foundationConditions(),
  });
  await assertBaselineCanaryPassed(input.artifactRoot, input.campaignId, input.kind);
  const workspace = await createSyntheticWorkspace();
  try {
    const invocation = createExperimentInvocation({
      externalCodexHome,
      kind: input.kind,
      ...(input.kind === 'e1' ? {} : { prompt: workspace.instructions }),
      workingDirectory: workspace.path,
    });
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
    const summaryPath = campaignArtifactPath(input.artifactRoot, input.campaignId, 'raw', input.kind + '-summary.json');
    const tracePath = campaignArtifactPath(input.artifactRoot, input.campaignId, 'raw', input.kind + '-traces.json');
    await mkdir(campaignArtifactPath(input.artifactRoot, input.campaignId, 'raw'), { mode: 0o700, recursive: true });
    let artifacts: { summary: unknown; traces: unknown };
    try {
      artifacts = await withPromptfooIsolation(async () => {
        const raw = await runProviderInvocation({
          environment: input.environment,
          loadPromptfoo: input.loadPromptfoo,
          request: {
            cliEnv: invocation.providerConfig.cli_env,
            options: invocation.options,
            provider: 'openai:codex-sdk',
            providerConfig: invocation.providerConfig,
            suite: invocation.suite,
          },
        });
        const collected = await evaluateArtifacts(raw, externalCodexHome);
        await Promise.all([persistArtifact(summaryPath, collected.summary), persistArtifact(tracePath, collected.traces)]);
        return collected;
      });
    } catch (error) {
      artifacts = {
        summary: sanitizeForPersistence(
          { results: [{ response: { error: error instanceof Error ? error.message : String(error) } }] },
          externalCodexHome,
        ),
        traces: [],
      };
      await Promise.all([persistArtifact(summaryPath, artifacts.summary), persistArtifact(tracePath, artifacts.traces)]);
    }
    await Promise.all([readFile(summaryPath, 'utf8'), readFile(tracePath, 'utf8')]);
    const after = await snapshotWorkspace(workspace.path);
    const provider = assessProviderOutcome(artifacts.summary);
    const canary = input.kind === 'e1' ? undefined : assessCanary(artifacts.summary, after);
    const report =
      input.kind === 'e1'
        ? assessE1(artifacts.summary)
        : {
            canary,
            condition: input.kind,
            provider,
            tracesObserved: Array.isArray(artifacts.traces) && artifacts.traces.length > 0,
            workspaceAfter: after,
            workspaceBefore: workspace.before,
          };
    await persistArtifact(campaignArtifactPath(input.artifactRoot, input.campaignId, input.kind + '-curated.json'), report);
    const status = input.kind === 'e1' ? (assessE1(artifacts.summary).g1 === 'PASS' ? 'PASS' : 'ERROR') : (canary?.status ?? 'ERROR');
    return { kind: input.kind, report, status };
  } finally {
    await workspace.dispose();
  }
}
