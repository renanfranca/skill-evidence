import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { canonicalJson } from '../canonical-json.js';
import { prepareAuthorInvocation } from '../author/evaluation-author.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { qualifyAuthorBenchmarkDirectory } from './author-benchmark.js';
import {
  evaluateAuthorBenchmarkCampaignPreflight,
  validateAuthorBenchmarkCampaignPreparation,
  type AuthorBenchmarkCampaignPreflightReport,
} from './author-benchmark-preflight.js';

const execFileAsync = promisify(execFile);

export interface AuthorBenchmarkPreflightDependencies {
  codexCliVersion?: () => Promise<string>;
  currentCommit?: () => Promise<string>;
  environment?: NodeJS.ProcessEnv;
  npmVersion?: () => Promise<string>;
  packageVersion?: (name: string) => Promise<string>;
  pathExists?: (path: string) => Promise<boolean>;
  pathReadable?: (path: string) => Promise<boolean>;
  pathWritable?: (path: string) => Promise<boolean>;
  repositoryRoot?: string;
  workingTreeClean?: () => Promise<boolean>;
}

function parseArguments(args: string[]): { bundle: string; expectedCommit: string; preparation: string } {
  const bundleIndex = args.indexOf('--bundle');
  const expectedCommitIndex = args.indexOf('--expected-commit');
  const preparationIndex = args.indexOf('--preparation');
  const bundle = args[bundleIndex + 1];
  const expectedCommit = args[expectedCommitIndex + 1];
  const preparation = args[preparationIndex + 1];
  if (
    args.length !== 6 ||
    bundleIndex === -1 ||
    expectedCommitIndex === -1 ||
    preparationIndex === -1 ||
    bundle === undefined ||
    expectedCommit === undefined ||
    !/^[a-f0-9]{40}$/.test(expectedCommit) ||
    preparation === undefined
  ) {
    throw new Error('USAGE: --bundle <directory> --preparation <campaign-preparation.json> --expected-commit <40-char-sha>');
  }
  return { bundle, expectedCommit, preparation };
}

async function commandOutput(command: string, args: string[], cwd: string): Promise<string> {
  return (await execFileAsync(command, args, { cwd, encoding: 'utf8' })).stdout.trim();
}

async function defaultPackageVersion(repositoryRoot: string, name: string): Promise<string> {
  const manifestPath = join(repositoryRoot, 'node_modules', ...name.split('/'), 'package.json');
  const value = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string'
    ? value.version
    : 'UNAVAILABLE';
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstSkillPath(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.cases)) return '';
  const first: unknown = value.cases[0];
  return isRecord(first) && typeof first.skillPath === 'string' ? first.skillPath : '';
}

