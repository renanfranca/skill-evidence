import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson, sha256 } from './canonical.js';
import { withPromptfooIsolation } from './isolation.js';
import type { VarValue } from 'promptfoo';
import type {
  ArchaeologicalDisposition,
  ArchaeologicalOwner,
  ArchaeologicalRuleResult,
  ArchaeologicalWorkerEvidence,
} from './qualify-archaeological.js';

interface FixtureObservation {
  expected: ArchaeologicalDisposition;
  id: string;
  input: Record<string, VarValue>;
}

interface FixtureRule {
  id: ArchaeologicalRuleResult['id'];
  observations: FixtureObservation[];
  owner: ArchaeologicalOwner | ArchaeologicalOwner[];
}

interface FixtureManifest {
  rules: FixtureRule[];
  schemaVersion: 1;
}

const fixtureRuleIds: FixtureRule['id'][] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const fixtureDispositions: ArchaeologicalDisposition[] = ['BLOCKED', 'FAIL', 'INCONCLUSIVE', 'PASS'];
const fixtureOwners: ArchaeologicalOwner[] = [
  'PROMPTFOO_ASSERTION',
  'PROMPTFOO_GRADER',
  'PROMPTFOO_SCORING',
  'SKILL_EVIDENCE_INPUT_PROJECTION',
  'SKILL_EVIDENCE_NORMALIZATION',
  'SKILL_EVIDENCE_PREFLIGHT',
];
const executionProviderPath = 'file://evaluations/refactor-design/archaeological/providers/execution.cjs';
const semanticGraderPath = 'file://evaluations/refactor-design/archaeological/providers/semantic-grader.cjs';
const blindGraderPath = 'file://evaluations/refactor-design/archaeological/providers/blind-grader.cjs';

interface PromptfooResult {
  gradingResult?: {
    componentResults?: Array<{ metadata?: Record<string, unknown> }>;
  } | null;
  success: boolean;
  testCase: { metadata?: Record<string, unknown> };
}

interface PromptfooSummary {
  results: PromptfooResult[];
}

interface PromptfooEvaluation {
  toEvaluateSummary: () => Promise<PromptfooSummary>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertJsonValue(value: unknown, seen: Set<object>): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return;
  }
  if (typeof value !== 'object') {
    throw new Error('Promptfoo configuration is not JSON-serializable');
  }
  if (seen.has(value)) {
    throw new Error('Promptfoo configuration is not JSON-serializable');
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => assertJsonValue(item, seen));
  } else {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Promptfoo configuration is not JSON-serializable');
    }
    Object.values(value).forEach((item) => assertJsonValue(item, seen));
  }
  seen.delete(value);
}

export function jsonPromptfooConfiguration<T>(configuration: T): T {
  assertJsonValue(configuration, new Set());
  return JSON.parse(canonicalJson(configuration)) as T;
}

function executionProvider(output: 'message' | 'observable' | 'observation' | 'vars', serialization: 'json' | 'plain' = 'json') {
  return { config: { output, serialization }, id: executionProviderPath };
}

function loadManifest(value: unknown): FixtureManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.rules) || value.rules.length !== fixtureRuleIds.length) {
    throw new Error('archaeological fixture manifest is invalid');
  }
  const valid = value.rules.every((rule, ruleIndex) => {
    if (!isRecord(rule) || rule.id !== fixtureRuleIds[ruleIndex] || !Array.isArray(rule.observations) || rule.observations.length < 2) {
      return false;
    }
    const ownerValid =
      (typeof rule.owner === 'string' && fixtureOwners.includes(rule.owner as ArchaeologicalOwner)) ||
      (Array.isArray(rule.owner) &&
        rule.owner.length > 0 &&
        rule.owner.every((owner) => typeof owner === 'string' && fixtureOwners.includes(owner as ArchaeologicalOwner)));
    const observationIds = rule.observations.map((observation) => (isRecord(observation) ? observation.id : undefined));
    return (
      ownerValid &&
      new Set(observationIds).size === observationIds.length &&
      rule.observations.every(
        (observation) =>
          isRecord(observation) &&
          typeof observation.id === 'string' &&
          observation.id.length > 0 &&
          typeof observation.expected === 'string' &&
          fixtureDispositions.includes(observation.expected as ArchaeologicalDisposition) &&
          isRecord(observation.input),
      )
    );
  });
  if (!valid) {
    throw new Error('archaeological fixture manifest is invalid');
  }
  return value as unknown as FixtureManifest;
}

