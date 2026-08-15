import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  authorEvaluationBlueprint,
  prepareAuthorInvocation,
  type AuthorConditionSpec,
  type AuthorErrorCode,
  type AuthoringContext,
  type AuthorInvoker,
} from '../author/evaluation-author.js';
import { createAuthorPromptfooInvocation } from '../author/promptfoo-author-invoker.js';
import { validateEvaluationBlueprint, type BlueprintCandidate, type EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';

export interface AuthorOperabilityFingerprints {
  condition: string;
  instruction: string;
  oracle: string;
  packet: string;
  protocol: string;
  schema: string;
  snapshot: string;
}

export interface AuthorProtocolV3CanaryFingerprints extends AuthorOperabilityFingerprints {
  authorInstrument: string;
  authoringContext: string;
  candidateSchema: string;
  compositionPolicy: string;
  resolutionPolicy: string;
  reviewerInstructions: string;
  reviewerProbes: string;
}

type AuthorOperabilityCondition =
  | { conditionFingerprint: string; reasoningEffort: 'max'; requestedModel: 'gpt-5.6-luna' }
  | { conditionFingerprint: string; reasoningEffort: 'xhigh'; requestedModel: 'gpt-5.6-terra' };

export interface HistoricalAuthorOperabilityCampaignPreparation {
  campaignId: string;
  condition: AuthorOperabilityCondition;
  fingerprints: AuthorOperabilityFingerprints;
  invocationBudget: 1;
  oraclePath: string;
  outputDirectory: string;
  protocolVersion: 2;
  reservationPath: string;
  sanitizedReportPath: string;
  schemaVersion: 1;
  skillPath: string;
  timeouts: { maxEvalTimeMs: number; timeoutMs: number };
}

export interface AuthorProtocolV3CanaryPreparation {
  authoringContextPath: string;
  campaignId: 'e22-terra-xhigh-protocol-v3-canary-20260814-r1';
  condition: Extract<AuthorOperabilityCondition, { requestedModel: 'gpt-5.6-terra' }>;
  fingerprints: AuthorProtocolV3CanaryFingerprints;
  invocationBudget: 1;
  oraclePath: string;
  outputDirectory: string;
  policy: 'PROTOCOL_V3_CANARY';
  pricingEstimate: {
    actualChatGptCost: 'UNKNOWN';
    asOf: '2026-08-14';
    basis: 'API_EQUIVALENT';
    cachedInputUsdPerMillionTokens: 0.2;
    currency: 'USD';
    inputUsdPerMillionTokens: 2;
    outputUsdPerMillionTokens: 12;
    source: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra';
  };
  protocolVersion: 3;
  reservationPath: string;
  review: {
    independentReviewers: 2;
    qualifyBeforeCandidateExposure: true;
    resolveOnlyDisagreements: true;
    resolutionPolicyPath: string;
    reviewerInstructionsPath: string;
    reviewerProbesPath: string;
  };
  sanitizedReportPath: string;
  schemaVersion: 2;
  skillPath: string;
  stoppingRules: { maxProviderInvocations: 1; retries: 0; terminalAfterReservation: true };
  timeouts: { maxEvalTimeMs: 660_000; timeoutMs: 600_000 };
}

export type AuthorOperabilityCampaignPreparation = HistoricalAuthorOperabilityCampaignPreparation | AuthorProtocolV3CanaryPreparation;

export interface AuthorOperabilityEnvironment {
  codexCliVersion: string;
  codexSdkVersion: string;
  nodeVersion: string;
  npmVersion: string;
  promptfooVersion: string;
}

export interface AuthorOperabilityPreflightEvidence {
  authentication: { codexHome: string; homeWritable: boolean; loginStatus: 'AUTHENTICATED' | 'UNAVAILABLE' };
  credentialVariablesAbsent: boolean;
  currentCommit: string;
  derivedFingerprints: AuthorOperabilityFingerprints;
  environment: AuthorOperabilityEnvironment;
  expectedCommit: string;
  invocationConfigurationValid: boolean;
  localQualificationResult: 'BLOCKED' | 'SUPPORTED_FOR_DEVELOPMENT';
  outputExists: boolean;
  packetBlind: boolean;
  reservationExists: boolean;
  terminalReceiptExists: boolean;
  upstreamAligned: boolean;
  worktreeClean: boolean;
}

export interface AuthorOperabilityPreflightReport {
  campaignFingerprint: string;
  campaignId: string;
  checks: Array<{ id: string; status: 'FAIL' | 'PASS' }>;
  currentCommit: string;
  expectedCommit: string;
  externalProviderCalls: 0;
  limitations: string[];
  providerInvocations: 0;
  purpose: 'DEVELOPMENT';
  reservationCreated: false;
  result: 'BLOCKED' | 'READY_FOR_AUTHORIZATION';
  schemaVersion: 1;
}

export type AuthorOperabilityOutcome =
  'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET' | 'INSUFFICIENT' | 'INVALIDATED' | 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET';

export type AuthorViabilityDecision =
  'INSUFFICIENT' | 'INVALIDATED' | 'NOT_VIABLE_FOR_AUTHOR' | 'PENDING_SEMANTIC_REVIEW' | 'VIABLE_CANDIDATE';

export type AuthorComparisonConclusion =
  | 'INSUFFICIENT'
  | 'PENDING_SEMANTIC_REVIEW'
  | 'SHARED_INSTRUMENT_FAILURE_SUPPORTED'
  | 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
  | 'TERRA_PASSES_CURRENT_INSTRUMENT';

type ProtocolV3CanaryTerminalObservation =
  | {
      elapsedMs: number;
      lifecycle: 'BLOCKED' | 'DRAFT' | 'READY';
      status: 'COMPLETED';
      timeoutMs: number;
    }
  | {
      errorCode: AuthorErrorCode;
      providerTimedOut: boolean;
      status: 'ERROR';
    };

export function classifyProtocolV3CanaryTerminal(observation: ProtocolV3CanaryTerminalObservation): {
  operabilityOutcome: AuthorOperabilityOutcome;
  viabilityDecision: AuthorViabilityDecision;
} {
  if (observation.status === 'COMPLETED') {
    if (observation.elapsedMs > observation.timeoutMs) {
      return {
        operabilityOutcome: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR',
      };
    }
    if (observation.lifecycle === 'READY') {
      return { operabilityOutcome: 'INVALIDATED', viabilityDecision: 'INVALIDATED' };
    }
    return {
      operabilityOutcome: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
      viabilityDecision: observation.lifecycle === 'BLOCKED' ? 'PENDING_SEMANTIC_REVIEW' : 'NOT_VIABLE_FOR_AUTHOR',
    };
  }
  if (observation.errorCode === 'COMPOSED_BLUEPRINT_INVALID') {
    return { operabilityOutcome: 'INVALIDATED', viabilityDecision: 'INVALIDATED' };
  }
  if (observation.errorCode === 'PROVIDER_ERROR') {
    return observation.providerTimedOut
      ? {
          operabilityOutcome: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
          viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR',
        }
      : { operabilityOutcome: 'INSUFFICIENT', viabilityDecision: 'INSUFFICIENT' };
  }
  return { operabilityOutcome: 'INSUFFICIENT', viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR' };
}

export interface AuthorOperabilityRunResult {
  collectionPersisted: boolean;
  comparisonConclusion: AuthorComparisonConclusion | null;
  operabilityOutcome: AuthorOperabilityOutcome;
  providerInvocations: 0 | 1;
  terminalReceiptPath: string;
  viabilityDecision: AuthorViabilityDecision | null;
}

export interface InspectedAuthorOperabilityCampaign {
  fingerprints: AuthorOperabilityFingerprints | AuthorProtocolV3CanaryFingerprints;
  invocationConfigurationValid: boolean;
  packet: string;
  packetBlind: boolean;
}

const campaignProfiles = {
  'e18-luna-max-locale-catalog-20260812-r1': {
    condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
    maxEvalTimeMs: 660_000,
    oraclePath: 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/oracle.json',
    policy: 'HISTORICAL_OPERABILITY',
    timeoutMs: 600_000,
  },
  'e19-luna-max-locale-catalog-20260813-r1': {
    condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
    maxEvalTimeMs: 1_860_000,
    oraclePath: 'evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json',
    policy: 'LUNA_VIABILITY',
    timeoutMs: 1_800_000,
  },
  'e20-terra-xhigh-locale-catalog-20260813-r1': {
    condition: { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' },
    maxEvalTimeMs: 1_860_000,
    oraclePath: 'evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json',
    policy: 'TERRA_CONTRAST',
    timeoutMs: 1_800_000,
  },
  'e22-terra-xhigh-protocol-v3-canary-20260814-r1': {
    condition: { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' },
    maxEvalTimeMs: 660_000,
    oraclePath: 'evaluations/refactor-design/e5-author-operability/terra-xhigh-protocol-v3-canary-r1/oracle.json',
    policy: 'PROTOCOL_V3_CANARY',
    timeoutMs: 600_000,
  },
} as const;

export function authorOperabilityCampaignPolicy(
  campaign: AuthorOperabilityCampaignPreparation,
): (typeof campaignProfiles)[keyof typeof campaignProfiles]['policy'] {
  return campaignProfiles[campaign.campaignId as keyof typeof campaignProfiles].policy;
}

function isViabilityCampaign(campaign: AuthorOperabilityCampaignPreparation): boolean {
  return authorOperabilityCampaignPolicy(campaign) === 'LUNA_VIABILITY';
}

function isTerraContrastCampaign(campaign: AuthorOperabilityCampaignPreparation): boolean {
  return authorOperabilityCampaignPolicy(campaign) === 'TERRA_CONTRAST';
}

function isProtocolV3Canary(campaign: AuthorOperabilityCampaignPreparation): campaign is AuthorProtocolV3CanaryPreparation {
  return campaign.schemaVersion === 2 && authorOperabilityCampaignPolicy(campaign) === 'PROTOCOL_V3_CANARY';
}

function usesProviderTimeoutPolicy(campaign: AuthorOperabilityCampaignPreparation): boolean {
  return isViabilityCampaign(campaign) || isTerraContrastCampaign(campaign) || isProtocolV3Canary(campaign);
}

function candidateFromBlueprint(blueprint: EvaluationBlueprint): BlueprintCandidate {
  return Object.fromEntries(
    Object.entries(blueprint).filter(
      ([key]) => !['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint'].includes(key),
    ),
  ) as BlueprintCandidate;
}

function reproducesSharedEvidenceTaxonomyFailure(blueprint: EvaluationBlueprint): boolean {
  const candidate = candidateFromBlueprint(blueprint);
  const contractIndex = candidate.contracts?.findIndex((contract) => contract.id === 'contract_no_entries') ?? -1;
  const validation = validateEvaluationBlueprint(candidate);
  return (
    contractIndex >= 0 &&
    validation.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'MANDATORY_DIRECT_EVIDENCE_MISSING' && diagnostic.path === `/contracts/${contractIndex}/evidenceRequired`,
    ) &&
    candidate.evidencePlan?.some(
      (evidence) => evidence.required && evidence.evidenceType === 'SEMANTIC' && evidence.contractIds.includes('contract_no_entries'),
    ) === true
  );
}

function authorCondition(campaign: AuthorOperabilityCampaignPreparation): AuthorConditionSpec {
  return campaign.condition.requestedModel === 'gpt-5.6-luna'
    ? { model: 'gpt-5.6-luna', reasoningEffort: 'max' }
    : { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' };
}

function fingerprintsValid(value: AuthorOperabilityFingerprints): boolean {
  return (
    /^[a-f0-9]{64}$/u.test(value.condition) &&
    /^[a-f0-9]{64}$/u.test(value.instruction) &&
    /^[a-f0-9]{64}$/u.test(value.oracle) &&
    /^[a-f0-9]{64}$/u.test(value.packet) &&
    /^[a-f0-9]{64}$/u.test(value.protocol) &&
    /^[a-f0-9]{64}$/u.test(value.schema) &&
    /^[a-f0-9]{64}$/u.test(value.snapshot)
  );
}

function protocolV3FingerprintsValid(value: AuthorProtocolV3CanaryFingerprints): boolean {
  return (
    fingerprintsValid(value) &&
    /^[a-f0-9]{64}$/u.test(value.authorInstrument) &&
    /^[a-f0-9]{64}$/u.test(value.authoringContext) &&
    /^[a-f0-9]{64}$/u.test(value.candidateSchema) &&
    /^[a-f0-9]{64}$/u.test(value.compositionPolicy) &&
    /^[a-f0-9]{64}$/u.test(value.resolutionPolicy) &&
    /^[a-f0-9]{64}$/u.test(value.reviewerInstructions) &&
    /^[a-f0-9]{64}$/u.test(value.reviewerProbes)
  );
}

function hasExactKeys(value: object, expected: string[]): boolean {
  return canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function validateHistoricalPreparation(campaign: Partial<HistoricalAuthorOperabilityCampaignPreparation>): boolean {
  const profile =
    typeof campaign.campaignId === 'string' ? campaignProfiles[campaign.campaignId as keyof typeof campaignProfiles] : undefined;
  return (
    campaign.schemaVersion === 1 &&
    profile !== undefined &&
    profile.policy !== 'PROTOCOL_V3_CANARY' &&
    campaign.invocationBudget === 1 &&
    campaign.protocolVersion === 2 &&
    campaign.condition?.requestedModel === profile.condition.model &&
    campaign.condition.reasoningEffort === profile.condition.reasoningEffort &&
    typeof campaign.condition.conditionFingerprint === 'string' &&
    /^[a-f0-9]{64}$/u.test(campaign.condition.conditionFingerprint) &&
    campaign.timeouts?.timeoutMs === profile.timeoutMs &&
    campaign.timeouts.maxEvalTimeMs === profile.maxEvalTimeMs &&
    typeof campaign.fingerprints === 'object' &&
    campaign.fingerprints !== null &&
    fingerprintsValid(campaign.fingerprints) &&
    campaign.condition.conditionFingerprint === campaign.fingerprints.condition &&
    campaign.skillPath === 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/skill' &&
    campaign.oraclePath === profile.oraclePath &&
    campaign.reservationPath === `.skill-evidence/author-operability-reservations/${campaign.campaignId}.json` &&
    campaign.outputDirectory === `.skill-evidence/author-operability/${campaign.campaignId}` &&
    campaign.sanitizedReportPath === `docs/experiments/${campaign.campaignId}.json`
  );
}

function validateProtocolV3CanaryPreparation(campaign: Partial<AuthorProtocolV3CanaryPreparation>): boolean {
  const campaignId = 'e22-terra-xhigh-protocol-v3-canary-20260814-r1';
  const root = 'evaluations/refactor-design/e5-author-operability/terra-xhigh-protocol-v3-canary-r1';
  return (
    hasExactKeys(campaign, [
      'authoringContextPath',
      'campaignId',
      'condition',
      'fingerprints',
      'invocationBudget',
      'oraclePath',
      'outputDirectory',
      'policy',
      'pricingEstimate',
      'protocolVersion',
      'reservationPath',
      'review',
      'sanitizedReportPath',
      'schemaVersion',
      'skillPath',
      'stoppingRules',
      'timeouts',
    ]) &&
    campaign.schemaVersion === 2 &&
    campaign.campaignId === campaignId &&
    campaign.policy === 'PROTOCOL_V3_CANARY' &&
    campaign.invocationBudget === 1 &&
    campaign.protocolVersion === 3 &&
    campaign.condition?.requestedModel === 'gpt-5.6-terra' &&
    campaign.condition.reasoningEffort === 'xhigh' &&
    typeof campaign.condition.conditionFingerprint === 'string' &&
    /^[a-f0-9]{64}$/u.test(campaign.condition.conditionFingerprint) &&
    campaign.timeouts?.timeoutMs === 600_000 &&
    campaign.timeouts.maxEvalTimeMs === 660_000 &&
    campaign.stoppingRules?.maxProviderInvocations === 1 &&
    campaign.stoppingRules.retries === 0 &&
    campaign.stoppingRules.terminalAfterReservation === true &&
    campaign.review?.independentReviewers === 2 &&
    campaign.review.qualifyBeforeCandidateExposure === true &&
    campaign.review.resolveOnlyDisagreements === true &&
    hasExactKeys(campaign.review, [
      'independentReviewers',
      'qualifyBeforeCandidateExposure',
      'resolutionPolicyPath',
      'resolveOnlyDisagreements',
      'reviewerInstructionsPath',
      'reviewerProbesPath',
    ]) &&
    campaign.review.reviewerInstructionsPath === `${root}/reviewer-instructions.md` &&
    campaign.review.resolutionPolicyPath === `${root}/resolution-policy.md` &&
    campaign.review.reviewerProbesPath === `${root}/reviewer-probes.json` &&
    typeof campaign.fingerprints === 'object' &&
    campaign.fingerprints !== null &&
    hasExactKeys(campaign.fingerprints, [
      'authorInstrument',
      'authoringContext',
      'candidateSchema',
      'compositionPolicy',
      'condition',
      'instruction',
      'oracle',
      'packet',
      'protocol',
      'resolutionPolicy',
      'reviewerInstructions',
      'reviewerProbes',
      'schema',
      'snapshot',
    ]) &&
    protocolV3FingerprintsValid(campaign.fingerprints) &&
    campaign.condition.conditionFingerprint === campaign.fingerprints.condition &&
    campaign.authoringContextPath === `${root}/authoring-context.json` &&
    campaign.skillPath === `${root}/skill` &&
    campaign.oraclePath === `${root}/oracle.json` &&
    campaign.pricingEstimate?.actualChatGptCost === 'UNKNOWN' &&
    campaign.pricingEstimate.asOf === '2026-08-14' &&
    campaign.pricingEstimate.basis === 'API_EQUIVALENT' &&
    campaign.pricingEstimate.cachedInputUsdPerMillionTokens === 0.2 &&
    campaign.pricingEstimate.currency === 'USD' &&
    campaign.pricingEstimate.inputUsdPerMillionTokens === 2 &&
    campaign.pricingEstimate.outputUsdPerMillionTokens === 12 &&
    campaign.pricingEstimate.source === 'https://developers.openai.com/api/docs/models/gpt-5.6-terra' &&
    hasExactKeys(campaign.pricingEstimate, [
      'actualChatGptCost',
      'asOf',
      'basis',
      'cachedInputUsdPerMillionTokens',
      'currency',
      'inputUsdPerMillionTokens',
      'outputUsdPerMillionTokens',
      'source',
    ]) &&
    campaign.reservationPath === `.skill-evidence/author-operability-reservations/${campaignId}.json` &&
    campaign.outputDirectory === `.skill-evidence/author-operability/${campaignId}` &&
    campaign.sanitizedReportPath === `docs/experiments/${campaignId}.json`
  );
}

export function validateAuthorOperabilityCampaignPreparation(value: unknown): value is AuthorOperabilityCampaignPreparation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const campaign = value as Partial<AuthorOperabilityCampaignPreparation>;
  return campaign.schemaVersion === 1
    ? validateHistoricalPreparation(campaign as Partial<HistoricalAuthorOperabilityCampaignPreparation>)
    : validateProtocolV3CanaryPreparation(campaign as Partial<AuthorProtocolV3CanaryPreparation>);
}

function sameFingerprints(left: AuthorOperabilityFingerprints, right: AuthorOperabilityFingerprints): boolean {
  const leftRecord = left as unknown as Record<string, string>;
  const rightRecord = right as unknown as Record<string, string>;
  return hasExactKeys(left, Object.keys(right)) && Object.keys(leftRecord).every((key) => leftRecord[key] === rightRecord[key]);
}

function environmentValid(environment: AuthorOperabilityEnvironment): boolean {
  return (
    /^24\./u.test(environment.nodeVersion) &&
    /^11\./u.test(environment.npmVersion) &&
    environment.promptfooVersion === '0.122.0' &&
    environment.codexSdkVersion === '0.147.0' &&
    environment.codexCliVersion === '0.147.0'
  );
}

export async function inspectAuthorOperabilityCampaign(
  repositoryRoot: string,
  campaign: AuthorOperabilityCampaignPreparation,
): Promise<InspectedAuthorOperabilityCampaign> {
  const snapshot = await createSkillSnapshot({ rootDirectory: resolve(repositoryRoot, campaign.skillPath) });
  const authoringContext =
    campaign.schemaVersion === 2
      ? (JSON.parse(await readFile(resolve(repositoryRoot, campaign.authoringContextPath), 'utf8')) as AuthoringContext)
      : undefined;
  const prepared = prepareAuthorInvocation(snapshot, authorCondition(campaign), campaign.protocolVersion, authoringContext);
  const [oracleText, reviewerInstructions, reviewerProbesText, resolutionPolicy] = await Promise.all([
    readFile(resolve(repositoryRoot, campaign.oraclePath), 'utf8'),
    campaign.schemaVersion === 2
      ? readFile(resolve(repositoryRoot, campaign.review.reviewerInstructionsPath), 'utf8')
      : Promise.resolve(''),
    campaign.schemaVersion === 2 ? readFile(resolve(repositoryRoot, campaign.review.reviewerProbesPath), 'utf8') : Promise.resolve('{}'),
    campaign.schemaVersion === 2 ? readFile(resolve(repositoryRoot, campaign.review.resolutionPolicyPath), 'utf8') : Promise.resolve(''),
  ]);
  const oracle = JSON.parse(oracleText) as unknown;
  const reviewerProbes = JSON.parse(reviewerProbesText) as unknown;
  const invocation = createAuthorPromptfooInvocation({
    codexHome: '/home/renanfranca/.codex',
    observation: {
      codexPathOverride: '/temporary/codex-observation-proxy.cjs',
      environment: {},
      journalPath: '/temporary/codex-observation.ndjson',
    },
    request: prepared.request,
    timeouts: campaign.timeouts,
    workingDirectory: '/temporary/empty-workspace',
  });
  const provider = invocation.suite.providers[0]!.config;
  const packet = prepared.request.prompt;
  const historicalFingerprints: AuthorOperabilityFingerprints = {
    condition: prepared.conditionFingerprint,
    instruction: prepared.digests.instructionDigest,
    oracle: sha256(oracle),
    packet: prepared.packetFingerprint,
    protocol: prepared.digests.protocolDigest,
    schema: prepared.digests.schemaDigest,
    snapshot: snapshot.fingerprint,
  };
  return {
    fingerprints:
      campaign.schemaVersion === 1
        ? historicalFingerprints
        : {
            ...historicalFingerprints,
            authorInstrument: prepared.authorInstrumentFingerprint!,
            authoringContext: prepared.authoringContextFingerprint!,
            candidateSchema: prepared.digests.candidateSchemaDigest!,
            compositionPolicy: prepared.digests.compositionPolicyDigest!,
            resolutionPolicy: sha256(resolutionPolicy),
            reviewerInstructions: sha256(reviewerInstructions),
            reviewerProbes: sha256(reviewerProbes),
          },
    invocationConfigurationValid:
      invocation.options.timeoutMs === campaign.timeouts.timeoutMs &&
      invocation.options.maxEvalTimeMs === campaign.timeouts.maxEvalTimeMs &&
      invocation.options.maxConcurrency === 1 &&
      provider.model === campaign.condition.requestedModel &&
      provider.model_reasoning_effort === campaign.condition.reasoningEffort &&
      provider.maxRetries === 0 &&
      provider.enable_streaming &&
      !provider.cli_config.features.multi_agent &&
      provider.approval_policy === 'never' &&
      provider.sandbox_mode === 'read-only' &&
      !provider.network_access_enabled &&
      provider.web_search_mode === 'disabled',
    packet,
    packetBlind:
      !/expectedLifecycle|minimalChecks|oracle\.json|e5-author-benchmark|PENDING_SEMANTIC_REVIEW|VIABLE_CANDIDATE|reviewer-probes|stable-priority-rendering-preservation/u.test(
        packet,
      ),
  };
}

export function evaluateAuthorOperabilityPreflight(
  campaign: AuthorOperabilityCampaignPreparation,
  evidence: AuthorOperabilityPreflightEvidence,
): AuthorOperabilityPreflightReport {
  const checks: AuthorOperabilityPreflightReport['checks'] = [
    { id: 'CAMPAIGN_CONFIGURATION', status: validateAuthorOperabilityCampaignPreparation(campaign) ? 'PASS' : 'FAIL' },
    {
      id: 'EXACT_CLEAN_COMMIT',
      status:
        evidence.worktreeClean &&
        evidence.upstreamAligned &&
        /^[a-f0-9]{40}$/u.test(evidence.currentCommit) &&
        evidence.currentCommit === evidence.expectedCommit
          ? 'PASS'
          : 'FAIL',
    },
    { id: 'ENVIRONMENT_VERSIONS', status: environmentValid(evidence.environment) ? 'PASS' : 'FAIL' },
    {
      id: 'CHATGPT_AUTHENTICATION',
      status:
        evidence.authentication.codexHome === '/home/renanfranca/.codex' &&
        evidence.authentication.homeWritable &&
        evidence.authentication.loginStatus === 'AUTHENTICATED'
          ? 'PASS'
          : 'FAIL',
    },
    { id: 'API_KEY_VARIABLES_ABSENT', status: evidence.credentialVariablesAbsent ? 'PASS' : 'FAIL' },
    {
      id: 'CAMPAIGN_IDENTITIES',
      status:
        sameFingerprints(campaign.fingerprints, evidence.derivedFingerprints) &&
        campaign.condition.conditionFingerprint === evidence.derivedFingerprints.condition
          ? 'PASS'
          : 'FAIL',
    },
    { id: 'PACKET_BLINDNESS', status: evidence.packetBlind ? 'PASS' : 'FAIL' },
    { id: 'INVOCATION_CONFIGURATION', status: evidence.invocationConfigurationValid ? 'PASS' : 'FAIL' },
    {
      id: 'LOCAL_RUNNER_QUALIFIED',
      status: evidence.localQualificationResult === 'SUPPORTED_FOR_DEVELOPMENT' ? 'PASS' : 'FAIL',
    },
    { id: 'RESERVATION_ABSENT', status: evidence.reservationExists ? 'FAIL' : 'PASS' },
    { id: 'TERMINAL_RECEIPT_ABSENT', status: evidence.terminalReceiptExists ? 'FAIL' : 'PASS' },
    { id: 'OUTPUT_ABSENT', status: evidence.outputExists ? 'FAIL' : 'PASS' },
  ];
  return {
    campaignFingerprint: sha256(campaign),
    campaignId: campaign.campaignId,
    checks,
    currentCommit: evidence.currentCommit,
    expectedCommit: evidence.expectedCommit,
    externalProviderCalls: 0,
    limitations: [
      `Preflight does not reserve the campaign or invoke ${campaign.condition.requestedModel}.`,
      'ChatGPT login status does not prove account-specific model availability.',
      'READY_FOR_AUTHORIZATION requires separate approval for exactly one provider invocation.',
    ],
    providerInvocations: 0,
    purpose: 'DEVELOPMENT',
    reservationCreated: false,
    result: checks.every((check) => check.status === 'PASS') ? 'READY_FOR_AUTHORIZATION' : 'BLOCKED',
    schemaVersion: 1,
  };
}

async function createExclusiveJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

function terminalPath(reservationPath: string): string {
  return reservationPath.replace(/\.json$/u, '.terminal.json');
}

async function invalidateProtocolV3CanaryBeforeInvocation(input: {
  campaign: AuthorProtocolV3CanaryPreparation;
  commit: string;
  diagnosticCode: string;
  expectedCommit: string;
  repositoryRoot: string;
}): Promise<AuthorOperabilityRunResult> {
  const campaignFingerprint = sha256(input.campaign);
  const reservationPath = resolve(input.repositoryRoot, input.campaign.reservationPath);
  const receiptPath = terminalPath(reservationPath);
  const collectionPath = resolve(input.repositoryRoot, input.campaign.outputDirectory, 'collection.json');
  await createExclusiveJson(reservationPath, {
    campaignFingerprint,
    campaignId: input.campaign.campaignId,
    commit: input.commit,
    expectedCommit: input.expectedCommit,
    invocationBudget: 1,
    status: 'RESERVED',
  });
  let collectionPersisted = false;
  await createExclusiveJson(collectionPath, {
    campaignFingerprint,
    campaignId: input.campaign.campaignId,
    diagnostic: { code: input.diagnosticCode },
    operabilityOutcome: 'INVALIDATED',
    providerInvocations: 0,
    purpose: 'DEVELOPMENT',
    schemaVersion: 2,
    viabilityDecision: 'INVALIDATED',
  })
    .then(() => {
      collectionPersisted = true;
    })
    .catch(() => undefined);
  await createExclusiveJson(receiptPath, {
    campaignFingerprint,
    campaignId: input.campaign.campaignId,
    collectionPersisted,
    commit: input.commit,
    operabilityOutcome: 'INVALIDATED',
    providerInvocations: 0,
    status: 'TERMINAL',
    viabilityDecision: 'INVALIDATED',
  });
  return {
    collectionPersisted,
    comparisonConclusion: null,
    operabilityOutcome: 'INVALIDATED',
    providerInvocations: 0,
    terminalReceiptPath: receiptPath,
    viabilityDecision: 'INVALIDATED',
  };
}

export async function runAuthorOperabilityCampaign(input: {
  approval: string;
  currentCommit: () => Promise<string>;
  expectedCommit: string;
  inspectCampaign?: (repositoryRoot: string, campaign: AuthorOperabilityCampaignPreparation) => Promise<InspectedAuthorOperabilityCampaign>;
  invoke: AuthorInvoker;
  now?: () => number;
  preflight: AuthorOperabilityPreflightReport;
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
  workingTreeClean: () => Promise<boolean>;
}): Promise<AuthorOperabilityRunResult> {
  if (input.approval !== '1') throw new Error('OPERABILITY_APPROVAL_REQUIRED');
  if (
    input.preflight.result !== 'READY_FOR_AUTHORIZATION' ||
    input.preflight.expectedCommit !== input.expectedCommit ||
    input.preflight.campaignFingerprint !== sha256(input.preparation)
  ) {
    throw new Error('OPERABILITY_PREFLIGHT_BLOCKED');
  }
  const [currentCommit, clean] = await Promise.all([input.currentCommit(), input.workingTreeClean()]);
  if (!clean || currentCommit !== input.expectedCommit) {
    if (!isProtocolV3Canary(input.preparation)) throw new Error('OPERABILITY_COMMIT_DRIFT');
    return await invalidateProtocolV3CanaryBeforeInvocation({
      campaign: input.preparation,
      commit: currentCommit,
      diagnosticCode: 'COMMIT_DRIFT',
      expectedCommit: input.expectedCommit,
      repositoryRoot: input.repositoryRoot,
    });
  }

  const inspected = await (input.inspectCampaign ?? inspectAuthorOperabilityCampaign)(input.repositoryRoot, input.preparation);
  if (
    !sameFingerprints(input.preparation.fingerprints, inspected.fingerprints) ||
    !inspected.packetBlind ||
    !inspected.invocationConfigurationValid
  ) {
    if (!isProtocolV3Canary(input.preparation)) throw new Error('OPERABILITY_IDENTITY_DRIFT');
    return await invalidateProtocolV3CanaryBeforeInvocation({
      campaign: input.preparation,
      commit: currentCommit,
      diagnosticCode: 'IDENTITY_OR_BLINDNESS_DRIFT',
      expectedCommit: input.expectedCommit,
      repositoryRoot: input.repositoryRoot,
    });
  }

  const reservationPath = resolve(input.repositoryRoot, input.preparation.reservationPath);
  const receiptPath = terminalPath(reservationPath);
  const campaignFingerprint = sha256(input.preparation);
  await createExclusiveJson(reservationPath, {
    campaignFingerprint,
    campaignId: input.preparation.campaignId,
    commit: currentCommit,
    invocationBudget: 1,
    status: 'RESERVED',
  });

  const now = input.now ?? (() => performance.now());
  const startedAt = now();
  let collectionPersisted = false;
  let comparisonConclusion: AuthorComparisonConclusion | null = null;
  let operabilityOutcome: AuthorOperabilityOutcome = 'INSUFFICIENT';
  let viabilityDecision: AuthorViabilityDecision | null = null;
  let providerInvocations: 0 | 1 = 0;
  const collectionPath = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json');
  try {
    const snapshot = await createSkillSnapshot({ rootDirectory: resolve(input.repositoryRoot, input.preparation.skillPath) });
    const invoke: AuthorInvoker = (request) => {
      providerInvocations = 1;
      return input.invoke(request);
    };
    const run =
      input.preparation.schemaVersion === 2
        ? await authorEvaluationBlueprint({
            authoringContext: JSON.parse(
              await readFile(resolve(input.repositoryRoot, input.preparation.authoringContextPath), 'utf8'),
            ) as AuthoringContext,
            campaignId: input.preparation.campaignId,
            condition: authorCondition(input.preparation),
            invoke,
            protocolVersion: 3,
            snapshot,
          })
        : await authorEvaluationBlueprint({
            campaignId: input.preparation.campaignId,
            condition: authorCondition(input.preparation),
            invoke,
            protocolVersion: 2,
            snapshot,
          });
    const elapsedMs = Math.max(0, Math.round(now() - startedAt));
    const timedOutAtPromptfooStep =
      run.status === 'ERROR' &&
      run.error.code === 'PROVIDER_ERROR' &&
      run.error.diagnostic.category === 'TIMEOUT' &&
      run.providerObservation?.timeoutOwner === 'PROMPTFOO_STEP';
    const providerTimedOut = run.status === 'ERROR' && run.error.code === 'PROVIDER_ERROR' && run.error.diagnostic.category === 'TIMEOUT';
    const timedOutForCampaign = usesProviderTimeoutPolicy(input.preparation) ? providerTimedOut : timedOutAtPromptfooStep;
    operabilityOutcome =
      run.status === 'COMPLETED'
        ? elapsedMs <= input.preparation.timeouts.timeoutMs
          ? 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
          : 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
        : timedOutForCampaign
          ? 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
          : 'INSUFFICIENT';
    if (isViabilityCampaign(input.preparation)) {
      viabilityDecision =
        run.status === 'COMPLETED'
          ? elapsedMs <= input.preparation.timeouts.timeoutMs
            ? run.blueprint.lifecycle.state === 'BLOCKED'
              ? 'PENDING_SEMANTIC_REVIEW'
              : 'NOT_VIABLE_FOR_AUTHOR'
            : 'NOT_VIABLE_FOR_AUTHOR'
          : run.error.code !== 'PROVIDER_ERROR' || providerTimedOut
            ? 'NOT_VIABLE_FOR_AUTHOR'
            : 'INSUFFICIENT';
    }
    if (isTerraContrastCampaign(input.preparation)) {
      comparisonConclusion =
        run.status === 'COMPLETED'
          ? elapsedMs <= input.preparation.timeouts.timeoutMs
            ? run.blueprint.lifecycle.state === 'BLOCKED'
              ? 'PENDING_SEMANTIC_REVIEW'
              : reproducesSharedEvidenceTaxonomyFailure(run.blueprint)
                ? 'SHARED_INSTRUMENT_FAILURE_SUPPORTED'
                : 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
            : 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
          : run.error.code !== 'PROVIDER_ERROR' || providerTimedOut
            ? 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
            : 'INSUFFICIENT';
    }
    if (isProtocolV3Canary(input.preparation)) {
      const classification = classifyProtocolV3CanaryTerminal(
        run.status === 'COMPLETED'
          ? {
              elapsedMs,
              lifecycle: run.blueprint.lifecycle.state,
              status: 'COMPLETED',
              timeoutMs: input.preparation.timeouts.timeoutMs,
            }
          : { errorCode: run.error.code, providerTimedOut, status: 'ERROR' },
      );
      operabilityOutcome = classification.operabilityOutcome;
      viabilityDecision = classification.viabilityDecision;
    }
    const target300SecondsMet = run.status === 'COMPLETED' ? elapsedMs <= 300_000 : providerTimedOut ? false : null;
    const target600SecondsMet = run.status === 'COMPLETED' ? elapsedMs <= 600_000 : providerTimedOut ? false : null;
    const target1800SecondsMet = run.status === 'COMPLETED' ? elapsedMs <= 1_800_000 : providerTimedOut ? false : null;
    const collection =
      run.status === 'COMPLETED'
        ? {
            actualLifecycle: run.blueprint.lifecycle.state,
            blueprint: run.blueprint,
            campaignFingerprint,
            campaignId: input.preparation.campaignId,
            comparisonConclusion,
            elapsedMs,
            historicalTargetMet: elapsedMs <= 300_000,
            lifecycleExpectationMet: run.blueprint.lifecycle.state === 'BLOCKED',
            operabilityOutcome,
            providerInvocations,
            providerObservation: run.providerObservation ?? null,
            purpose: 'DEVELOPMENT',
            schemaVersion: input.preparation.schemaVersion,
            target1800SecondsMet,
            target300SecondsMet,
            target600SecondsMet,
            tokenUsage: run.tokenUsage,
            viabilityDecision,
          }
        : {
            campaignFingerprint,
            campaignId: input.preparation.campaignId,
            comparisonConclusion,
            diagnostic: run.error,
            elapsedMs,
            historicalTargetMet: null,
            lifecycleExpectationMet: null,
            operabilityOutcome,
            providerInvocations,
            providerObservation: run.providerObservation ?? null,
            purpose: 'DEVELOPMENT',
            schemaVersion: input.preparation.schemaVersion,
            target1800SecondsMet,
            target300SecondsMet,
            target600SecondsMet,
            tokenUsage: run.tokenUsage,
            viabilityDecision,
          };
    await createExclusiveJson(collectionPath, collection);
    collectionPersisted = true;
  } catch {
    if (providerInvocations === 0) operabilityOutcome = 'INVALIDATED';
    if (isViabilityCampaign(input.preparation)) viabilityDecision = 'INSUFFICIENT';
    if (isTerraContrastCampaign(input.preparation)) comparisonConclusion = 'INSUFFICIENT';
    if (isProtocolV3Canary(input.preparation)) viabilityDecision = providerInvocations === 0 ? 'INVALIDATED' : 'INSUFFICIENT';
    await mkdir(dirname(collectionPath), { recursive: true }).catch(() => undefined);
    await writeFile(
      collectionPath,
      `${canonicalJson({
        campaignFingerprint,
        campaignId: input.preparation.campaignId,
        comparisonConclusion,
        diagnostic: { code: providerInvocations === 0 ? 'PRE_INVOCATION_FAILURE' : 'COLLECTION_FAILURE' },
        operabilityOutcome,
        providerInvocations,
        viabilityDecision,
        purpose: 'DEVELOPMENT',
        schemaVersion: input.preparation.schemaVersion,
      })}\n`,
      { flag: 'wx', mode: 0o600 },
    )
      .then(() => {
        collectionPersisted = true;
      })
      .catch(() => undefined);
  }
  await createExclusiveJson(receiptPath, {
    campaignFingerprint,
    campaignId: input.preparation.campaignId,
    collectionPersisted,
    comparisonConclusion,
    commit: currentCommit,
    operabilityOutcome,
    providerInvocations,
    status: 'TERMINAL',
    viabilityDecision,
  });
  return {
    collectionPersisted,
    comparisonConclusion,
    operabilityOutcome,
    providerInvocations,
    terminalReceiptPath: receiptPath,
    viabilityDecision,
  };
}
