export type GateStatus = 'PASS' | 'ERROR';

export interface CuratedE1Result {
  authentication: {
    evidenceKind: 'CONFIGURATION_INFERENCE';
    limitation: string;
  };
  g1: GateStatus;
  observedEffectiveModel: null;
  observedEffectiveModelReason: string;
  observedEffectiveReasoning: null;
  observedEffectiveReasoningReason: string;
  providerError: string | null;
  requestedModel: 'gpt-5.6-luna';
  requestedReasoning: 'max';
  response: string | null;
  sessionId: string | null;
  tokenUsage: unknown;
}

export interface ProviderOutcome {
  providerError: string | null;
  response: string | null;
  status: 'ERROR' | 'SUCCESS';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function firstResponse(summary: unknown): Record<string, unknown> | undefined {
  if (!isRecord(summary) || !Array.isArray(summary.results)) {
    return undefined;
  }
  const first = (summary.results as unknown[])[0];
  if (!isRecord(first) || !isRecord(first.response)) {
    return undefined;
  }
  return first.response;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function assessE1(summary: unknown, freezeEligible = true): CuratedE1Result {
  const response = firstResponse(summary);
  const output = stringOrNull(response?.output);
  const providerError = stringOrNull(response?.error);
  return {
    authentication: {
      evidenceKind: 'CONFIGURATION_INFERENCE',
      limitation: 'The provider surface did not report an independent authentication state.',
    },
    g1: freezeEligible && output === 'E1_AUTH_OK' && providerError === null ? 'PASS' : 'ERROR',
    observedEffectiveModel: null,
    observedEffectiveModelReason: 'An effective model field was not exposed by the evaluated provider summary.',
    observedEffectiveReasoning: null,
    observedEffectiveReasoningReason: 'An effective reasoning field was not exposed by the evaluated provider summary.',
    providerError,
    requestedModel: 'gpt-5.6-luna',
    requestedReasoning: 'max',
    response: output,
    sessionId: stringOrNull(response?.sessionId),
    tokenUsage: response?.tokenUsage ?? null,
  };
}

export function assessProviderOutcome(summary: unknown): ProviderOutcome {
  const providerResponse = firstResponse(summary);
  const response = stringOrNull(providerResponse?.output);
  const providerError = stringOrNull(providerResponse?.error);
  return { providerError, response, status: providerError === null ? 'SUCCESS' : 'ERROR' };
}
