import { canonicalJson } from './canonical.js';

export type CapabilityClassification = 'NATIVE_STABLE' | 'NATIVE_EXPERIMENTAL' | 'ADAPTER' | 'INSUFFICIENT';
export type CapabilityCondition = 'baseline' | 'deep';

export interface CapabilityRow {
  capabilityId: string;
  classification: CapabilityClassification;
  condition: CapabilityCondition;
  decisionEligibility: 'UNASSESSED';
  evidenceReference: string;
  limitations: string[];
  observed: boolean;
  purpose: 'DEVELOPMENT';
  signal: string;
  sourceSurface: string;
  versionFingerprint: string;
}

interface ConditionEvidence {
  after: unknown;
  before: unknown;
  summary: unknown;
}

export interface BuildCapabilityMatrixInput {
  baseline: ConditionEvidence;
  deep: ConditionEvidence;
  versionFingerprint: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function response(summary: unknown): Record<string, unknown> | undefined {
  if (!isRecord(summary) || !Array.isArray(summary.results)) {
    return undefined;
  }
  const result = (summary.results as unknown[])[0];
  return isRecord(result) && isRecord(result.response) ? result.response : undefined;
}

function hasTrace(summary: unknown): boolean {
  if (!isRecord(summary)) {
    return false;
  }
  return summary.trace !== undefined || summary.traces !== undefined || summary.traceData !== undefined;
}

function row(
  condition: CapabilityCondition,
  versionFingerprint: string,
  suffix: string,
  signal: string,
  sourceSurface: string,
  observed: boolean,
  classification: CapabilityClassification,
  limitations: string[],
): CapabilityRow {
  return {
    capabilityId: `${condition}-${suffix}`,
    classification,
    condition,
    decisionEligibility: 'UNASSESSED',
    evidenceReference: `${condition}-curated.json`,
    limitations,
    observed,
    purpose: 'DEVELOPMENT',
    signal,
    sourceSurface,
    versionFingerprint,
  };
}

function rowsForCondition(condition: CapabilityCondition, evidence: ConditionEvidence, versionFingerprint: string): CapabilityRow[] {
  const providerResponse = response(evidence.summary);
  const output = typeof providerResponse?.output === 'string';
  const session = typeof providerResponse?.sessionId === 'string';
  const tokens = providerResponse?.tokenUsage !== undefined;
  const providerError = typeof providerResponse?.error === 'string';
  const workspaceChanged = canonicalJson(evidence.before) !== canonicalJson(evidence.after);
  const traceObserved = condition === 'deep' && hasTrace(evidence.summary);
  const traceClassification: CapabilityClassification = traceObserved ? 'NATIVE_EXPERIMENTAL' : 'INSUFFICIENT';
  const traceSurface = condition === 'deep' ? 'experimental-otlp-trace' : 'not-exposed-by-baseline';
  const noTraceLimit =
    condition === 'deep'
      ? 'No trace event was surfaced by the current experimental summary.'
      : 'The baseline condition does not request deep tracing.';
  return [
    row(condition, versionFingerprint, 'final-response', 'final response', 'promptfoo-evaluate-summary', output, 'NATIVE_STABLE', [
      'Only the configured canary response is observed.',
    ]),
    row(condition, versionFingerprint, 'session-id', 'session ID', 'promptfoo-provider-response', session, 'NATIVE_STABLE', [
      'A session ID does not prove thread persistence or effective model settings.',
    ]),
    row(condition, versionFingerprint, 'token-usage', 'token usage', 'promptfoo-provider-response', tokens, 'NATIVE_STABLE', [
      'Usage is provider-reported and does not expose hidden reasoning.',
    ]),
    row(
      condition,
      versionFingerprint,
      'workspace-mutation',
      'workspace mutation',
      'synthetic-workspace-snapshot',
      workspaceChanged,
      'NATIVE_STABLE',
      ['The snapshot establishes only synthetic workspace consequences.'],
    ),
    row(
      condition,
      versionFingerprint,
      'filesystem-consequences',
      'filesystem consequences',
      'synthetic-workspace-snapshot',
      workspaceChanged,
      'NATIVE_STABLE',
      ['The snapshot establishes only known synthetic workspace consequences.'],
    ),
    row(
      condition,
      versionFingerprint,
      'provider-errors',
      'provider errors',
      'promptfoo-provider-response',
      providerError,
      'NATIVE_STABLE',
      ['An absent error is not proof that every internal operation succeeded.'],
    ),
    row(condition, versionFingerprint, 'effective-model', 'effective model', 'promptfoo-provider-response', false, 'INSUFFICIENT', [
      'Requested model is not evidence of the effective model.',
    ]),
    row(condition, versionFingerprint, 'effective-reasoning', 'effective reasoning', 'promptfoo-provider-response', false, 'INSUFFICIENT', [
      'Requested reasoning is not evidence of the effective reasoning level.',
    ]),
    row(condition, versionFingerprint, 'command-trajectory', 'command trajectory', traceSurface, traceObserved, traceClassification, [
      noTraceLimit,
    ]),
    row(condition, versionFingerprint, 'file-operations', 'file operations', traceSurface, traceObserved, traceClassification, [
      noTraceLimit,
    ]),
    row(condition, versionFingerprint, 'ordering', 'event ordering', traceSurface, traceObserved, traceClassification, [noTraceLimit]),
    row(condition, versionFingerprint, 'runtime-errors', 'runtime errors', traceSurface, traceObserved, traceClassification, [
      noTraceLimit,
    ]),
    row(condition, versionFingerprint, 'skill-usage-metadata', 'skill usage metadata', traceSurface, traceObserved, traceClassification, [
      'Skill metadata cannot establish causal contribution.',
      noTraceLimit,
    ]),
  ];
}

export function buildCapabilityMatrix(input: BuildCapabilityMatrixInput): CapabilityRow[] {
  return [
    ...rowsForCondition('baseline', input.baseline, input.versionFingerprint),
    ...rowsForCondition('deep', input.deep, input.versionFingerprint),
  ];
}

export interface G2Recommendation {
  limitations: string[];
  options: Array<
    'CONTINUE_WITH_CODEX_SDK' | 'CONTINUE_WITH_SMALL_ADAPTER' | 'SPIKE_APP_SERVER' | 'WEAKEN_SUPPORTED_CLAIMS' | 'STOP_AND_REASSESS'
  >;
}

export interface OwnershipRow {
  limitations: string[];
  owner: 'Promptfoo' | 'Codex SDK and dedicated login' | 'experimental harness' | 'human operator';
  responsibility: string;
}

export function experimentalOwnershipMatrix(): OwnershipRow[] {
  return [
    {
      limitations: ['Promptfoo completion does not establish effective model settings or causal contribution.'],
      owner: 'Promptfoo',
      responsibility: 'provider invocation and normal evaluation summary',
    },
    {
      limitations: ['Authentication is configuration inference unless independently reported.'],
      owner: 'Codex SDK and dedicated login',
      responsibility: 'existing ChatGPT/Codex authentication resolution',
    },
    {
      limitations: ['Snapshots observe only the synthetic workspace and do not observe hidden trajectory.'],
      owner: 'experimental harness',
      responsibility: 'freeze, budget, isolation, synthetic workspace, and curation',
    },
    {
      limitations: ['Deep OTLP evidence is experimental and cannot be classified NATIVE_STABLE.'],
      owner: 'experimental harness',
      responsibility: 'capability matrix and bounded G2 recommendation',
    },
    {
      limitations: ['No G2 option authorizes automatic architecture work in this campaign.'],
      owner: 'human operator',
      responsibility: 'G2 follow-up implementation',
    },
  ];
}

export function recommendG2(matrix: CapabilityRow[]): G2Recommendation {
  const finalResponse = matrix.some(
    (entry) => entry.signal === 'final response' && entry.observed && entry.classification === 'NATIVE_STABLE',
  );
  const deepTrajectory = matrix.find((entry) => entry.capabilityId === 'deep-command-trajectory');
  if (!finalResponse) {
    return {
      limitations: ['The canary final response was not observed through the configured public surface.'],
      options: ['STOP_AND_REASSESS'],
    };
  }
  if (deepTrajectory?.classification === 'NATIVE_EXPERIMENTAL' && deepTrajectory.observed) {
    return {
      limitations: ['Deep trace evidence remains experimental and is not decision-eligible by this Foundation.'],
      options: ['CONTINUE_WITH_CODEX_SDK', 'WEAKEN_SUPPORTED_CLAIMS'],
    };
  }
  return {
    limitations: ['Command trajectory, file-operation, and ordering evidence were not observed from the deep surface.'],
    options: ['SPIKE_APP_SERVER', 'WEAKEN_SUPPORTED_CLAIMS'],
  };
}
