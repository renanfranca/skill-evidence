import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { canonicalJson } from '../canonical-json.js';
import {
  evaluateAuthorOperabilityPreflight,
  inspectAuthorOperabilityCampaign,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorOperabilityPreflightReport,
} from './author-operability.js';

const execFileAsync = promisify(execFile);

export interface AuthorOperabilityPreflightDependencies {
  codexCliVersion?: () => Promise<string>;
  currentCommit?: () => Promise<string>;
  environment?: NodeJS.ProcessEnv;
  localQualification?: () => Promise<'BLOCKED' | 'SUPPORTED_FOR_DEVELOPMENT'>;
  loginStatus?: (codexHome: string) => Promise<boolean>;
  nodeVersion?: () => string;
  npmVersion?: () => Promise<string>;
  packageVersion?: (name: string) => Promise<string>;
  pathExists?: (path: string) => Promise<boolean>;
  pathWritable?: (path: string) => Promise<boolean>;
  repositoryRoot?: string;
  upstreamAligned?: () => Promise<boolean>;
  workingTreeClean?: () => Promise<boolean>;
}

function parseArguments(args: string[]): { expectedCommit: string; preparationPath: string } {
  const preparationIndex = args.indexOf('--preparation');
  const commitIndex = args.indexOf('--expected-commit');
  const preparationPath = args[preparationIndex + 1];
  const expectedCommit = args[commitIndex + 1];
  if (
    args.length !== 4 ||
    preparationIndex === -1 ||
    commitIndex === -1 ||
    preparationPath === undefined ||
    expectedCommit === undefined ||
    !/^[a-f0-9]{40}$/u.test(expectedCommit)
  ) {
    throw new Error('USAGE: --preparation <campaign-preparation.json> --expected-commit <40-char-sha>');
  }
  return { expectedCommit, preparationPath };
}

async function commandOutput(command: string, args: string[], cwd: string, environment?: NodeJS.ProcessEnv): Promise<string> {
  return (await execFileAsync(command, args, { cwd, encoding: 'utf8', env: environment })).stdout.trim();
}

async function packageVersion(repositoryRoot: string, name: string): Promise<string> {
  const value = JSON.parse(await readFile(join(repositoryRoot, 'node_modules', ...name.split('/'), 'package.json'), 'utf8')) as unknown;
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string'
    ? value.version
    : 'UNAVAILABLE';
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function pathWritable(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function localQualification(repositoryRoot: string): Promise<'BLOCKED' | 'SUPPORTED_FOR_DEVELOPMENT'> {
  const output = await commandOutput(
    process.execPath,
    [resolve(repositoryRoot, 'dist/src/qualification/qualify-author-operability.js')],
    repositoryRoot,
  );
  const lastLine = output.split('\n').filter(Boolean).at(-1);
  if (lastLine === undefined) return 'BLOCKED';
  try {
    const report = JSON.parse(lastLine) as { result?: unknown };
    return report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 'SUPPORTED_FOR_DEVELOPMENT' : 'BLOCKED';
  } catch {
    return 'BLOCKED';
  }
}

export async function runAuthorOperabilityPreflight(
  args: string[],
  dependencies: AuthorOperabilityPreflightDependencies = {},
): Promise<AuthorOperabilityPreflightReport> {
  const parsed = parseArguments(args);
  const repositoryRoot = dependencies.repositoryRoot ?? process.cwd();
  const preparationValue = JSON.parse(await readFile(resolve(repositoryRoot, parsed.preparationPath), 'utf8')) as unknown;
  if (!validateAuthorOperabilityCampaignPreparation(preparationValue)) throw new Error('OPERABILITY_PREPARATION_INVALID');
  const campaign = preparationValue;
  const environment = dependencies.environment ?? process.env;
  const codexHome = environment.SKILL_EVIDENCE_AUTHOR_CODEX_HOME ?? '';
  const currentCommit = dependencies.currentCommit ?? (async () => await commandOutput('git', ['rev-parse', 'HEAD'], repositoryRoot));
  const workingTreeClean =
    dependencies.workingTreeClean ?? (async () => (await commandOutput('git', ['status', '--porcelain'], repositoryRoot)) === '');
  const upstreamAligned =
    dependencies.upstreamAligned ??
    (async () => (await commandOutput('git', ['rev-parse', '@{u}'], repositoryRoot)) === (await currentCommit()));
  const getPackageVersion = dependencies.packageVersion ?? (async (name) => await packageVersion(repositoryRoot, name));
  const getPathExists = dependencies.pathExists ?? pathExists;
  const getPathWritable = dependencies.pathWritable ?? pathWritable;
  const inspected = await inspectAuthorOperabilityCampaign(repositoryRoot, campaign);
  const commit = await currentCommit();
  const localQualificationResult = await (dependencies.localQualification?.() ??
    localQualification(repositoryRoot).catch(() => 'BLOCKED' as const));
  const terminalReceiptPath = campaign.reservationPath.replace(/\.json$/u, '.terminal.json');
  const [clean, aligned, npm, promptfoo, codexSdk, codexCli, login, reservationExists, receiptExists, outputExists] = await Promise.all([
    workingTreeClean(),
    upstreamAligned(),
    dependencies.npmVersion?.() ?? commandOutput('npm', ['--version'], repositoryRoot),
    getPackageVersion('promptfoo'),
    getPackageVersion('@openai/codex-sdk'),
    dependencies.codexCliVersion?.() ??
      commandOutput(resolve(repositoryRoot, 'node_modules/.bin/codex'), ['--version'], repositoryRoot).then((value) =>
        value.replace(/^codex-cli\s+/u, ''),
      ),
    dependencies.loginStatus?.(codexHome) ??
      execFileAsync(resolve(repositoryRoot, 'node_modules/.bin/codex'), ['login', 'status'], {
        cwd: repositoryRoot,
        env: { ...environment, CODEX_HOME: codexHome },
      }).then(
        () => true,
        () => false,
      ),
    getPathExists(resolve(repositoryRoot, campaign.reservationPath)),
    getPathExists(resolve(repositoryRoot, terminalReceiptPath)),
    getPathExists(resolve(repositoryRoot, campaign.outputDirectory)),
  ]);
  return evaluateAuthorOperabilityPreflight(campaign, {
    authentication: {
      codexHome,
      homeWritable: await getPathWritable(codexHome),
      loginStatus: login ? 'AUTHENTICATED' : 'UNAVAILABLE',
    },
    credentialVariablesAbsent: environment.OPENAI_API_KEY === undefined && environment.CODEX_API_KEY === undefined,
    currentCommit: commit,
    derivedFingerprints: inspected.fingerprints,
    environment: {
      codexCliVersion: codexCli,
      codexSdkVersion: codexSdk,
      nodeVersion: dependencies.nodeVersion?.() ?? process.versions.node,
      npmVersion: npm,
      promptfooVersion: promptfoo,
    },
    expectedCommit: parsed.expectedCommit,
    invocationConfigurationValid: inspected.invocationConfigurationValid,
    localQualificationResult,
    outputExists,
    packetBlind: inspected.packetBlind,
    reservationExists,
    terminalReceiptExists: receiptExists,
    upstreamAligned: aligned,
    worktreeClean: clean,
  });
}

export function renderAuthorOperabilityPreflight(report: AuthorOperabilityPreflightReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  try {
    const report = await runAuthorOperabilityPreflight(process.argv.slice(2));
    process.stdout.write(renderAuthorOperabilityPreflight(report));
    process.exitCode = report.result === 'READY_FOR_AUTHORIZATION' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'OPERABILITY_PREFLIGHT_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
