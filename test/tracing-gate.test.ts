import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../experiments/canonical.js';
import {
  codexOtelQualificationConditions,
  qualifyCodexOtel,
  renderCodexOtelQualification,
  type CodexOtelQualificationAttempt,
  type CodexOtelWorkerRequest,
} from '../experiments/qualify-codex-otel.js';
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
