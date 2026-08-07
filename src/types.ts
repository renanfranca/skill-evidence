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
  purpose: 'development' | 'decision';
  distribution: 'usage' | 'stress';
  prompt: string;
  fixture: string;
  contracts: string[];
  oracle: string;
  qualificationExamples: string;
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
  developmentCases: string[];
}

export interface LoadedEvaluation {
  directory: string;
  evaluation: Evaluation;
  cases: EvaluationCase[];
  developmentCases: EvaluationCase[];
  contracts: Contract[];
  inputDigests: Record<string, string>;
  fingerprint: string;
}

export interface RunPlan {
  schemaVersion: 1;
  evaluationDirectory: string;
  evaluationFingerprint: string;
  engineFingerprint: string;
  schemaFingerprint: string;
  skillFingerprint: string;
  skillSnapshotFingerprint: string;
  inputDigests: Record<string, string>;
  model: string;
  reasoningEffort: string;
  judgeModel: string;
  judgeReasoningEffort: string;
  sessions: { calibration: 1; executors: number; judges: number; maximum: number };
  createdAt: string;
}

export interface PreflightCheck {
  id: string;
  state: CaseStatus;
  contract: string;
  phase: 'preflight';
  severity: 'critical' | 'major' | 'minor';
  facts: string[];
  evidence: { type: 'skill-fingerprint' | 'path-audit'; digest: string; reference: string };
}

export interface Preflight {
  schemaVersion: 1;
  createdAt: string;
  planDigest: string;
  eligible: boolean;
  checks: PreflightCheck[];
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
  purpose: 'decision';
  distribution: 'usage' | 'stress';
  status: CaseStatus;
  directViolations: { contractId: string; severity: string; detail: string }[];
  trajectory: NormalizedEvent[];
  diff: string;
  commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
  checks: CheckEvidence[];
  finalMessage: string;
  judgeInput?: string;
  judge?: { status: CaseStatus; rationale: string };
  observabilityComplete: boolean;
}

export interface CheckEvidence {
  id: string;
  state: CaseStatus;
  contractId: string;
  phase: 'precondition' | 'required-effect' | 'prohibited-effect' | 'temporal';
  severity: 'critical' | 'major' | 'minor';
  facts: string[];
  evidence: {
    type: 'diff' | 'command' | 'trajectory' | 'message' | 'path-audit' | 'skill-fingerprint';
    digest: string;
    reference: string;
    sequence?: number;
  };
}

export interface EvidenceV1 {
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

export interface SessionUsage {
  session: number;
  role: 'calibration' | 'executor' | 'judge';
  caseId?: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface EvidenceV2 {
  schemaVersion: 2;
  runId: string;
  createdAt: string;
  provenance: Record<string, unknown>;
  fingerprints: Record<string, string>;
  calibration: { passed: boolean; probes: { id: string; passed: boolean }[] };
  cases: CaseEvidence[];
  claims: { id: string; status: ClaimStatus }[];
  eligibility: { confirm: boolean; reasons: string[] };
  usage: {
    sessions: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    credits: number;
    ledger: SessionUsage[];
  };
}

export type Evidence = EvidenceV1 | EvidenceV2;
