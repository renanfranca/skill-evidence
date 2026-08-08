import { describe, expect, it } from 'vitest';

import { buildCapabilityMatrix, experimentalOwnershipMatrix, recommendG2 } from '../experiments/capabilities.js';

describe('G2 capability reporting', () => {
  it('keeps missing deep trace evidence insufficient even when the canary changed the workspace', () => {
    const matrix = buildCapabilityMatrix({
      baseline: {
        after: { entries: { 'target.txt': { exists: true, sha256: 'after' } } },
        before: { entries: { 'target.txt': { exists: true, sha256: 'before' } } },
        summary: { results: [{ response: { output: 'E2_CANARY_OK', sessionId: 's1', tokenUsage: { total: 4 } } }] },
      },
      deep: {
        after: { entries: { 'target.txt': { exists: true, sha256: 'after' } } },
        before: { entries: { 'target.txt': { exists: true, sha256: 'before' } } },
        summary: { results: [{ response: { output: 'E2_CANARY_OK' } }] },
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
    expect(recommendG2(matrix).options).toEqual(['SPIKE_APP_SERVER', 'WEAKEN_SUPPORTED_CLAIMS']);
  });

  it('keeps G2 implementation ownership with the human operator', () => {
    expect(experimentalOwnershipMatrix()).toContainEqual(
      expect.objectContaining({ owner: 'human operator', responsibility: 'G2 follow-up implementation' }),
    );
  });
});
