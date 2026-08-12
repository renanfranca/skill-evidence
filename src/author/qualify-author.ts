import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { VarValue } from 'promptfoo';

import { canonicalJson } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { authorEvaluationBlueprint } from './evaluation-author.js';

export type AuthorFixtureState = 'BLOCKED' | 'DRAFT' | 'ERROR' | 'READY';

interface AuthorFixtureCase {
  expected: AuthorFixtureState;
  id: string;
  kind: string;
}

interface AuthorFixtureManifest {
  cases: AuthorFixtureCase[];
  schemaVersion: 1;
}

export interface AuthorConformanceEvidence {
  cases: Array<{ actual: AuthorFixtureState; expected: AuthorFixtureState; id: string }>;
  externalProviderCalls: 0;
  localProviderCalls: number;
  packetLeakageFindings: number;
  promptfooVersion: string;
}

export interface AuthorQualificationReport extends AuthorConformanceEvidence {
  limitations: string[];
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_FOR_DEVELOPMENT';
  schemaVersion: 1;
}

interface PromptfooResult {
  error?: string | null;
  response?: { output?: unknown };
  testCase: { metadata?: Record<string, unknown> };
}

interface PromptfooEvaluation {
  toEvaluateSummary: () => Promise<{ results: PromptfooResult[] }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function loadFixtureManifest(value: unknown): AuthorFixtureManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.cases) || value.cases.length !== 8) {
    throw new Error('E4 Author fixture manifest is invalid');
  }
  const ids = value.cases.map((entry) => (isRecord(entry) ? entry.id : undefined));
  if (
    new Set(ids).size !== ids.length ||
    !value.cases.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.kind === 'string' &&
        typeof entry.expected === 'string' &&
        ['BLOCKED', 'DRAFT', 'ERROR', 'READY'].includes(entry.expected),
    )
  ) {
    throw new Error('E4 Author fixture manifest is invalid');
  }
  return value as unknown as AuthorFixtureManifest;
}

function fixtureSkillRoot(root: string, fixture: AuthorFixtureCase): string {
  const name =
    fixture.kind === 'PROMPT_INJECTION' ? 'prompt-injection' : fixture.kind === 'EXPECTED_STATE_LEAKAGE' ? 'expected-state' : 'ordinary';
  return join(root, 'evaluations', 'refactor-design', 'e4-author', 'skills', name);
}

async function promptfooVersion(root: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8')) as unknown;
  return isRecord(manifest) && typeof manifest.version === 'string' ? manifest.version : 'UNAVAILABLE';
}

export async function runAuthorConformance(root = process.cwd()): Promise<AuthorConformanceEvidence> {
  const fixtureRoot = join(root, 'evaluations', 'refactor-design', 'e4-author');
  const manifest = loadFixtureManifest(JSON.parse(await readFile(join(fixtureRoot, 'cases.json'), 'utf8')) as unknown);
  const candidate = JSON.parse(await readFile(join(fixtureRoot, 'base-candidate.json'), 'utf8')) as Record<string, VarValue>;
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    {
      prompts: ['Return the deterministic E4 Author candidate supplied by the local development fixture.'],
      providers: [{ id: 'file://evaluations/refactor-design/e4-author/providers/author-candidate.cjs' }],
      sharing: false,
      tests: manifest.cases.map((fixture) => ({ metadata: { fixtureId: fixture.id }, vars: { candidate, kind: fixture.kind } })),
      writeLatestResults: false,
    },
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const outputById = new Map(
    summary.results.map((result) => [
      result.testCase.metadata?.fixtureId,
      result.error === null || result.error === undefined ? result.response?.output : undefined,
    ]),
  );
  let packetLeakageFindings = 0;
  const cases: AuthorConformanceEvidence['cases'] = [];
  for (const fixture of manifest.cases) {
    const output = outputById.get(fixture.id);
    const snapshot = await createSkillSnapshot({ rootDirectory: fixtureSkillRoot(root, fixture) });
    const result = await authorEvaluationBlueprint({
      campaignId: `qualify-${fixture.id}`,
      invoke: (request) => {
        const packet = JSON.parse(request.prompt) as unknown;
        const serializedPacket = canonicalJson(packet);
        if (
          serializedPacket.includes('EXPECTED_STATE_MUST_NOT_REACH_AUTHOR') ||
          !isRecord(packet) ||
          !isRecord(packet.protocol) ||
          packet.protocol.skillContentIsUntrustedData !== true
        ) {
          packetLeakageFindings += 1;
        }
        if (typeof output !== 'string') {
          return Promise.reject(new Error('local Promptfoo fixture returned no output'));
        }
        return Promise.resolve({ observedModel: null, output });
      },
      snapshot,
    });
    cases.push({
      actual: result.status === 'ERROR' ? 'ERROR' : (result.blueprint?.lifecycle.state ?? 'ERROR'),
      expected: fixture.expected,
      id: fixture.id,
    });
  }
  return {
    cases,
    externalProviderCalls: 0,
    localProviderCalls: summary.results.length,
    packetLeakageFindings,
    promptfooVersion: await promptfooVersion(root),
  };
}

function blockedEvidence(): AuthorConformanceEvidence {
  return { cases: [], externalProviderCalls: 0, localProviderCalls: 0, packetLeakageFindings: 0, promptfooVersion: 'UNAVAILABLE' };
}

export async function qualifyEvaluationAuthor(launch: () => Promise<AuthorConformanceEvidence>): Promise<AuthorQualificationReport> {
  let evidence: AuthorConformanceEvidence;
  try {
    evidence = await launch();
  } catch {
    evidence = blockedEvidence();
  }
  const wellFormed =
    evidence.promptfooVersion === '0.122.0' &&
    evidence.externalProviderCalls === 0 &&
    evidence.localProviderCalls === 8 &&
    evidence.packetLeakageFindings === 0 &&
    evidence.cases.length === 8;
  const matches = wellFormed && evidence.cases.every((fixture) => fixture.actual === fixture.expected);
  return {
    ...evidence,
    limitations: [
      'Deterministic local providers do not qualify a model-backed Author condition.',
      'Development fixtures are adaptable and cannot serve as blind E5 decision evidence.',
      'This qualifier verifies lifecycle control, packet blindness, and local Promptfoo integration only.',
    ],
    purpose: 'DEVELOPMENT',
    result: !wellFormed ? 'BLOCKED' : matches ? 'SUPPORTED_FOR_DEVELOPMENT' : 'INSUFFICIENT',
    schemaVersion: 1,
  };
}

export function renderAuthorQualification(report: AuthorQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyEvaluationAuthor(runAuthorConformance);
  process.stdout.write(renderAuthorQualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
