import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { jsonPromptfooConfiguration, runArchaeologicalConformance } from '../experiments/archaeological.js';
import { canonicalJson } from '../experiments/canonical.js';
import {
  codexOtelQualificationConditions,
  qualifyCodexOtel,
  renderCodexOtelQualification,
  type CodexOtelQualificationAttempt,
  type CodexOtelWorkerRequest,
} from '../experiments/qualify-codex-otel.js';
import {
  qualifyArchaeologicalRegressions,
  renderArchaeologicalQualification,
  type ArchaeologicalWorkerEvidence,
} from '../experiments/qualify-archaeological.js';
import {
  classifyTracingAttempts,
  qualifyPromptfooTracing,
  renderTracingQualification,
  tracingQualificationConditions,
  type TracingQualificationAttempt,
  type TracingWorkerRequest,
} from '../experiments/qualify-tracing.js';
import { tracingGateWriteLatestResults } from '../experiments/tracing-check.js';

function attempt(
  writeLatestResults: boolean,
  repetition: 1 | 2,
  status: TracingQualificationAttempt['status'],
): TracingQualificationAttempt {
  const supported = status === 'SUPPORTED';
  return {
    condition: writeLatestResults ? tracingQualificationConditions['e2-exact'] : tracingQualificationConditions['non-persisted-comparison'],
    correlatedSpanRecovered: supported,
    promptfooVersion: '0.122.0',
    providerCompleted: supported,
    receiverAcceptedSpan: supported,
    repetition,
    runtimeGetTracesPresent: true,
    status,
    summaryAvailable: true,
    typedGetTracesPresent: true,
  };
}

describe('exact-condition tracing checkpoint', () => {
  it('uses the frozen live persistence setting', () => {
    expect(tracingGateWriteLatestResults).toBe(true);
  });
});

