import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { authorEvaluationBlueprint, type AuthorRunResult } from './evaluation-author.js';
import { createPromptfooAuthorInvoker } from './promptfoo-author-invoker.js';
import { createCodexObservationSession } from './provider-observation.js';

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

const observationScenarios = [
  {
    expected: 'ERROR:PROMPTFOO_STEP:false:true:true:PROCESS_EXIT',
    fixture: 'observation-no-progress',
    id: 'observation-no-progress-timeout',
    timeouts: { maxEvalTimeMs: 3_000, timeoutMs: 1_000 },
  },
  {
    expected: 'ERROR:PROMPTFOO_STEP:true:true:true:PROCESS_EXIT',
    fixture: 'observation-progress-timeout',
    id: 'observation-progress-timeout',
    timeouts: { maxEvalTimeMs: 3_000, timeoutMs: 1_000 },
  },
  {
    expected: 'ERROR:UNKNOWN:false:false:false:PROCESS_EXIT',
    fixture: 'observation-no-progress',
    id: 'observation-evaluation-timeout-unresolved',
    timeouts: { maxEvalTimeMs: 1_000, timeoutMs: 3_000 },
  },
  {
    expected: 'ERROR:CODEX_TURN:true:false:false:TURN_FAILED',
    fixture: 'observation-turn-timeout',
    id: 'observation-codex-turn-timeout',
    timeouts: { maxEvalTimeMs: 3_000, timeoutMs: 2_000 },
  },
  {
    expected: 'ERROR:NONE:true:false:false:PROCESS_EXIT',
    fixture: 'observation-process-after-progress',
    id: 'observation-process-termination',
    timeouts: { maxEvalTimeMs: 3_000, timeoutMs: 2_000 },
  },
  {
    expected: 'COMPLETED:NONE:true:false:false:TURN_COMPLETED',
    fixture: 'observation-complete',
    id: 'observation-completion',
    timeouts: { maxEvalTimeMs: 3_000, timeoutMs: 2_000 },
  },
] as const;

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

function projectObservation(result: AuthorRunResult): ProviderBoundaryActual {
  const observation = result.providerObservation;
  if (observation === undefined) return 'OBSERVATION_MISSING';
  return [
    result.status,
    observation.timeoutOwner ?? 'NONE',
    String(observation.progressObserved),
    String(observation.cancellationRequested),
    String(observation.cancellationObserved),
    observation.lastObservedStage,
  ].join(':');
}

function limitations(): string[] {
  return [
    'The local executable opens no network connection and does not prove live provider availability.',
    'Synthetic failures qualify bounded diagnostic projection, not their equivalence to an account-specific provider failure.',
    'The opt-in proxy records event types and relative times only; it perturbs the process boundary and cannot prove remote cancellation.',
    'Promptfoo global timeout remains UNKNOWN when its provider-abort result wins before max-duration projection.',
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
    for (const scenario of observationScenarios) {
      const observationDirectory = join(temporaryRoot, scenario.id);
      await mkdir(observationDirectory);
      const observation = await createCodexObservationSession({
        codexExecutable: fakeExecutable,
        directory: observationDirectory,
        environment: {
          SKILL_EVIDENCE_FAKE_CODEX_LEDGER: ledger,
          SKILL_EVIDENCE_FAKE_CODEX_OUTPUT: candidate,
          SKILL_EVIDENCE_FAKE_CODEX_SCENARIO: scenario.fixture,
        },
      });
      const invoke = createPromptfooAuthorInvoker({
        codexHome,
        observation,
        timeouts: scenario.timeouts,
        workingDirectory: workspace,
      });
      const result = await authorEvaluationBlueprint({
        campaignId: `qualify-provider-${scenario.id}`,
        condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
        invoke,
        protocolVersion: 2,
        snapshot,
      });
      cases.push({ actual: projectObservation(result), expected: scenario.expected, id: scenario.id });
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
  const expectedCount = scenarios.length + observationScenarios.length;
  const wellFormed = promptfooVersion === '0.122.0' && codexSdkVersion === '0.147.0' && localProcessCalls === expectedCount;
  const matches = wellFormed && cases.length === expectedCount && cases.every((entry) => entry.actual === entry.expected);
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