export async function runAuthorBenchmarkCampaignPreflight(
  args: string[],
  dependencies: AuthorBenchmarkPreflightDependencies = {},
): Promise<AuthorBenchmarkCampaignPreflightReport> {
  const parsed = parseArguments(args);
  const repositoryRoot = dependencies.repositoryRoot ?? process.cwd();
  const bundleDirectory = resolve(parsed.bundle);
  const preparationValue = JSON.parse(await readFile(resolve(parsed.preparation), 'utf8')) as unknown;
  const validation = validateAuthorBenchmarkCampaignPreparation(preparationValue);
  if (!validation.valid) throw new Error('CAMPAIGN_PREPARATION_INVALID');
  const campaign = validation.campaign;
  const environment = dependencies.environment ?? process.env;
  const packageVersion = dependencies.packageVersion ?? (async (name) => await defaultPackageVersion(repositoryRoot, name));
  const currentCommit = dependencies.currentCommit ?? (async () => await commandOutput('git', ['rev-parse', 'HEAD'], repositoryRoot));
  const workingTreeClean =
    dependencies.workingTreeClean ?? (async () => (await commandOutput('git', ['status', '--porcelain'], repositoryRoot)) === '');
  const npmVersion = dependencies.npmVersion ?? (async () => await commandOutput('npm', ['--version'], repositoryRoot));
  const codexCliVersion =
    dependencies.codexCliVersion ??
    (async () => (await commandOutput('codex', ['--version'], repositoryRoot)).replace(/^codex-cli\s+/u, ''));
  const pathExists = dependencies.pathExists ?? defaultPathExists;
  const pathReadable = dependencies.pathReadable ?? (async (path) => await canAccess(path, constants.R_OK));
  const pathWritable = dependencies.pathWritable ?? (async (path) => await canAccess(path, constants.W_OK));

  const [
    offline,
    bundleValue,
    commit,
    clean,
    npm,
    promptfoo,
    codexSdk,
    codexCli,
    reservationExists,
    terminalReceiptExists,
    outputDirectoryExists,
  ] = await Promise.all([
    qualifyAuthorBenchmarkDirectory(bundleDirectory),
    readFile(join(bundleDirectory, 'bundle.json'), 'utf8').then((text) => JSON.parse(text) as unknown),
    currentCommit(),
    workingTreeClean(),
    npmVersion(),
    packageVersion('promptfoo'),
    packageVersion('@openai/codex-sdk'),
    codexCliVersion(),
    pathExists(resolve(repositoryRoot, campaign.reservationPath)),
    pathExists(resolve(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json'))),
    pathExists(resolve(repositoryRoot, campaign.outputDirectory)),
  ]);
  const scheduleCount =
    typeof bundleValue === 'object' && bundleValue !== null && 'schedule' in bundleValue && Array.isArray(bundleValue.schedule)
      ? bundleValue.schedule.length
      : 0;
  const snapshot = await createSkillSnapshot({ rootDirectory: join(bundleDirectory, firstSkillPath(bundleValue)) });
  const terra = prepareAuthorInvocation(snapshot, { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' });
  const luna = prepareAuthorInvocation(snapshot, { model: 'gpt-5.6-luna', reasoningEffort: 'max' });
  const codexHome = environment.SKILL_EVIDENCE_AUTHOR_CODEX_HOME ?? '';
  const evidence = {
    authentication: {
      authFileReadable: await pathReadable(join(codexHome, 'auth.json')),
      codexHome,
      homeWritable: await pathWritable(codexHome),
    },
    bundleFingerprint: offline.bundleFingerprint,
    conditionFingerprints: { LUNA_MAX: luna.conditionFingerprint, TERRA_XHIGH: terra.conditionFingerprint },
    credentialVariablesAbsent: environment.OPENAI_API_KEY === undefined && environment.CODEX_API_KEY === undefined,
    currentCommit: commit,
    expectedCommit: parsed.expectedCommit,
    environment: {
      codexCliVersion: codexCli,
      codexHome,
      codexSdkVersion: codexSdk,
      nodeVersion: process.versions.node,
      npmVersion: npm,
      promptfooVersion: promptfoo,
    },
    offlineQualificationResult: offline.result,
    outputDirectoryExists,
    outputParentWritable: await pathWritable(resolve(repositoryRoot, '.skill-evidence')),
    reservationExists,
    reviewerQualificationFingerprint: offline.reviewerQualificationFingerprint,
    reviewerQualificationResult: offline.reviewerQualification.result,
    scheduleCount,
    terminalReceiptExists,
    worktreeClean: clean,
  } as const;
  return evaluateAuthorBenchmarkCampaignPreflight(campaign, evidence);
}

export function renderAuthorBenchmarkCampaignPreflight(report: AuthorBenchmarkCampaignPreflightReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  try {
    const report = await runAuthorBenchmarkCampaignPreflight(process.argv.slice(2));
    process.stdout.write(renderAuthorBenchmarkCampaignPreflight(report));
    process.exitCode = report.result === 'READY_FOR_AUTHORIZATION' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'AUTHOR_BENCHMARK_PREFLIGHT_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
