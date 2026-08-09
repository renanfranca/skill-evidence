import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../experiments/canonical.js';
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
