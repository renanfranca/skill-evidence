import type { CanaryAssessment, WorkspaceSnapshot } from './workspace.js';

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
  after: WorkspaceSnapshot;
  canary: CanaryAssessment;
  summary: unknown;
  traces: unknown;
}

export interface BuildCapabilityMatrixInput {
  baseline: ConditionEvidence;
  deep: ConditionEvidence;
  versionFingerprint: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function firstResponse(summary: unknown): Record<string, unknown> | undefined {
  const results = isRecord(summary) ? summary.results : undefined;
  const first: unknown = Array.isArray(results) ? (results as unknown[])[0] : undefined;
  return isRecord(first) && isRecord(first.response) ? first.response : undefined;
}

function traceSpans(traces: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(traces)) {
    return [];
  }
  return traces.flatMap((trace) => (isRecord(trace) && Array.isArray(trace.spans) ? trace.spans.filter(isRecord) : []));
}

function traceRecords(traces: unknown): Array<Record<string, unknown>> {
  return Array.isArray(traces) ? traces.filter(isRecord) : [];
}

function hasTransport(traces: unknown): boolean {
  return traceRecords(traces).some((trace) => typeof trace.traceId === 'string');
}

function hasLinkage(traces: unknown): boolean {
  return traceRecords(traces).some((trace) => typeof trace.traceId === 'string' && typeof trace.evaluationId === 'string');
}

function attributesContain(span: Record<string, unknown>, fragment: string): boolean {
  const attributes = isRecord(span.attributes) ? span.attributes : {};
  return Object.entries(attributes).some(([key, value]) => (key + ':' + String(value)).toLowerCase().includes(fragment));
}

function hasCommandTrajectory(traces: unknown): boolean {
  return traceSpans(traces).some(
    (span) => (typeof span.name === 'string' && /command|exec|shell/i.test(span.name)) || attributesContain(span, 'command'),
  );
}

function hasFileOperations(traces: unknown): boolean {
  return traceSpans(traces).some(
    (span) => (typeof span.name === 'string' && /file|filesystem|write|read/i.test(span.name)) || attributesContain(span, 'file.'),
  );
}

function hasOrdering(traces: unknown): boolean {
  const times = traceSpans(traces)
    .map((span) => span.startTime)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return times.length >= 2;
}

function hasRecovery(traces: unknown): boolean {
  const spans = traceSpans(traces);
  const failedAt = spans
    .filter((span) => isRecord(span.status) && span.status.code === 'error' && typeof span.startTime === 'number')
    .map((span) => span.startTime as number);
  return failedAt.some((failure) => spans.some((span) => typeof span.startTime === 'number' && span.startTime > failure));
}

function hasSkillMetadata(traces: unknown): boolean {
  return traceSpans(traces).some((span) => attributesContain(span, 'skill'));
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
    capabilityId: condition + '-' + suffix,
    classification,
    condition,
    decisionEligibility: 'UNASSESSED',
    evidenceReference: condition + '-curated.json',
    limitations,
    observed,
    purpose: 'DEVELOPMENT',
    signal,
    sourceSurface,
    versionFingerprint,
  };
}

function traceClassification(observed: boolean): CapabilityClassification {
  return observed ? 'NATIVE_EXPERIMENTAL' : 'INSUFFICIENT';
}

function directClassification(observed: boolean): CapabilityClassification {
  return observed ? 'NATIVE_STABLE' : 'INSUFFICIENT';
}

function traceLimitations(evidence: ConditionEvidence, signal: string): string[] {
  if (evidence.canary.status === 'INVALID_CANARY') {
    return ['The canary is invalid; absent ' + signal + ' cannot support a negative observability conclusion.'];
  }
  return ['Trace evidence is experimental and no stable public API claim is established.'];
}

