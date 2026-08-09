import { describe, expect, it } from 'vitest';

import { buildCapabilityMatrix, experimentalOwnershipMatrix, recommendG2 } from '../experiments/capabilities.js';

describe('G2 capability reporting', () => {
  it('keeps missing deep trace evidence insufficient even when the canary changed the workspace', () => {
    const matrix = buildCapabilityMatrix({
      baseline: {
        after: { entries: {} },
        canary: { effects: [], limitations: [], response: 'E2_CANARY_OK', status: 'PASS' },
        summary: { results: [{ response: { output: 'E2_CANARY_OK', sessionId: 's1', tokenUsage: { total: 4 } } }] },
        traces: [],
      },
      deep: {
        after: { entries: {} },
        canary: { effects: [], limitations: [], response: 'E2_CANARY_OK', status: 'PASS' },
        summary: { results: [{ response: { output: 'E2_CANARY_OK' } }] },
        traces: [],
      },
      versionFingerprint: 'freeze-digest',
    });

    expect(matrix.find((row) => row.capabilityId === 'deep-command-trajectory')).toMatchObject({
      classification: 'INSUFFICIENT',
      condition: 'deep',
      decisionEligibility: 'UNASSESSED',
      observed: false,
      purpose: 'DEVELOPMENT',
    });
    expect(matrix.find((row) => row.capabilityId === 'baseline-workspace-mutation')).toMatchObject({
      classification: 'NATIVE_STABLE',
      observed: true,
      sourceSurface: 'synthetic-workspace-snapshot',
    });
    expect(recommendG2(matrix, { effects: [], limitations: [], response: 'E2_CANARY_OK', status: 'PASS' }).options).toEqual([
      'SPIKE_APP_SERVER',
      'WEAKEN_SUPPORTED_CLAIMS',
    ]);
  });

  it('keeps G2 implementation ownership with the human operator', () => {
    expect(experimentalOwnershipMatrix()).toContainEqual(
      expect.objectContaining({ owner: 'human operator', responsibility: 'G2 follow-up implementation' }),
    );
  });

  it('attributes the experimental boundaries to Promptfoo, Codex SDK/login, the harness, and the operator', () => {
    const owners = experimentalOwnershipMatrix().map((entry) => entry.owner);

    expect(owners).toEqual(
      expect.arrayContaining(['Promptfoo', 'Codex SDK and dedicated login', 'experimental harness', 'human operator']),
    );
  });

  it('does not let a generic trace manufacture specialized capabilities', () => {
    const evidence = {
      after: { entries: {} },
      canary: { effects: [], limitations: [], response: 'E2_CANARY_OK', status: 'PASS' as const },
      summary: { results: [{ response: { output: 'E2_CANARY_OK' } }] },
    };
    const matrix = buildCapabilityMatrix({
      baseline: { ...evidence, traces: [] },
      deep: {
        ...evidence,
        traces: [
          {
            evaluationId: 'evaluation',
            spans: [
              { name: 'deterministic.command', startTime: 1, status: { code: 'error' } },
              { attributes: { 'file.path': 'target.txt', skill_name: 'synthetic' }, name: 'file.write', startTime: 2 },
            ],
            traceId: 'trace',
          },
        ],
      },
      versionFingerprint: 'freeze-digest',
    });

    expect(matrix.find((row) => row.capabilityId === 'deep-evaluation-linkage')?.classification).toBe('NATIVE_EXPERIMENTAL');
    expect(matrix.find((row) => row.capabilityId === 'deep-command-trajectory')?.classification).toBe('NATIVE_EXPERIMENTAL');
    expect(matrix.find((row) => row.capabilityId === 'deep-file-operations')?.classification).toBe('NATIVE_EXPERIMENTAL');
    expect(matrix.find((row) => row.capabilityId === 'deep-runtime-failure-recovery')?.classification).toBe('NATIVE_EXPERIMENTAL');
    expect(matrix.find((row) => row.capabilityId === 'deep-skill-usage-metadata')?.limitations[0]).toContain('cannot establish causal');
  });

  it('classifies an unavailable normal-surface signal as insufficient instead of stable', () => {
    const matrix = buildCapabilityMatrix({
      baseline: {
        after: { entries: {} },
        canary: { effects: [], limitations: [], response: null, status: 'INVALID_CANARY' },
        summary: { results: [{ response: {} }] },
        traces: [],
      },
      deep: {
        after: { entries: {} },
        canary: { effects: [], limitations: [], response: null, status: 'INVALID_CANARY' },
        summary: { results: [{ response: {} }] },
        traces: [],
      },
      versionFingerprint: 'freeze-digest',
    });

    expect(matrix.find((row) => row.capabilityId === 'baseline-final-response')).toMatchObject({
      classification: 'INSUFFICIENT',
      observed: false,
    });
  });
});
