import { access, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createPromptfooAuthorInvoker } from '../author/promptfoo-author-invoker.js';
import { canonicalJson } from '../canonical-json.js';
import { runAuthorBenchmarkCommand } from './run-author-benchmark.js';

interface RunnerQualificationCampaign {
  providerInvocations: number;
  status: 'COMPLETE' | 'INSUFFICIENT' | 'INVALIDATED';
  stopReason: string | null;
}

export interface AuthorBenchmarkRunnerQualificationReport {
  campaigns: RunnerQualificationCampaign[];
  diagnostics: string[];
  externalProviderCalls: 0;
  limitations: string[];
  localProcessCalls: number;
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_FOR_DEVELOPMENT';
  schemaVersion: 1;
  workspaceCampaignArtifacts: number;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function qualifyAuthorBenchmarkRunner(root = process.cwd()): Promise<AuthorBenchmarkRunnerQualificationReport> {
  const workspaceArtifactPaths = [
    join(root, '.skill-evidence', 'author-benchmark-reservations', 'e5-author-benchmark-20260811-r1.json'),
    join(root, '.skill-evidence', 'author-benchmark-reservations', 'e5-author-benchmark-20260811-r1.terminal.json'),
    join(root, '.skill-evidence', 'author-benchmark', 'e5-author-benchmark-20260811-r1'),
  ];
  const workspaceArtifactsBefore = await Promise.all(workspaceArtifactPaths.map(exists));
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-e5-runner-'));
  const fakeExecutable = join(temporaryRoot, 'codex');
  const ledger = join(temporaryRoot, 'calls.log');
  const codexHome = join(temporaryRoot, 'codex-home');
  const bundleDirectory = join(root, 'evaluations', 'refactor-design', 'e5-author-benchmark');
  const runnerFixture = join(root, 'evaluations', 'refactor-design', 'e5-author-runner');
  const expectedCommit = 'e'.repeat(40);
  const campaigns: RunnerQualificationCampaign[] = [];
  const diagnostics: string[] = [];
  let localProcessCalls = 0;
  try {
    await Promise.all([mkdir(codexHome), copyFile(join(runnerFixture, 'fake-codex-cli.cjs'), fakeExecutable), writeFile(ledger, '')]);
    await chmod(fakeExecutable, 0o700);
    const candidate = await readFile(join(runnerFixture, 'candidate.json'), 'utf8');
    for (const mode of ['complete', 'authentication-stop', 'rate-limit-stop'] as const) {
      const repositoryRoot = join(temporaryRoot, mode);
      await mkdir(repositoryRoot);
      let sampleIndex = 0;
      const collection = await runAuthorBenchmarkCommand(
        [
          '--bundle',
          bundleDirectory,
          '--preparation',
          join(bundleDirectory, 'campaign-preparation.json'),
          '--campaign',
          'e5-author-benchmark-20260811-r1',
          '--expected-commit',
          expectedCommit,
          '--approve-provider-invocations',
          '16',
        ],
        {
          environment: { SKILL_EVIDENCE_AUTHOR_CODEX_HOME: '/home/renanfranca/.codex' },
          preflight: {
            codexCliVersion: () => Promise.resolve('0.147.0'),
            currentCommit: () => Promise.resolve(expectedCommit),
            npmVersion: () => Promise.resolve('11.13.0'),
            packageVersion: (name) => Promise.resolve(name === 'promptfoo' ? '0.122.0' : '0.147.0'),
            pathExists: () => Promise.resolve(false),
            pathReadable: () => Promise.resolve(true),
            pathWritable: () => Promise.resolve(true),
            workingTreeClean: () => Promise.resolve(true),
          },
          repositoryRoot,
          runner: {
            createInvoker: (workingDirectory) => {
              sampleIndex += 1;
              return createPromptfooAuthorInvoker({
                codexHome,
                localDiagnostic: {
                  codexPathOverride: fakeExecutable,
                  environment: {
                    SKILL_EVIDENCE_E5_RUNNER_LEDGER: ledger,
                    SKILL_EVIDENCE_E5_RUNNER_OUTPUT: candidate,
                    SKILL_EVIDENCE_E5_RUNNER_SCENARIO:
                      sampleIndex !== 1
                        ? 'success'
                        : mode === 'authentication-stop'
                          ? 'authentication'
                          : mode === 'rate-limit-stop'
                            ? 'rate-limit'
                            : 'success',
                  },
                },
                workingDirectory,
              });
            },
            currentCommit: () => Promise.resolve(expectedCommit),
            workingTreeClean: () => Promise.resolve(true),
          },
        },
      );
      campaigns.push({
        providerInvocations: collection.providerInvocations,
        status: collection.status,
        stopReason: collection.stopReason,
      });
    }
    localProcessCalls = (await readFile(ledger, 'utf8')).trim().split('\n').filter(Boolean).length;
  } catch (error) {
    campaigns.length = 0;
    diagnostics.push(error instanceof Error ? error.message.replaceAll(temporaryRoot, '<temporary-root>') : 'RUNNER_QUALIFICATION_FAILED');
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
  const workspaceArtifactsAfter = await Promise.all(workspaceArtifactPaths.map(exists));
  const workspaceCampaignArtifacts = workspaceArtifactsAfter.filter((present, index) => present && !workspaceArtifactsBefore[index]).length;
  const supported =
    campaigns.length === 3 &&
    campaigns[0]?.status === 'COMPLETE' &&
    campaigns[0].providerInvocations === 16 &&
    campaigns[1]?.status === 'INSUFFICIENT' &&
    campaigns[1].providerInvocations === 1 &&
    campaigns[1].stopReason === 'GLOBAL_AUTHENTICATION' &&
    campaigns[2]?.status === 'INSUFFICIENT' &&
    campaigns[2].providerInvocations === 1 &&
    campaigns[2].stopReason === 'GLOBAL_RATE_LIMIT' &&
    localProcessCalls === 18 &&
    workspaceCampaignArtifacts === 0;
  return {
    campaigns,
    diagnostics,
    externalProviderCalls: 0,
    limitations: [
      'The deterministic local executable opens no network connection and does not prove live provider availability.',
      'Runner qualification proves orchestration and terminal policy, not either Author condition quality.',
      'No real campaign reservation or benchmark output is created or changed.',
    ],
    localProcessCalls,
    purpose: 'DEVELOPMENT',
    result: supported ? 'SUPPORTED_FOR_DEVELOPMENT' : campaigns.length === 0 ? 'BLOCKED' : 'INSUFFICIENT',
    schemaVersion: 1,
    workspaceCampaignArtifacts,
  };
}

export function renderAuthorBenchmarkRunnerQualification(report: AuthorBenchmarkRunnerQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyAuthorBenchmarkRunner();
  process.stdout.write(renderAuthorBenchmarkRunnerQualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
