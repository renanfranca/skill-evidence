import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';

import reportSchema from '../../schemas/author-qualification-report.schema.json' with { type: 'json' };
import { canonicalJson, sha256 } from '../canonical-json.js';

export interface AuthorQualificationConditionEvidence {
  authenticationMode: 'CHATGPT';
  authorConditionFingerprint: string;
  codexCliVersion: string;
  codexSdkVersion: string;
  effectiveModel: string | null;
  fingerprint: string;
  modelEvidenceKind: 'PROVIDER_REPORTED' | 'REQUEST_CONFIGURATION_ACCEPTED';
  nodeVersion: string;
  operationalAcceptance: boolean;
  promptfooVersion: string;
  requestedModel: 'gpt-5.6-luna' | 'gpt-5.6-terra';
  requestedReasoning: 'max' | 'xhigh';
  sandboxFingerprint: string;
}

export type AuthorQualificationConditionEvidenceInput = Omit<AuthorQualificationConditionEvidence, 'fingerprint'>;

export interface AuthorQualificationReport {
  bundleFingerprint: string;
  campaignId: string;
  campaignResult: 'INSUFFICIENT' | 'INVALIDATED' | 'NOT_QUALIFIED' | 'QUALIFIED';
  conditionResults: Array<{
    conditionFingerprint: string;
    criticalViolations: number;
    limitations: string[];
    status: 'NOT_QUALIFIED' | 'QUALIFIED' | 'STALE';
  }>;
  expirationConditions: string[];
  limitations: string[];
  purpose: 'AUTHOR_QUALIFICATION';
  qualificationConditions: AuthorQualificationConditionEvidence[];
  samples: Array<{ caseId: string; conditionFingerprint: string; id: string; status: 'COMPLETED' | 'ERROR' | 'NOT_RUN' }>;
  schemaVersion: 1;
  selectedCondition: string | null;
  selectionRationale: string;
}

export interface AuthorQualificationReportValidation {
  diagnostics: Array<{ code: string; path: string }>;
  valid: boolean;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(reportSchema);

function diagnostics(errors: ErrorObject[] | null | undefined): AuthorQualificationReportValidation['diagnostics'] {
  return (errors ?? []).map((error) => ({ code: `SCHEMA_${error.keyword.toUpperCase()}`, path: error.instancePath || '/' }));
}

export function validateAuthorQualificationReport(value: unknown): AuthorQualificationReportValidation {
  const valid = validate(value);
  return { diagnostics: valid ? [] : diagnostics(validate.errors), valid };
}

export function createAuthorQualificationConditionEvidence(
  input: AuthorQualificationConditionEvidenceInput,
): AuthorQualificationConditionEvidence {
  const fingerprint = sha256({
    authenticationMode: input.authenticationMode,
    authorConditionFingerprint: input.authorConditionFingerprint,
    codexCliVersion: input.codexCliVersion,
    codexSdkVersion: input.codexSdkVersion,
    nodeVersion: input.nodeVersion,
    promptfooVersion: input.promptfooVersion,
    requestedModel: input.requestedModel,
    requestedReasoning: input.requestedReasoning,
    sandboxFingerprint: input.sandboxFingerprint,
  });
  return { ...input, fingerprint };
}

export function renderAuthorQualificationReport(report: AuthorQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}