describe('archaeological regression qualification', () => {
  it('rejects function-bearing Promptfoo configurations instead of silently dropping runtime bindings', () => {
    const configuration = { providers: [{ callApi: () => Promise.resolve({ output: 'hidden runtime binding' }) }] };

    expect(() => jsonPromptfooConfiguration(configuration)).toThrow('Promptfoo configuration is not JSON-serializable');
  });

  it('delegates executable-path and external-write classification to Promptfoo assertions', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.promptfooVersion).toBe('0.122.0');
    expect(report.rules).toContainEqual({
      id: 'R1',
      observations: [
        { actual: 'PASS', expected: 'PASS', id: 'absolute-executable-path' },
        { actual: 'FAIL', expected: 'FAIL', id: 'external-write-target' },
      ],
      owner: 'PROMPTFOO_ASSERTION',
    });
  });

  it('delegates semantic equivalence and its invalid contrast to a Promptfoo grader', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.rules).toContainEqual({
      id: 'R3',
      observations: [
        { actual: 'PASS', expected: 'PASS', id: 'equivalent-no-refactor-conclusion' },
        { actual: 'PASS', expected: 'PASS', id: 'equivalent-restructuring-unwarranted' },
        { actual: 'FAIL', expected: 'FAIL', id: 'unsupported-refactor-conclusion' },
      ],
      owner: 'PROMPTFOO_GRADER',
    });
  });

  it('lets Promptfoo scoring keep a direct critical violation authoritative over favorable judgment', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.rules).toContainEqual({
      id: 'R6',
      observations: [
        { actual: 'FAIL', expected: 'FAIL', id: 'critical-violation-overrides-favorable-judge' },
        { actual: 'PASS', expected: 'PASS', id: 'favorable-judge-without-critical-violation' },
      ],
      owner: 'PROMPTFOO_SCORING',
    });
  });

  it('blocks known unavailable evidence and preserves a late unknown event as inconclusive', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.rules).toContainEqual({
      id: 'R2',
      observations: [
        { actual: 'BLOCKED', expected: 'BLOCKED', id: 'known-unavailable-critical-evidence' },
        { actual: 'INCONCLUSIVE', expected: 'INCONCLUSIVE', id: 'late-relevant-unknown-event' },
        { actual: 'BLOCKED', expected: 'BLOCKED', id: 'missing-disposition-metadata' },
      ],
      owner: ['SKILL_EVIDENCE_PREFLIGHT', 'SKILL_EVIDENCE_NORMALIZATION'],
    });
  });

  it('sends Promptfoo graders only opaque expectation-blind qualification packets', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.rules).toContainEqual({
      id: 'R4',
      observations: [
        { actual: 'PASS', expected: 'PASS', id: 'opaque-observable-digest' },
        { actual: 'FAIL', expected: 'FAIL', id: 'label-derived-identifier' },
      ],
      owner: 'SKILL_EVIDENCE_INPUT_PROJECTION',
    });
    expect(report.graderCalls).toBe(4);
  });

  it('keeps missing required evidence from invoking a grader or becoming a pass', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());

    expect(report.rules).toContainEqual({
      id: 'R5',
      observations: [
        { actual: 'BLOCKED', expected: 'BLOCKED', id: 'known-missing-required-evidence' },
        { actual: 'INCONCLUSIVE', expected: 'INCONCLUSIVE', id: 'late-missing-required-evidence' },
      ],
      owner: ['SKILL_EVIDENCE_PREFLIGHT', 'SKILL_EVIDENCE_NORMALIZATION'],
    });
    expect(report.graderCalls).toBe(4);
  });

  it('renders a complete canonical development report without evaluator-private data', async () => {
    const report = await qualifyArchaeologicalRegressions(() => runArchaeologicalConformance());
    const rendered = renderArchaeologicalQualification(report);

    expect(report).toMatchObject({
      executionProviderCalls: 11,
      graderCalls: 4,
      promptfooVersion: '0.122.0',
      purpose: 'DEVELOPMENT',
      result: 'SUPPORTED_WITH_THIN_CONTROL_PLANE',
      schemaVersion: 1,
    });
    expect(report.rules.map((rule) => rule.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
    expect(rendered).toBe(canonicalJson(report) + '\n');
    expect(rendered).not.toMatch(/\/tmp\/|processId|known-valid|expectedstatus/i);
  });

  it('blocks an apparently successful report with duplicated rule evidence', async () => {
    const evidence = await runArchaeologicalConformance();
    const duplicated = { ...evidence, rules: [...evidence.rules.slice(0, 5), evidence.rules[0]!] };

    const report = await qualifyArchaeologicalRegressions(() => Promise.resolve(duplicated));

    expect(report.result).toBe('BLOCKED');
  });

  it('reports insufficient conformance when well-formed evidence misses a prespecified disposition', async () => {
    const evidence = await runArchaeologicalConformance();
    const firstRule = evidence.rules[0]!;
    const firstObservation = firstRule.observations[0]!;
    const mismatched = {
      ...evidence,
      rules: [
        {
          ...firstRule,
          observations: [{ ...firstObservation, actual: 'FAIL' as const }, ...firstRule.observations.slice(1)],
        },
        ...evidence.rules.slice(1),
      ],
    };

    const report = await qualifyArchaeologicalRegressions(() => Promise.resolve(mismatched));

    expect(report.result).toBe('INSUFFICIENT');
  });

  it('rejects a fixture manifest that duplicates an otherwise complete rule', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-archaeological-'));
    const fixtureDirectory = join(root, 'evaluations', 'refactor-design', 'archaeological');
    const fixture = JSON.parse(
      await readFile(join(process.cwd(), 'evaluations', 'refactor-design', 'archaeological', 'cases.json'), 'utf8'),
    ) as { rules: unknown[]; schemaVersion: 1 };
    await mkdir(fixtureDirectory, { recursive: true });
    await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'));
    await writeFile(
      join(fixtureDirectory, 'cases.json'),
      JSON.stringify({ ...fixture, rules: [...fixture.rules, fixture.rules[0]] }),
      'utf8',
    );

    await expect(runArchaeologicalConformance(root)).rejects.toThrow('archaeological fixture manifest is invalid');
  });

  it('blocks malformed worker evidence instead of throwing during classification', async () => {
    const malformed = {
      executionProviderCalls: 10,
      graderCalls: 4,
      promptfooVersion: '0.122.0',
      rules: [null, null, null, null, null, null],
    } as unknown as ArchaeologicalWorkerEvidence;

    const report = await qualifyArchaeologicalRegressions(() => Promise.resolve(malformed));

    expect(report.result).toBe('BLOCKED');
  });

  it('blocks favorable rows whose provider call counts contradict the fixed corpus', async () => {
    const evidence = await runArchaeologicalConformance();

    const report = await qualifyArchaeologicalRegressions(() =>
      Promise.resolve({ ...evidence, executionProviderCalls: 0, graderCalls: 0 }),
    );

    expect(report.result).toBe('BLOCKED');
  });
});