function rowsForCondition(condition: CapabilityCondition, evidence: ConditionEvidence, versionFingerprint: string): CapabilityRow[] {
  const response = firstResponse(evidence.summary);
  const output = typeof response?.output === 'string';
  const session = typeof response?.sessionId === 'string';
  const tokens = response?.tokenUsage !== undefined;
  const providerError = typeof response?.error === 'string';
  const canaryValid = evidence.canary.status === 'PASS';
  const workspaceMutation = canaryValid;
  const traces = condition === 'deep' ? evidence.traces : [];
  const traceSurface = condition === 'deep' ? 'promptfoo-getTraces-experimental' : 'not-requested-by-baseline';
  const traceRow = (suffix: string, signal: string, observed: boolean) =>
    row(
      condition,
      versionFingerprint,
      suffix,
      signal,
      traceSurface,
      observed,
      traceClassification(observed),
      traceLimitations(evidence, signal),
    );
  return [
    row(
      condition,
      versionFingerprint,
      'final-response',
      'final response',
      'promptfoo-evaluate-summary',
      output,
      directClassification(output),
      ['Only the configured canary response is observed.'],
    ),
    row(condition, versionFingerprint, 'session-id', 'session ID', 'promptfoo-provider-response', session, directClassification(session), [
      'A session ID does not prove thread persistence or effective settings.',
    ]),
    row(condition, versionFingerprint, 'token-usage', 'token usage', 'promptfoo-provider-response', tokens, directClassification(tokens), [
      'Usage is provider-reported and does not expose hidden reasoning.',
    ]),
    row(
      condition,
      versionFingerprint,
      'workspace-mutation',
      'validated workspace mutation',
      'synthetic-workspace-snapshot',
      workspaceMutation,
      directClassification(workspaceMutation),
      evidence.canary.limitations,
    ),
    row(
      condition,
      versionFingerprint,
      'provider-error',
      'provider error',
      'promptfoo-evaluate-summary',
      providerError,
      directClassification(providerError),
      ['Absence of an error field does not prove the absence of all provider-side faults.'],
    ),
    traceRow('receiver-transport', 'receiver transport', hasTransport(traces)),
    traceRow('evaluation-linkage', 'evaluation linkage', hasLinkage(traces)),
    traceRow('command-trajectory', 'command trajectory', hasCommandTrajectory(traces)),
    traceRow('file-operations', 'file operations', hasFileOperations(traces)),
    traceRow('event-ordering', 'event ordering', hasOrdering(traces)),
    traceRow('runtime-failure-recovery', 'controlled runtime failure and recovery', hasRecovery(traces)),
    row(
      condition,
      versionFingerprint,
      'skill-usage-metadata',
      'skill usage metadata',
      traceSurface,
      hasSkillMetadata(traces),
      traceClassification(hasSkillMetadata(traces)),
      ['Skill metadata or an observed SKILL.md read cannot establish causal skill contribution.'],
    ),
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
    'CONTINUE_WITH_CODEX_SDK' | 'CONTINUE_WITH_SMALL_ADAPTER' | 'SPIKE_APP_SERVER' | 'STOP_AND_REASSESS' | 'WEAKEN_SUPPORTED_CLAIMS'
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
      limitations: ['Promptfoo completion and traces do not establish effective model settings or causal skill contribution.'],
      owner: 'Promptfoo',
      responsibility: 'provider invocation, summary surface, and experimental trace lifecycle',
    },
    {
      limitations: ['Directory identity detects replacement but not credential contents or authenticated-principal continuity.'],
      owner: 'Codex SDK and dedicated login',
      responsibility: 'existing ChatGPT/Codex authentication resolution and requested execution condition',
    },
    {
      limitations: ['Deep trace evidence is experimental and cannot become NATIVE_STABLE in this Foundation.'],
      owner: 'experimental harness',
      responsibility: 'freeze, budget, isolation, canary ground truth, capability matrix, and bounded G2 recommendation',
    },
    {
      limitations: ['No G2 option authorizes automatic architecture work in this campaign.'],
      owner: 'human operator',
      responsibility: 'G2 follow-up implementation',
    },
  ];
}

export function recommendG2(matrix: CapabilityRow[], deepCanary?: CanaryAssessment): G2Recommendation {
  if (deepCanary?.status !== 'PASS') {
    return {
      limitations: [
        deepCanary?.status === 'INVALID_CANARY'
          ? 'The deep canary is invalid, so negative event-observability claims are prohibited.'
          : 'The deep canary did not pass, so G2 lacks the required deep evidence.',
      ],
      options: ['STOP_AND_REASSESS'],
    };
  }
  const finalResponse = matrix.find((entry) => entry.capabilityId === 'deep-final-response');
  const trajectory = matrix.find((entry) => entry.capabilityId === 'deep-command-trajectory');
  if (finalResponse?.observed !== true) {
    return {
      limitations: ['The deep canary final response was not observed through the configured public surface.'],
      options: ['STOP_AND_REASSESS'],
    };
  }
  if (trajectory?.observed) {
    return {
      limitations: ['Deep trace evidence remains experimental and is not decision-eligible by this Foundation.'],
      options: ['CONTINUE_WITH_CODEX_SDK', 'WEAKEN_SUPPORTED_CLAIMS'],
    };
  }
  return {
    limitations: ['Command trajectory is not independently exposed by the evaluated deep surface.'],
    options: ['SPIKE_APP_SERVER', 'WEAKEN_SUPPORTED_CLAIMS'],
  };
}
