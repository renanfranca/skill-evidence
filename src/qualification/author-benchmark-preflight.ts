import { sha256 } from '../canonical-json.js';

export interface AuthorBenchmarkCampaignEnvironment {
  codexCliVersion: string;
  codexHome: string;
  codexSdkVersion: string;
  nodeVersion: string;
  npmVersion: string;
  promptfooVersion: string;
}

export interface AuthorBenchmarkCampaignPreparation {
  actualAccountCost: 'UNKNOWN';
  apiEquivalentPriceReference: {
    capturedAt: string;
    currency: 'USD';
    perMillionTokens: {
      LUNA_MAX: { cachedInput: number; input: number; output: number };
      TERRA_XHIGH: { cachedInput: number; input: number; output: number };
    };
    sources: [string, string];
  };
  bundleFingerprint: string;
  campaignId: string;
  conditions: Array<{
    conditionFingerprint: string;
    id: 'LUNA_MAX' | 'TERRA_XHIGH';
    requestedModel: 'gpt-5.6-luna' | 'gpt-5.6-terra';
    reasoningEffort: 'max' | 'xhigh';
  }>;
  environment: AuthorBenchmarkCampaignEnvironment;
  invocationBudget: 16;
  outputDirectory: string;
  reservationPath: string;
  reviewerIds: ['reviewer-a', 'reviewer-b'];
  reviewerQualificationFingerprint: string;
  sanitizedReportPath: string;
  sanitizedReportPolicy: {
    excludes: string[];
    includes: string[];
    publishAfter: 'ADJUDICATION_COMPLETE';
  };
  schemaVersion: 1;
  stopRules: string[];
}

export interface AuthorBenchmarkPreflightEvidence {
  authentication: { authFileReadable: boolean; codexHome: string; homeWritable: boolean };
  bundleFingerprint: string | null;
  conditionFingerprints: { LUNA_MAX: string; TERRA_XHIGH: string };
  credentialVariablesAbsent: boolean;
  currentCommit: string;
  environment: AuthorBenchmarkCampaignEnvironment;
  offlineQualificationResult: 'BLOCKED' | 'SUPPORTED_FOR_DEVELOPMENT';
  outputDirectoryExists: boolean;
  outputParentWritable: boolean;
  reservationExists: boolean;
  reviewerQualificationFingerprint: string;
  reviewerQualificationResult: 'BLOCKED' | 'QUALIFIED';
  scheduleCount: number;
  worktreeClean: boolean;
}

export interface AuthorBenchmarkCampaignPreflightReport {
  campaignFingerprint: string;
  campaignId: string;
  checks: Array<{ id: string; status: 'FAIL' | 'PASS' }>;
  currentCommit: string;
  externalProviderCalls: 0;
  limitations: string[];
  providerInvocations: 0;
  purpose: 'DEVELOPMENT';
  reservationCreated: false;
  result: 'BLOCKED' | 'READY_FOR_AUTHORIZATION';
  schemaVersion: 1;
}