describe('Promptfoo tracing qualification', () => {
  it('classifies the named persisted E2 condition as exact instead of inferring exactness from false', () => {
    const attempts = [
      attempt(false, 1, 'UNSUPPORTED'),
      attempt(false, 2, 'UNSUPPORTED'),
      attempt(true, 1, 'SUPPORTED'),
      attempt(true, 2, 'SUPPORTED'),
    ];

    const result = classifyTracingAttempts(attempts);

    expect(result).toBe('EXACT_SUPPORTED');
  });

  it.each([
    {
      expected: 'EXACT_SUPPORTED',
      statuses: ['SUPPORTED', 'SUPPORTED', 'SUPPORTED', 'SUPPORTED'] as const,
    },
    {
      expected: 'ALTERNATIVE_SUPPORTED',
      statuses: ['SUPPORTED', 'SUPPORTED', 'UNSUPPORTED', 'UNSUPPORTED'] as const,
    },
    {
      expected: 'INSUFFICIENT',
      statuses: ['UNSUPPORTED', 'UNSUPPORTED', 'UNSUPPORTED', 'UNSUPPORTED'] as const,
    },
    {
      expected: 'BLOCKED',
      statuses: ['UNSUPPORTED', 'UNSUPPORTED', 'SUPPORTED', 'UNSUPPORTED'] as const,
    },
  ])('classifies a complete two-by-two matrix as $expected', ({ expected, statuses }) => {
    const attempts = [
      attempt(false, 1, statuses[0]),
      attempt(false, 2, statuses[1]),
      attempt(true, 1, statuses[2]),
      attempt(true, 2, statuses[3]),
    ];

    const result = classifyTracingAttempts(attempts);

    expect(result).toBe(expected);
  });

  it('runs two fresh processes per condition and renders only canonical sanitized evidence', async () => {
    const requests: TracingWorkerRequest[] = [];
    let processId = 100;
    const launchWorker = (request: TracingWorkerRequest) => {
      requests.push(request);
      processId += 1;
      return Promise.resolve({
        attempt: {
          ...attempt(request.condition.writeLatestResults, request.repetition, 'SUPPORTED'),
          diagnostic: '/tmp/skill-evidence-promptfoo-secret/config',
        },
        processId,
      });
    };

    const report = await qualifyPromptfooTracing(launchWorker);
    const rendered = renderTracingQualification(report);

    expect(requests).toEqual([
      { condition: tracingQualificationConditions['e2-exact'], repetition: 1 },
      { condition: tracingQualificationConditions['e2-exact'], repetition: 2 },
      { condition: tracingQualificationConditions['non-persisted-comparison'], repetition: 1 },
      { condition: tracingQualificationConditions['non-persisted-comparison'], repetition: 2 },
    ]);
    expect(report.conditions.map((condition) => condition.attempts.length)).toEqual([2, 2]);
    expect(report.conditions[0]?.condition).toEqual(tracingQualificationConditions['e2-exact']);
    expect(report.result).toBe('EXACT_SUPPORTED');
    expect(report.limitations).toContain('Qualification supports the local tracing condition but does not authorize a live campaign.');
    expect(rendered).toBe(canonicalJson(report) + '\n');
    expect(rendered).not.toContain('/tmp/');
    expect(rendered).not.toContain('processId');
    expect(rendered.endsWith('\n')).toBe(true);
  });

  it('blocks the conclusion when a worker process is reused', async () => {
    const launchWorker = (request: TracingWorkerRequest) =>
      Promise.resolve({
        attempt: attempt(request.condition.writeLatestResults, request.repetition, 'SUPPORTED'),
        processId: 100,
      });

    const report = await qualifyPromptfooTracing(launchWorker);

    expect(report.processIsolationVerified).toBe(false);
    expect(report.result).toBe('BLOCKED');
  });

  it('preserves the complete matrix when a worker cannot start', async () => {
    let launches = 0;
    const launchWorker = (request: TracingWorkerRequest) => {
      launches += 1;
      if (launches === 2) {
        throw new Error('spawn failed in /tmp/private-worker');
      }
      return Promise.resolve({
        attempt: attempt(request.condition.writeLatestResults, request.repetition, 'UNSUPPORTED'),
        processId: 100 + launches,
      });
    };

    const report = await qualifyPromptfooTracing(launchWorker);
    const rendered = renderTracingQualification(report);

    expect(launches).toBe(4);
    expect(report.conditions.flatMap((condition) => condition.attempts)).toHaveLength(4);
    expect(report.conditions[0]?.attempts[1]?.status).toBe('BLOCKED');
    expect(report.result).toBe('BLOCKED');
    expect(rendered).not.toContain('/tmp/private-worker');
  });

  it('blocks a worker status that contradicts correlated-span evidence', () => {
    const contradictory = attempt(false, 1, 'SUPPORTED');
    contradictory.correlatedSpanRecovered = false;
    const attempts = [contradictory, attempt(false, 2, 'SUPPORTED'), attempt(true, 1, 'SUPPORTED'), attempt(true, 2, 'SUPPORTED')];

    const result = classifyTracingAttempts(attempts);

    expect(result).toBe('BLOCKED');
  });

  it('blocks a matrix that repeats one repetition instead of observing both', () => {
    const attempts = [
      attempt(false, 1, 'SUPPORTED'),
      attempt(false, 1, 'SUPPORTED'),
      attempt(true, 1, 'SUPPORTED'),
      attempt(true, 2, 'SUPPORTED'),
    ];

    const result = classifyTracingAttempts(attempts);

    expect(result).toBe('BLOCKED');
  });
});

