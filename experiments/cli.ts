import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { buildCapabilityMatrix, experimentalOwnershipMatrix, recommendG2 } from './capabilities.js';
import { canonicalJson } from './canonical.js';
import { foundationConditions } from './conditions.js';
import { createInstrumentFreeze } from './freeze.js';
import { runLiveExperiment } from './run.js';
import { verifyOffline } from './verify.js';
import type { ExperimentKind } from './configuration.js';

const execFile = promisify(execFileCallback);

export interface CliDependencies {
  environment: NodeJS.ProcessEnv;
  root: string;
}

export interface CliResult {
  output: string;
  status: 0 | 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function campaignId(args: string[]): string {
  if (args.length !== 2 || args[0] !== '--campaign' || args[1] === undefined || args[1].trim().length === 0) {
    throw new Error('a campaign is required: --campaign <campaign-id>');
  }
  return args[1];
}

function externalCodexHome(environment: NodeJS.ProcessEnv): string {
  const value = environment.SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('SKILL_EVIDENCE_EXPERIMENT_CODEX_HOME must name a dedicated logged-in CODEX_HOME');
  }
  return value;
}

async function repositoryCommit(root: string): Promise<string> {
  const result = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
  return result.stdout.trim();
}

function artifactRoot(root: string): string {
  return `${root}/.skill-evidence`;
}

function artifactPath(root: string, campaign: string, name: string): string {
  return `${artifactRoot(root)}/campaigns/${campaign}/${name}`;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function loadPromptfooDynamically(): Promise<{ evaluate: (suite: unknown, options: unknown) => Promise<unknown> }> {
  const specifier = 'promptfoo';
  const module: unknown = await import(specifier);
  if (!isRecord(module) || typeof module.evaluate !== 'function') {
    throw new Error('promptfoo did not expose evaluate()');
  }
  const evaluate = module.evaluate as (suite: unknown, options: unknown) => Promise<unknown>;
  return { evaluate };
}

function snapshots(report: unknown): { after: unknown; before: unknown } {
  if (!isRecord(report)) {
    return { after: null, before: null };
  }
  return { after: report.workspaceAfter ?? null, before: report.workspaceBefore ?? null };
}

async function createCuratedReports(root: string, campaign: string): Promise<void> {
  const [freeze, e1Report, baselineReport, deepReport, baselineSummary, deepSummary] = await Promise.all([
    readJson(artifactPath(root, campaign, 'freeze.json')),
    readJson(artifactPath(root, campaign, 'e1-curated.json')),
    readJson(artifactPath(root, campaign, 'e2-baseline-curated.json')),
    readJson(artifactPath(root, campaign, 'e2-deep-curated.json')),
    readJson(artifactPath(root, campaign, 'raw/e2-baseline-summary.json')),
    readJson(artifactPath(root, campaign, 'raw/e2-deep-summary.json')),
  ]);
  const fingerprint = isRecord(freeze) && typeof freeze.conditionsDigest === 'string' ? freeze.conditionsDigest : 'UNKNOWN_FREEZE';
  const baseline = snapshots(baselineReport);
  const deep = snapshots(deepReport);
  const matrix = buildCapabilityMatrix({
    baseline: { after: baseline.after, before: baseline.before, summary: baselineSummary },
    deep: { after: deep.after, before: deep.before, summary: deepSummary },
    versionFingerprint: fingerprint,
  });
  const recommendation = recommendG2(matrix);
  const outputDirectory = `${root}/docs/experiments`;
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(`${outputDirectory}/${campaign}-capability-matrix.json`, `${canonicalJson(matrix)}\n`),
    writeFile(`${outputDirectory}/${campaign}-e1.json`, `${canonicalJson(e1Report)}\n`),
    writeFile(`${outputDirectory}/${campaign}-g2.json`, `${canonicalJson(recommendation)}\n`),
    writeFile(`${outputDirectory}/${campaign}-ownership-matrix.json`, `${canonicalJson(experimentalOwnershipMatrix())}\n`),
  ]);
}

export async function runCli(args: string[], dependencies: CliDependencies): Promise<CliResult> {
  const [command, ...rest] = args;
  if (command === 'verify' && rest.length === 0) {
    const result = await verifyOffline({ root: dependencies.root });
    return { output: `offline verification passed; provider imports: ${result.providerImports}`, status: 0 };
  }
  if (command === 'freeze') {
    const campaign = campaignId(rest);
    const codexHome = externalCodexHome(dependencies.environment);
    await createInstrumentFreeze({
      artifactRoot: artifactRoot(dependencies.root),
      campaignId: campaign,
      conditions: foundationConditions(codexHome),
      lockfilePath: `${dependencies.root}/package-lock.json`,
      manifestPath: `${dependencies.root}/package.json`,
      repositoryCommit: await repositoryCommit(dependencies.root),
    });
    return { output: `instrument freeze created for ${campaign}`, status: 0 };
  }
  const kinds: ReadonlyMap<string, ExperimentKind> = new Map([
    ['e1', 'e1'],
    ['e2-baseline', 'e2-baseline'],
    ['e2-deep', 'e2-deep'],
  ] as const);
  const kind = kinds.get(command ?? '');
  if (kind !== undefined) {
    const campaign = campaignId(rest);
    const result = await runLiveExperiment({
      artifactRoot: artifactRoot(dependencies.root),
      campaignId: campaign,
      environment: dependencies.environment,
      externalCodexHome: externalCodexHome(dependencies.environment),
      kind,
      loadPromptfoo: loadPromptfooDynamically,
      lockfilePath: `${dependencies.root}/package-lock.json`,
      manifestPath: `${dependencies.root}/package.json`,
      repositoryCommit: await repositoryCommit(dependencies.root),
    });
    return { output: `${kind} completed: ${result.status}`, status: result.status === 'PASS' ? 0 : 1 };
  }
  if (command === 'report') {
    const campaign = campaignId(rest);
    await createCuratedReports(dependencies.root, campaign);
    return { output: `curated reports created for ${campaign}`, status: 0 };
  }
  throw new Error('usage: <verify|freeze|e1|e2-baseline|e2-deep|report> [--campaign <campaign-id>]');
}

async function main(): Promise<void> {
  try {
    const result = await runCli(process.argv.slice(2), { environment: process.env, root: process.cwd() });
    process.stdout.write(`${result.output}\n`);
    process.exitCode = result.status;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const invoked = process.argv[1];
if (invoked !== undefined && import.meta.url === pathToFileURL(resolve(invoked)).href) {
  await main();
}
