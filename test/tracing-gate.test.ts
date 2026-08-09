import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../experiments/canonical.js';
import {
  classifyTracingAttempts,
  qualifyPromptfooTracing,
  renderTracingQualification,
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
    condition: { writeLatestResults },
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
    expect(tracingGateWriteLatestResults).toBe(false);
  });
});

describe('Promptfoo tracing qualification', () => {
  it.each([
    {
      expected: 'EXACT_SUPPORTED',
      statuses: ['SUPPORTED', 'SUPPORTED', 'SUPPORTED', 'SUPPORTED'] as const,
    },
    {
      expected: 'ALTERNATIVE_SUPPORTED',
      statuses: ['UNSUPPORTED', 'UNSUPPORTED', 'SUPPORTED', 'SUPPORTED'] as const,
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
          ...attempt(request.writeLatestResults, request.repetition, 'SUPPORTED'),
          diagnostic: '/tmp/skill-evidence-promptfoo-secret/config',
        },
        processId,
      });
    };

    const report = await qualifyPromptfooTracing(launchWorker);
    const rendered = renderTracingQualification(report);

    expect(requests).toEqual([
      { repetition: 1, writeLatestResults: false },
      { repetition: 2, writeLatestResults: false },
      { repetition: 1, writeLatestResults: true },
      { repetition: 2, writeLatestResults: true },
    ]);
    expect(report.conditions.map((condition) => condition.attempts.length)).toEqual([2, 2]);
    expect(report.result).toBe('EXACT_SUPPORTED');
    expect(rendered).toBe(canonicalJson(report) + '\n');
    expect(rendered).not.toContain('/tmp/');
    expect(rendered).not.toContain('processId');
    expect(rendered.endsWith('\n')).toBe(true);
  });

  it('blocks the conclusion when a worker process is reused', async () => {
    const launchWorker = (request: TracingWorkerRequest) =>
      Promise.resolve({
        attempt: attempt(request.writeLatestResults, request.repetition, 'SUPPORTED'),
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
        attempt: attempt(request.writeLatestResults, request.repetition, 'UNSUPPORTED'),
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