export type AuthorBenchmarkCampaignPreparationValidation =
  | { diagnostics: [{ code: 'CAMPAIGN_PREPARATION_INVALID'; path: '/' }]; valid: false }
  | { campaign: AuthorBenchmarkCampaignPreparation; diagnostics: []; valid: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isEnvironment(value: unknown): value is AuthorBenchmarkCampaignEnvironment {
  return (
    isRecord(value) &&
    typeof value.codexCliVersion === 'string' &&
    typeof value.codexHome === 'string' &&
    typeof value.codexSdkVersion === 'string' &&
    typeof value.nodeVersion === 'string' &&
    typeof value.npmVersion === 'string' &&
    typeof value.promptfooVersion === 'string'
  );
}

function isPrice(value: unknown): value is { cachedInput: number; input: number; output: number } {
  return (
    isRecord(value) &&
    typeof value.cachedInput === 'number' &&
    typeof value.input === 'number' &&
    typeof value.output === 'number' &&
    value.cachedInput >= 0 &&
    value.input >= 0 &&
    value.output >= 0
  );
}

function isCampaignPreparation(value: unknown): value is AuthorBenchmarkCampaignPreparation {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.campaignId !== 'string' ||
    typeof value.bundleFingerprint !== 'string' ||
    typeof value.reviewerQualificationFingerprint !== 'string' ||
    value.invocationBudget !== 16 ||
    value.actualAccountCost !== 'UNKNOWN' ||
    !Array.isArray(value.conditions) ||
    !isEnvironment(value.environment) ||
    !Array.isArray(value.reviewerIds) ||
    value.reviewerIds[0] !== 'reviewer-a' ||
    value.reviewerIds[1] !== 'reviewer-b' ||
    typeof value.reservationPath !== 'string' ||
    typeof value.outputDirectory !== 'string' ||
    typeof value.sanitizedReportPath !== 'string' ||
    !isStringArray(value.stopRules) ||
    !isRecord(value.sanitizedReportPolicy) ||
    value.sanitizedReportPolicy.publishAfter !== 'ADJUDICATION_COMPLETE' ||
    !isStringArray(value.sanitizedReportPolicy.includes) ||
    !isStringArray(value.sanitizedReportPolicy.excludes) ||
    !isRecord(value.apiEquivalentPriceReference) ||
    typeof value.apiEquivalentPriceReference.capturedAt !== 'string' ||
    value.apiEquivalentPriceReference.currency !== 'USD' ||
    !Array.isArray(value.apiEquivalentPriceReference.sources) ||
    value.apiEquivalentPriceReference.sources.length !== 2 ||
    !value.apiEquivalentPriceReference.sources.every((entry) => typeof entry === 'string') ||
    !isRecord(value.apiEquivalentPriceReference.perMillionTokens) ||
    !isPrice(value.apiEquivalentPriceReference.perMillionTokens.TERRA_XHIGH) ||
    !isPrice(value.apiEquivalentPriceReference.perMillionTokens.LUNA_MAX)
  ) {
    return false;
  }
  return value.conditions.every(
    (condition) =>
      isRecord(condition) &&
      (condition.id === 'TERRA_XHIGH' || condition.id === 'LUNA_MAX') &&
      (condition.requestedModel === 'gpt-5.6-terra' || condition.requestedModel === 'gpt-5.6-luna') &&
      (condition.reasoningEffort === 'xhigh' || condition.reasoningEffort === 'max') &&
      typeof condition.conditionFingerprint === 'string',
  );
}

export function validateAuthorBenchmarkCampaignPreparation(value: unknown): AuthorBenchmarkCampaignPreparationValidation {
  if (!isCampaignPreparation(value) || !campaignConfigurationValid(value)) {
    return { diagnostics: [{ code: 'CAMPAIGN_PREPARATION_INVALID', path: '/' }], valid: false };
  }
  return { campaign: value, diagnostics: [], valid: true };
}

function sameEnvironment(left: AuthorBenchmarkCampaignEnvironment, right: AuthorBenchmarkCampaignEnvironment): boolean {
  return (
    left.codexCliVersion === right.codexCliVersion &&
    left.codexHome === right.codexHome &&
    left.codexSdkVersion === right.codexSdkVersion &&
    left.nodeVersion === right.nodeVersion &&
    left.npmVersion === right.npmVersion &&
    left.promptfooVersion === right.promptfooVersion
  );
}

function campaignConfigurationValid(campaign: AuthorBenchmarkCampaignPreparation): boolean {
  return (
    campaign.schemaVersion === 1 &&
    campaign.invocationBudget === 16 &&
    campaign.actualAccountCost === 'UNKNOWN' &&
    campaign.apiEquivalentPriceReference.currency === 'USD' &&
    campaign.apiEquivalentPriceReference.capturedAt.length > 0 &&
    campaign.apiEquivalentPriceReference.sources.length === 2 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(campaign.campaignId) &&
    /^[a-f0-9]{64}$/.test(campaign.bundleFingerprint) &&
    /^[a-f0-9]{64}$/.test(campaign.reviewerQualificationFingerprint) &&
    campaign.conditions.length === 2 &&
    campaign.conditions.some(
      (condition) =>
        condition.id === 'TERRA_XHIGH' && condition.requestedModel === 'gpt-5.6-terra' && condition.reasoningEffort === 'xhigh',
    ) &&
    campaign.conditions.some(
      (condition) => condition.id === 'LUNA_MAX' && condition.requestedModel === 'gpt-5.6-luna' && condition.reasoningEffort === 'max',
    ) &&
    campaign.conditions.every((condition) => /^[a-f0-9]{64}$/.test(condition.conditionFingerprint)) &&
    campaign.reviewerIds[0] === 'reviewer-a' &&
    campaign.reviewerIds[1] === 'reviewer-b' &&
    campaign.stopRules.length > 0 &&
    campaign.reservationPath === `.skill-evidence/author-benchmark-reservations/${campaign.campaignId}.json` &&
    campaign.outputDirectory === `.skill-evidence/author-benchmark/${campaign.campaignId}` &&
    campaign.sanitizedReportPath.startsWith('docs/experiments/') &&
    campaign.sanitizedReportPolicy.publishAfter === 'ADJUDICATION_COMPLETE' &&
    campaign.sanitizedReportPolicy.includes.length > 0 &&
    campaign.sanitizedReportPolicy.excludes.length > 0
  );
}

