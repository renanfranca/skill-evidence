export type CaseStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'ERROR';
export type ClaimStatus = 'SUPPORTED' | 'NOT_SUPPORTED' | 'INCONCLUSIVE' | 'NOT_EVALUATED';

export interface CheckSpec {
  type: 'command-exit' | 'file-changed' | 'file-unchanged' | 'no-changes' | 'message-match' | 'no-write-outside' | 'skill-unchanged';
  path?: string;
  command?: string[];
  exitCode?: number;
  pattern?: string;
}

export interface Contract {
  schemaVersion: 1;
  id: string;
  preconditions: CheckSpec[];
  requiredEffects: CheckSpec[];
  prohibitedEffects: CheckSpec[];
  temporalConstraints: { before: string; after: string }[];
  severity: 'critical' | 'major' | 'minor';
  evidence: ('diff' | 'command' | 'trajectory' | 'message' | 'path-audit' | 'skill-fingerprint')[];
  claims: string[];
}

export interface EvaluationCase {
  schemaVersion: 1;
  id: string;
  distribution: 'usage' | 'stress';
  prompt: string;
  fixture: string;
  contracts: string[];
  oracle: string;
}

export interface Evaluation {
  schemaVersion: 1;
  id: string;
  decision: string;
  population: string;
  exclusions: string[];
  claims: { id: string; label: string }[];
  thresholds: { requiredPassingCases: number; maxCriticalViolations: 0; requireCalibratedJudge: true };
  runtime: { skillSource: string; skillCommit: string; theoryCommit: string; timeoutMs: number };
  cases: string[];
}

export interface LoadedEvaluation {
  directory: string;
  evaluation: Evaluation;
  cases: EvaluationCase[];
  contracts: Contract[];
  inputDigests: Record<string, string>;
  fingerprint: string;
}

export interface RunPlan {
  schemaVersion: 1;
  evaluationDirectory: string;
  evaluationFingerprint: string;
  skillFingerprint: string;
  inputDigests: Record<string, string>;
  model: string;
  reasoningEffort: string;
  judgeModel: string;
  judgeReasoningEffort: string;
  sessions: { calibration: 1; executors: number; judges: number; maximum: number };
  createdAt: string;
}

export interface NormalizedEvent {
  sequence: number;
  type: string;
  itemType?: string;
  command?: string;
  status?: string;
  message?: string;
}

export interface CaseEvidence {
  id: string;
  distribution: 'usage' | 'stress';
  status: CaseStatus;
  directViolations: { contractId: string; severity: string; detail: string }[];
  trajectory: NormalizedEvent[];
  diff: string;
  commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
  finalMessage: string;
  judge?: { status: CaseStatus; rationale: string };
  observabilityComplete: boolean;
}

export interface Evidence {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  provenance: Record<string, unknown>;
  fingerprints: Record<string, string>;
  calibration: { passed: boolean; probes: { id: string; passed: boolean }[] };
  cases: CaseEvidence[];
  claims: { id: string; status: ClaimStatus }[];
  eligibility: { confirm: boolean; reasons: string[] };
  usage: { sessions: number; inputTokens: number; outputTokens: number };
}