async function packageVersion(root: string): Promise<string> {
  const value: unknown = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8'));
  if (value === null || typeof value !== 'object' || typeof (value as Record<string, unknown>).version !== 'string') {
    throw new Error('Promptfoo package version is unavailable');
  }
  return (value as { version: string }).version;
}

async function executeR1(rule: FixtureRule): Promise<{ calls: number; rule: ArchaeologicalRuleResult }> {
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    jsonPromptfooConfiguration({
      prompts: ['Evaluate structured archaeological evidence.'],
      providers: [executionProvider('observation')],
      sharing: false,
      tests: rule.observations.map((observation) => ({
        assert: [
          {
            metric: 'path-role',
            type: 'javascript',
            value: 'file://evaluations/refactor-design/archaeological/assertions/path-role.cjs',
          },
        ],
        metadata: { observationId: observation.id },
        vars: { observation: observation.input },
      })),
      writeLatestResults: false,
    }),
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const actual = new Map(
    summary.results.map((result) => [result.testCase.metadata?.observationId, result.success ? ('PASS' as const) : ('FAIL' as const)]),
  );
  return {
    calls: summary.results.length,
    rule: {
      id: rule.id,
      observations: rule.observations.map((observation) => ({
        actual: actual.get(observation.id) ?? 'BLOCKED',
        expected: observation.expected,
        id: observation.id,
      })),
      owner: rule.owner,
    },
  };
}

function structuredDisposition(result: PromptfooResult): ArchaeologicalDisposition {
  const disposition = result.gradingResult?.componentResults?.[0]?.metadata?.skillEvidenceDisposition;
  if (disposition === 'BLOCKED' || disposition === 'FAIL' || disposition === 'INCONCLUSIVE' || disposition === 'PASS') {
    return disposition;
  }
  return 'BLOCKED';
}

async function executePreflightNormalizedRule(
  rule: FixtureRule,
  prompt: string,
  metric: string,
  assertionPath: string,
): Promise<{ calls: number; rule: ArchaeologicalRuleResult }> {
  const eligible = rule.observations.filter((observation) => observation.input.capabilityEligible === true);
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    jsonPromptfooConfiguration({
      prompts: [prompt],
      providers: [executionProvider('vars')],
      sharing: false,
      tests: eligible.map((observation) => ({
        assert: [
          {
            metric,
            type: 'javascript',
            value: assertionPath,
          },
        ],
        metadata: { observationId: observation.id },
        vars: observation.input,
      })),
      writeLatestResults: false,
    }),
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const actual = new Map(summary.results.map((result) => [result.testCase.metadata?.observationId, structuredDisposition(result)]));
  return {
    calls: summary.results.length,
    rule: {
      id: rule.id,
      observations: rule.observations.map((observation) => ({
        actual: observation.input.capabilityEligible === false ? 'BLOCKED' : (actual.get(observation.id) ?? 'BLOCKED'),
        expected: observation.expected,
        id: observation.id,
      })),
      owner: rule.owner,
    },
  };
}

async function executeR3(rule: FixtureRule): Promise<{ executionCalls: number; graderCalls: number; rule: ArchaeologicalRuleResult }> {
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    jsonPromptfooConfiguration({
      prompts: ['Report the supplied conclusion.'],
      providers: [executionProvider('message', 'plain')],
      sharing: false,
      tests: rule.observations.map((observation) => ({
        assert: [
          {
            provider: semanticGraderPath,
            type: 'llm-rubric',
            value: 'Accept a conclusion whose meaning is that restructuring was unwarranted by the observed behavior; reject the opposite.',
          },
        ],
        metadata: { observationId: observation.id },
        vars: observation.input,
      })),
      writeLatestResults: false,
    }),
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const actual = new Map(
    summary.results.map((result) => [result.testCase.metadata?.observationId, result.success ? ('PASS' as const) : ('FAIL' as const)]),
  );
  return {
    executionCalls: summary.results.length,
    graderCalls: summary.results.length,
    rule: {
      id: rule.id,
      observations: rule.observations.map((observation) => ({
        actual: actual.get(observation.id) ?? 'BLOCKED',
        expected: observation.expected,
        id: observation.id,
      })),
      owner: rule.owner,
    },
  };
}

