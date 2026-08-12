import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import {
  runAuthorBenchmarkCampaign,
  AuthorBenchmarkRunnerError,
  type AuthorBenchmarkCollection,
  type AuthorBenchmarkRunnerDependencies,
} from './author-benchmark-runner.js';
import { validateAuthorBenchmarkCampaignPreparation } from './author-benchmark-preflight.js';
import { validateAuthorBenchmarkBundle, type AuthorBenchmarkBundleCandidate } from './author-benchmark.js';
import { runAuthorBenchmarkCampaignPreflight, type AuthorBenchmarkPreflightDependencies } from './preflight-author-benchmark.js';

interface AuthorBenchmarkCommandArguments {
  approval: string;
  bundle: string;
  campaign: string;
  expectedCommit: string;
  preparation: string;
}

export interface AuthorBenchmarkCommandDependencies {
  environment?: NodeJS.ProcessEnv;
  preflight?: AuthorBenchmarkPreflightDependencies;
  repositoryRoot?: string;
  runner?: AuthorBenchmarkRunnerDependencies;
}

function parseArguments(args: string[]): AuthorBenchmarkCommandArguments {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const parsed = {
    approval: value('--approve-provider-invocations'),
    bundle: value('--bundle'),
    campaign: value('--campaign'),
    expectedCommit: value('--expected-commit'),
    preparation: value('--preparation'),
  };
  if (
    args.length !== 10 ||
    parsed.approval === undefined ||
    parsed.bundle === undefined ||
    parsed.campaign === undefined ||
    parsed.expectedCommit === undefined ||
    !/^[a-f0-9]{40}$/.test(parsed.expectedCommit) ||
    parsed.preparation === undefined
  ) {
    throw new AuthorBenchmarkRunnerError(
      'BENCHMARK_ARGUMENT_INVALID',
      'benchmark collection requires --bundle, --preparation, --campaign, --expected-commit, and --approve-provider-invocations',
    );
  }
  return parsed as AuthorBenchmarkCommandArguments;
}

export async function runAuthorBenchmarkCommand(
  args: string[],
  dependencies: AuthorBenchmarkCommandDependencies = {},
): Promise<AuthorBenchmarkCollection> {
  const parsed = parseArguments(args);
  const repositoryRoot = dependencies.repositoryRoot ?? process.cwd();
  const environment = dependencies.environment ?? process.env;
  const bundleDirectory = resolve(parsed.bundle);
  const preparationPath = resolve(parsed.preparation);
  const [bundleValue, preparationValue] = await Promise.all([
    readFile(resolve(bundleDirectory, 'bundle.json'), 'utf8').then((value) => JSON.parse(value) as unknown),
    readFile(preparationPath, 'utf8').then((value) => JSON.parse(value) as unknown),
  ]);
  const campaignValidation = validateAuthorBenchmarkCampaignPreparation(preparationValue);
  const bundleValidation = validateAuthorBenchmarkBundle(bundleValue);
  if (!campaignValidation.valid || !bundleValidation.valid || parsed.campaign !== campaignValidation.campaign.campaignId) {
    throw new AuthorBenchmarkRunnerError('BENCHMARK_ARGUMENT_INVALID', 'benchmark bundle, preparation, or campaign is invalid');
  }
  const preflight = await runAuthorBenchmarkCampaignPreflight(
    ['--bundle', bundleDirectory, '--preparation', preparationPath, '--expected-commit', parsed.expectedCommit],
    { ...dependencies.preflight, repositoryRoot, environment },
  );
  return await runAuthorBenchmarkCampaign(
    {
      approval: parsed.approval,
      bundle: bundleValue as AuthorBenchmarkBundleCandidate,
      bundleDirectory,
      campaign: campaignValidation.campaign,
      codexHome: environment.SKILL_EVIDENCE_AUTHOR_CODEX_HOME ?? '',
      expectedCommit: parsed.expectedCommit,
      preflight,
      repositoryRoot,
    },
    dependencies.runner,
  );
}

export function renderAuthorBenchmarkCommandError(error: unknown): string {
  return canonicalJson({
    code: error instanceof AuthorBenchmarkRunnerError ? error.code : 'BENCHMARK_UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : 'benchmark collection failed',
    status: 'ERROR',
  });
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${canonicalJson(await runAuthorBenchmarkCommand(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${renderAuthorBenchmarkCommandError(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