export function evaluateAuthorBenchmarkCampaignPreflight(
  campaign: AuthorBenchmarkCampaignPreparation,
  evidence: AuthorBenchmarkPreflightEvidence,
): AuthorBenchmarkCampaignPreflightReport {
  const checks: AuthorBenchmarkCampaignPreflightReport['checks'] = [
    { id: 'CAMPAIGN_CONFIGURATION', status: campaignConfigurationValid(campaign) ? 'PASS' : 'FAIL' },
    {
      id: 'OFFLINE_INSTRUMENT_QUALIFIED',
      status:
        evidence.offlineQualificationResult === 'SUPPORTED_FOR_DEVELOPMENT' &&
        evidence.bundleFingerprint === campaign.bundleFingerprint &&
        evidence.reviewerQualificationResult === 'QUALIFIED' &&
        evidence.reviewerQualificationFingerprint === campaign.reviewerQualificationFingerprint &&
        evidence.scheduleCount === campaign.invocationBudget
          ? 'PASS'
          : 'FAIL',
    },
    {
      id: 'AUTHOR_CONDITIONS_FROZEN',
      status:
        evidence.conditionFingerprints.TERRA_XHIGH ===
          campaign.conditions.find((condition) => condition.id === 'TERRA_XHIGH')?.conditionFingerprint &&
        evidence.conditionFingerprints.LUNA_MAX ===
          campaign.conditions.find((condition) => condition.id === 'LUNA_MAX')?.conditionFingerprint
          ? 'PASS'
          : 'FAIL',
    },
    { id: 'EXACT_CLEAN_COMMIT', status: evidence.worktreeClean && /^[a-f0-9]{40}$/.test(evidence.currentCommit) ? 'PASS' : 'FAIL' },
    { id: 'ENVIRONMENT_VERSIONS', status: sameEnvironment(campaign.environment, evidence.environment) ? 'PASS' : 'FAIL' },
    {
      id: 'CHATGPT_AUTHENTICATION',
      status:
        evidence.authentication.codexHome === campaign.environment.codexHome &&
        evidence.authentication.homeWritable &&
        evidence.authentication.authFileReadable
          ? 'PASS'
          : 'FAIL',
    },
    { id: 'API_KEY_VARIABLES_ABSENT', status: evidence.credentialVariablesAbsent ? 'PASS' : 'FAIL' },
    { id: 'RESERVATION_ABSENT', status: evidence.reservationExists ? 'FAIL' : 'PASS' },
    { id: 'OUTPUT_DIRECTORY_ABSENT', status: evidence.outputDirectoryExists ? 'FAIL' : 'PASS' },
    { id: 'OUTPUT_PARENT_WRITABLE', status: evidence.outputParentWritable ? 'PASS' : 'FAIL' },
  ];
  return {
    campaignFingerprint: sha256(campaign),
    campaignId: campaign.campaignId,
    checks,
    currentCommit: evidence.currentCommit,
    externalProviderCalls: 0,
    limitations: [
      'Preflight does not reserve a campaign or invoke either Author condition.',
      'Readable ChatGPT authentication proves local session presence, not model availability.',
      'READY_FOR_AUTHORIZATION requires a separate explicit authorization for exactly sixteen provider calls.',
    ],
    providerInvocations: 0,
    purpose: 'DEVELOPMENT',
    reservationCreated: false,
    result: checks.every((check) => check.status === 'PASS') ? 'READY_FOR_AUTHORIZATION' : 'BLOCKED',
    schemaVersion: 1,
  };
}
