import { describe, expect, it } from 'vitest';

import { assessE1, assessE2 } from '../experiments/report.js';

describe('G1 reporting', () => {
  it('passes only the literal authentication canary and keeps unobserved effective settings null', () => {
    const report = assessE1({
      results: [{ response: { output: 'E1_AUTH_OK', sessionId: 'session-1', tokenUsage: { total: 9 } } }],
    });

    expect(report.g1).toBe('PASS');
    expect(report.authentication.evidenceKind).toBe('CONFIGURATION_INFERENCE');
    expect(report.requestedModel).toBe('gpt-5.6-luna');
    expect(report.observedEffectiveModel).toBeNull();
    expect(report.observedEffectiveReasoning).toBeNull();
    expect(report.observedEffectiveReasoningReason).toContain('not exposed');
  });

  it('does not treat an E2 provider completion as a canary success without its literal marker', () => {
    expect(assessE2({ results: [{ response: { output: 'almost' } }] }).status).toBe('ERROR');
    expect(assessE2({ results: [{ response: { output: 'E2_CANARY_OK' } }] }).status).toBe('PASS');
  });
});
