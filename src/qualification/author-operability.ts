import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  authorEvaluationBlueprint,
  prepareAuthorInvocation,
  type AuthorConditionSpec,
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

type AuthorOperabilityCondition =
  | { conditionFingerprint: string; reasoningEffort: 'max'; requestedModel: 'gpt-5.6-luna' }
  | { conditionFingerprint: string; reasoningEffort: 'xhigh'; requestedModel: 'gpt-5.6-terra' };

export interface AuthorOperabilityCampaignPreparation {
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

export type AuthorViabilityDecision = 'INSUFFICIENT' | 'NOT_VIABLE_FOR_AUTHOR' | 'PENDING_SEMANTIC_REVIEW' | 'VIABLE_CANDIDATE';

export type AuthorComparisonConclusion =
  | 'INSUFFICIENT'
  | 'PENDING_SEMANTIC_REVIEW'
  | 'SHARED_INSTRUMENT_FAILURE_SUPPORTED'
  | 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
  | 'TERRA_PASSES_CURRENT_INSTRUMENT';

export interface AuthorOperabilityRunResult {
  collectionPersisted: boolean;
  comparisonConclusion: AuthorComparisonConclusion | null;
  operabilityOutcome: AuthorOperabilityOutcome;
  providerInvocations: 0 | 1;
  terminalReceiptPath: string;
  viabilityDecision: AuthorViabilityDecision | null;
}

export interface InspectedAuthorOperabilityCampaign {
  fingerprints: AuthorOperabilityFingerprints;
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

function usesThirtyMinuteTimeoutPolicy(campaign: AuthorOperabilityCampaignPreparation): boolean {
  return isViabilityCampaign(campaign) || isTerraContrastCampaign(campaign);
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

export function validateAuthorOperabilityCampaignPreparation(value: unknown): value is AuthorOperabilityCampaignPreparation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const campaign = value as Partial<AuthorOperabilityCampaignPreparation>;
  const profile =
    typeof campaign.campaignId === 'string' ? campaignProfiles[campaign.campaignId as keyof typeof campaignProfiles] : undefined;
  return (
    campaign.schemaVersion === 1 &&
    profile !== undefined &&
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

function sameFingerprints(left: AuthorOperabilityFingerprints, right: AuthorOperabilityFingerprints): boolean {
  return Object.keys(left).every(
    (key) => left[key as keyof AuthorOperabilityFingerprints] === right[key as keyof AuthorOperabilityFingerprints],
  );
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
  const prepared = prepareAuthorInvocation(snapshot, authorCondition(campaign), 2);
  const oracle = JSON.parse(await readFile(resolve(repositoryRoot, campaign.oraclePath), 'utf8')) as unknown;
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
  return {
    fingerprints: {
      condition: prepared.conditionFingerprint,
      instruction: prepared.digests.instructionDigest,
      oracle: sha256(oracle),
      packet: prepared.packetFingerprint,
      protocol: prepared.digests.protocolDigest,
      schema: prepared.digests.schemaDigest,
      snapshot: snapshot.fingerprint,
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
    packetBlind: !/expectedLifecycle|minimalChecks|oracle\.json|e5-author-benchmark/u.test(packet),
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
      'Preflight does not reserve the campaign or invoke Luna/max.',
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
  if (!clean || currentCommit !== input.expectedCommit) throw new Error('OPERABILITY_COMMIT_DRIFT');

  const inspected = await (input.inspectCampaign ?? inspectAuthorOperabilityCampaign)(input.repositoryRoot, input.preparation);
  if (
    !sameFingerprints(input.preparation.fingerprints, inspected.fingerprints) ||
    !inspected.packetBlind ||
    !inspected.invocationConfigurationValid
  ) {
    throw new Error('OPERABILITY_IDENTITY_DRIFT');
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
    providerInvocations = 1;
    const run = await authorEvaluationBlueprint({
      campaignId: input.preparation.campaignId,
      condition: authorCondition(input.preparation),
      invoke: input.invoke,
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
    const timedOutForCampaign = usesThirtyMinuteTimeoutPolicy(input.preparation) ? providerTimedOut : timedOutAtPromptfooStep;
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
            schemaVersion: 1,
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
            schemaVersion: 1,
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
        schemaVersion: 1,
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