describe('Codex OTEL parsing qualification', () => {
  it('requires two isolated exact accepts and two expected legacy rejections and emits only canonical sanitized evidence', async () => {
    const requests: CodexOtelWorkerRequest[] = [];
    const launch = (request: CodexOtelWorkerRequest) => {
      requests.push(request);
      const exact = request.condition.id === 'exact-nested';
      const attempt: CodexOtelQualificationAttempt = {
        cliVersion: '0.147.0',
        condition: request.condition,
        exitStatus: exact ? 'ZERO' : 'NONZERO',
        parserClassification: exact ? 'ACCEPTED' : 'EXPECTED_STRUCT_VARIANT_REJECTION',
        repetition: request.repetition,
      };
      return Promise.resolve({
        attempt: { ...attempt, diagnostic: '/tmp/private-home/auth.json feature-list SECRET' },
        codexHomeIdentity: `home-${requests.length}`,
        processId: 100 + requests.length,
      });
    };

    const report = await qualifyCodexOtel(launch);
    const rendered = renderCodexOtelQualification(report);

    expect(requests).toEqual([
      { condition: codexOtelQualificationConditions['exact-nested'], repetition: 1 },
      { condition: codexOtelQualificationConditions['exact-nested'], repetition: 2 },
      { condition: codexOtelQualificationConditions['legacy-scalar'], repetition: 1 },
      { condition: codexOtelQualificationConditions['legacy-scalar'], repetition: 2 },
    ]);
    expect(report).toMatchObject({
      cliVersion: '0.147.0',
      codexHomeIsolationVerified: true,
      processIsolationVerified: true,
      purpose: 'DEVELOPMENT',
      result: 'EXACT_SUPPORTED',
      schemaVersion: 1,
    });
    expect(report.conditions.map((condition) => condition.attempts.length)).toEqual([2, 2]);
    expect(report.limitations).toEqual([
      'Parsing qualification does not establish OTEL delivery.',
      'Parsing qualification does not establish authenticated identity.',
      'Parsing qualification does not establish zero egress.',
      'Parsing qualification does not establish live readiness.',
    ]);
    expect(rendered).toBe(canonicalJson(report) + '\n');
    expect(rendered).not.toMatch(/\/tmp\/|processId|codexHomeIdentity|auth\.json|feature-list|SECRET|diagnostic/);

    const inconsistent = await qualifyCodexOtel((request) => {
      const exact = request.condition.id === 'exact-nested';
      return Promise.resolve({
        attempt: {
          cliVersion: '0.147.0',
          condition: request.condition,
          exitStatus: exact ? 'ZERO' : 'NONZERO',
          parserClassification: exact ? 'EXPECTED_STRUCT_VARIANT_REJECTION' : 'EXPECTED_STRUCT_VARIANT_REJECTION',
          repetition: request.repetition,
        },
        codexHomeIdentity: `home-${request.condition.id}-${request.repetition}`,
        processId: request.condition.id === 'exact-nested' ? request.repetition : request.repetition + 2,
      });
    });
    expect(inconsistent.result).toBe('BLOCKED');

    const reused = await qualifyCodexOtel((request) =>
      Promise.resolve({
        attempt: {
          cliVersion: '0.147.0',
          condition: request.condition,
          exitStatus: request.condition.id === 'exact-nested' ? 'ZERO' : 'NONZERO',
          parserClassification: request.condition.id === 'exact-nested' ? 'ACCEPTED' : 'EXPECTED_STRUCT_VARIANT_REJECTION',
          repetition: request.repetition,
        },
        codexHomeIdentity: 'reused-home',
        processId: 100,
      }),
    );
    expect(reused.result).toBe('BLOCKED');

    const wrongVersion = await qualifyCodexOtel((request) =>
      Promise.resolve({
        attempt: {
          cliVersion: '0.148.0',
          condition: request.condition,
          exitStatus: request.condition.id === 'exact-nested' ? 'ZERO' : 'NONZERO',
          parserClassification: request.condition.id === 'exact-nested' ? 'ACCEPTED' : 'EXPECTED_STRUCT_VARIANT_REJECTION',
          repetition: request.repetition,
        },
        codexHomeIdentity: `home-${request.condition.id}-${request.repetition}`,
        processId: request.condition.id === 'exact-nested' ? request.repetition : request.repetition + 2,
      }),
    );
    expect(wrongVersion).toMatchObject({ cliVersion: '0.148.0', result: 'BLOCKED' });
  });
});