async function executeR4(rule: FixtureRule): Promise<{ executionCalls: number; graderCalls: number; rule: ArchaeologicalRuleResult }> {
  const eligible = rule.observations.filter((observation) => observation.input.idSource === 'observable');
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    jsonPromptfooConfiguration({
      prompts: ['Project the observable qualification packet.'],
      providers: [executionProvider('observable')],
      sharing: false,
      tests: eligible.map((observation) => {
        const observable = observation.input.observable;
        if (observable === undefined) {
          throw new Error('observable archaeological evidence is missing');
        }
        return {
          assert: [
            {
              provider: blindGraderPath,
              type: 'llm-rubric',
              value: 'Classify the observable packet against the supplied evidence rule.',
            },
          ],
          metadata: { observationId: observation.id },
          vars: { observable, packetId: `probe-${sha256(observable)}` },
        };
      }),
      writeLatestResults: false,
    }),
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const actual = new Map(
    summary.results.map((result) => [result.testCase.metadata?.observationId, result.success ? ('PASS' as const) : ('FAIL' as const)]),
  );
  return {
    executionCalls: summary.results.length,
    graderCalls: summary.results.length,
    rule: {
      id: rule.id,
      observations: rule.observations.map((observation) => ({
        actual: observation.input.idSource === 'observable' ? (actual.get(observation.id) ?? 'BLOCKED') : 'FAIL',
        expected: observation.expected,
        id: observation.id,
      })),
      owner: rule.owner,
    },
  };
}

async function executeR6(rule: FixtureRule): Promise<{ calls: number; rule: ArchaeologicalRuleResult }> {
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    jsonPromptfooConfiguration({
      prompts: ['Evaluate structured direct and semantic evidence.'],
      providers: [executionProvider('vars')],
      sharing: false,
      tests: rule.observations.map((observation) => ({
        assert: [
          {
            metric: 'semantic',
            type: 'javascript',
            value: 'file://evaluations/refactor-design/archaeological/assertions/semantic-satisfaction.cjs',
          },
          {
            metric: 'direct-critical',
            type: 'javascript',
            value: 'file://evaluations/refactor-design/archaeological/assertions/direct-critical.cjs',
          },
        ],
        assertScoringFunction: 'file://evaluations/refactor-design/archaeological/assertions/critical-precedence.cjs',
        metadata: { observationId: observation.id },
        vars: observation.input,
      })),
      writeLatestResults: false,
    }),
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const actual = new Map(
    summary.results.map((result) => [result.testCase.metadata?.observationId, result.success ? ('PASS' as const) : ('FAIL' as const)]),
  );
  return {
    calls: summary.results.length,
    rule: {
      id: rule.id,
      observations: rule.observations.map((observation) => ({
        actual: actual.get(observation.id) ?? 'BLOCKED',
        expected: observation.expected,
        id: observation.id,
      })),
      owner: rule.owner,
    },
  };
}

export async function runArchaeologicalConformance(root = process.cwd()): Promise<ArchaeologicalWorkerEvidence> {
  const manifest = loadManifest(
    JSON.parse(await readFile(join(root, 'evaluations', 'refactor-design', 'archaeological', 'cases.json'), 'utf8')) as unknown,
  );
  const [r1, r2, r3, r4, r5, r6] = manifest.rules;
  if (r1 === undefined || r2 === undefined || r3 === undefined || r4 === undefined || r5 === undefined || r6 === undefined) {
    throw new Error('required archaeological fixture is missing');
  }
  const evidence = await withPromptfooIsolation(async () => {
    const r1Result = await executeR1(r1);
    const r2Result = await executePreflightNormalizedRule(
      r2,
      'Evaluate relevant event coverage.',
      'relevant-event',
      'file://evaluations/refactor-design/archaeological/assertions/relevant-event.cjs',
    );
    const r3Result = await executeR3(r3);
    const r4Result = await executeR4(r4);
    const r5Result = await executePreflightNormalizedRule(
      r5,
      'Evaluate required evidence availability.',
      'missing-evidence',
      'file://evaluations/refactor-design/archaeological/assertions/missing-evidence.cjs',
    );
    const r6Result = await executeR6(r6);
    return {
      executionProviderCalls:
        r1Result.calls + r2Result.calls + r3Result.executionCalls + r4Result.executionCalls + r5Result.calls + r6Result.calls,
      graderCalls: r3Result.graderCalls + r4Result.graderCalls,
      rules: [r1Result.rule, r2Result.rule, r3Result.rule, r4Result.rule, r5Result.rule, r6Result.rule],
    };
  });
  return {
    ...evidence,
    promptfooVersion: await packageVersion(root),
  };
}
