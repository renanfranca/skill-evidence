import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { authorEvaluationBlueprint, type AuthorRunResult } from './evaluation-author.js';
import { createPromptfooAuthorInvoker } from './promptfoo-author-invoker.js';

type ProviderBoundaryActual = string;

interface ProviderBoundaryCase {
  actual: ProviderBoundaryActual;
  expected: string;
  id: string;
}

export interface AuthorProviderBoundaryReport {
  cases: ProviderBoundaryCase[];
  codexSdkVersion: string;
  externalProviderCalls: 0;
  limitations: string[];
  localProcessCalls: number;
  promptfooVersion: string;
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_FOR_DEVELOPMENT';
  schemaVersion: 1;
}

const scenarios: Array<{ expected: ProviderBoundaryCase['expected']; id: string }> = [
  { expected: 'READY', id: 'success' },
  { expected: 'RESULT:MODEL_ACCESS:HTTP_404', id: 'model-access' },
  { expected: 'RESULT:AUTHENTICATION:HTTP_401', id: 'authentication' },
  { expected: 'RESULT:RATE_LIMIT:UNCLASSIFIED', id: 'rate-limit' },
  { expected: 'RESULT:TIMEOUT:ABORTED', id: 'timeout' },
  { expected: 'RESULT:PROCESS:EXIT_NONZERO', id: 'process' },
];

async function packageVersion(root: string, packageName: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(root, 'node_modules', packageName, 'package.json'), 'utf8')) as unknown;
  if (manifest !== null && typeof manifest === 'object' && 'version' in manifest && typeof manifest.version === 'string') {
    return manifest.version;
  }
  return 'UNAVAILABLE';
}

function projectResult(result: AuthorRunResult): ProviderBoundaryActual {
  if (result.status === 'COMPLETED') {
    return result.blueprint.lifecycle.state === 'READY' ? 'READY' : 'UNEXPECTED';
  }
  if (result.error.code !== 'PROVIDER_ERROR') {
    return 'UNEXPECTED';
  }
  const { category, code, stage } = result.error.diagnostic;
  return `${stage}:${category}:${code}`;
}

function limitations(): string[] {
  return [
    'The local executable opens no network connection and does not prove live provider availability.',
    'Synthetic failures qualify bounded diagnostic projection, not their equivalence to an account-specific provider failure.',
    'This development qualifier does not qualify Author semantics or authorize an E5 decision run.',
  ];
}

export async function qualifyAuthorProviderBoundary(root = process.cwd()): Promise<AuthorProviderBoundaryReport> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-author-provider-'));
  const fakeExecutable = join(temporaryRoot, 'codex');
  const ledger = join(temporaryRoot, 'calls.log');
  const workspace = join(temporaryRoot, 'workspace');
  const codexHome = join(temporaryRoot, 'codex-home');
  const fixtureRoot = join(root, 'evaluations', 'refactor-design', 'e4-author');
  let cases: ProviderBoundaryCase[] = [];
  let localProcessCalls = 0;

  try {
    await Promise.all([
      mkdir(workspace),
      mkdir(codexHome),
      copyFile(join(fixtureRoot, 'providers', 'fake-codex-cli.cjs'), fakeExecutable),
      writeFile(ledger, ''),
    ]);
    await chmod(fakeExecutable, 0o700);
    const candidate = await readFile(join(fixtureRoot, 'base-candidate.json'), 'utf8');
    const snapshot = await createSkillSnapshot({ rootDirectory: join(fixtureRoot, 'skills', 'ordinary') });

    for (const scenario of scenarios) {
      const invoke = createPromptfooAuthorInvoker({
        codexHome,
        localDiagnostic: {
          codexPathOverride: fakeExecutable,
          environment: {
            SKILL_EVIDENCE_FAKE_CODEX_LEDGER: ledger,
            SKILL_EVIDENCE_FAKE_CODEX_OUTPUT: candidate,
            SKILL_EVIDENCE_FAKE_CODEX_SCENARIO: scenario.id,
          },
        },
        workingDirectory: workspace,
      });
      const result = await authorEvaluationBlueprint({ campaignId: `qualify-provider-${scenario.id}`, invoke, snapshot });
      cases.push({ actual: projectResult(result), expected: scenario.expected, id: scenario.id });
    }
    localProcessCalls = (await readFile(ledger, 'utf8')).trim().split('\n').filter(Boolean).length;
  } catch {
    cases = [];
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }

  const [promptfooVersion, codexSdkVersion] = await Promise.all([
    packageVersion(root, 'promptfoo'),
    packageVersion(root, '@openai/codex-sdk'),
  ]);
  const wellFormed = promptfooVersion === '0.122.0' && codexSdkVersion === '0.147.0' && localProcessCalls === scenarios.length;
  const matches = wellFormed && cases.length === scenarios.length && cases.every((entry) => entry.actual === entry.expected);
  return {
    cases,
    codexSdkVersion,
    externalProviderCalls: 0,
    limitations: limitations(),
    localProcessCalls,
    promptfooVersion,
    purpose: 'DEVELOPMENT',
    result: !wellFormed ? 'BLOCKED' : matches ? 'SUPPORTED_FOR_DEVELOPMENT' : 'INSUFFICIENT',
    schemaVersion: 1,
  };
}

export function renderAuthorProviderBoundaryQualification(report: AuthorProviderBoundaryReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyAuthorProviderBoundary();
  process.stdout.write(renderAuthorProviderBoundaryQualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
