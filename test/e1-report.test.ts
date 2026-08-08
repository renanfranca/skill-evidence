import { describe, expect, it } from 'vitest';

import { assessE1, assessProviderOutcome } from '../experiments/report.js';

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

  it('reports provider completion separately from an E2 canary assessment', () => {
    expect(assessProviderOutcome({ results: [{ response: { output: 'almost' } }] }).status).toBe('SUCCESS');
    expect(assessProviderOutcome({ results: [{ response: { error: 'failed' } }] }).status).toBe('ERROR');
  });
});
