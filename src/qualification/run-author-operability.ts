import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createPromptfooAuthorInvoker } from '../author/promptfoo-author-invoker.js';
import { createCodexObservationSession } from '../author/provider-observation.js';
import { canonicalJson } from '../canonical-json.js';
import {
  runAuthorOperabilityCampaign,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorOperabilityRunResult,
} from './author-operability.js';
import { runAuthorOperabilityPreflight, type AuthorOperabilityPreflightDependencies } from './preflight-author-operability.js';

interface CommandArguments {
  approval: string;
  expectedCommit: string;
  preparationPath: string;
}

export interface AuthorOperabilityCommandDependencies {
  currentCommit?: () => Promise<string>;
  environment?: NodeJS.ProcessEnv;
  preflight?: AuthorOperabilityPreflightDependencies;
  repositoryRoot?: string;
  workingTreeClean?: () => Promise<boolean>;
}

function parseArguments(args: string[]): CommandArguments {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const approval = value('--approve-provider-invocations');
  const expectedCommit = value('--expected-commit');
  const preparationPath = value('--preparation');
  if (
    args.length !== 6 ||
    approval === undefined ||
    expectedCommit === undefined ||
    preparationPath === undefined ||
    !/^[a-f0-9]{40}$/u.test(expectedCommit)
  ) {
    throw new Error('USAGE: --preparation <campaign-preparation.json> --expected-commit <40-char-sha> --approve-provider-invocations 1');
  }
  return { approval, expectedCommit, preparationPath };
}

export async function runAuthorOperabilityCommand(
  args: string[],
  dependencies: AuthorOperabilityCommandDependencies = {},
): Promise<AuthorOperabilityRunResult> {
  const parsed = parseArguments(args);
  if (parsed.approval !== '1') throw new Error('OPERABILITY_APPROVAL_REQUIRED');
  const repositoryRoot = dependencies.repositoryRoot ?? process.cwd();
  const environment = dependencies.environment ?? process.env;
  const preparationValue = JSON.parse(await readFile(resolve(repositoryRoot, parsed.preparationPath), 'utf8')) as unknown;
  if (!validateAuthorOperabilityCampaignPreparation(preparationValue)) throw new Error('OPERABILITY_PREPARATION_INVALID');
  const campaign = preparationValue;
  const preflight = await runAuthorOperabilityPreflight(
    ['--preparation', parsed.preparationPath, '--expected-commit', parsed.expectedCommit],
    { ...dependencies.preflight, environment, repositoryRoot },
  );
  if (preflight.result !== 'READY_FOR_AUTHORIZATION') throw new Error('OPERABILITY_PREFLIGHT_BLOCKED');
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-author-operability-live-'));
  try {
    const observation = await createCodexObservationSession({
      codexExecutable: resolve(repositoryRoot, 'node_modules/.bin/codex'),
      directory: temporaryRoot,
    });
    const codexHome = environment.SKILL_EVIDENCE_AUTHOR_CODEX_HOME;
    if (codexHome === undefined) throw new Error('OPERABILITY_AUTH_INVALID');
    return await runAuthorOperabilityCampaign({
      approval: parsed.approval,
      currentCommit:
        dependencies.currentCommit ??
        (async () => {
          const { execFile } = await import('node:child_process');
          const { promisify } = await import('node:util');
          return (await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim();
        }),
      expectedCommit: parsed.expectedCommit,
      invoke: createPromptfooAuthorInvoker({
        codexHome,
        observation,
        timeouts: campaign.timeouts,
        workingDirectory: temporaryRoot,
      }),
      preflight,
      preparation: campaign,
      repositoryRoot,
      workingTreeClean:
        dependencies.workingTreeClean ??
        (async () => {
          const { execFile } = await import('node:child_process');
          const { promisify } = await import('node:util');
          return (
            (await promisify(execFile)('git', ['status', '--porcelain'], { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim() === ''
          );
        }),
    });
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

async function main(): Promise<void> {
  try {
    const result = await runAuthorOperabilityCommand(process.argv.slice(2));
    process.stdout.write(`${canonicalJson(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'OPERABILITY_CANARY_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
