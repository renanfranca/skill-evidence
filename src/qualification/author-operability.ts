import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { authorEvaluationBlueprint, prepareAuthorInvocation, type AuthorInvoker } from '../author/evaluation-author.js';
import { createAuthorPromptfooInvocation } from '../author/promptfoo-author-invoker.js';
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

export interface AuthorOperabilityCampaignPreparation {
  campaignId: string;
  condition: {
    conditionFingerprint: string;
    reasoningEffort: 'max';
    requestedModel: 'gpt-5.6-luna';
  };
  fingerprints: AuthorOperabilityFingerprints;
  invocationBudget: 1;
  oraclePath: string;
  outputDirectory: string;
  protocolVersion: 2;
  reservationPath: string;
  sanitizedReportPath: string;
  schemaVersion: 1;
  skillPath: string;
  timeouts: { maxEvalTimeMs: 660_000; timeoutMs: 600_000 };
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

export interface AuthorOperabilityRunResult {
  collectionPersisted: boolean;
  operabilityOutcome: AuthorOperabilityOutcome;
  providerInvocations: 0 | 1;
  terminalReceiptPath: string;
}

export interface InspectedAuthorOperabilityCampaign {
  fingerprints: AuthorOperabilityFingerprints;
  invocationConfigurationValid: boolean;
  packet: string;
  packetBlind: boolean;
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
  return (
    campaign.schemaVersion === 1 &&
    campaign.campaignId === 'e18-luna-max-locale-catalog-20260812-r1' &&
    campaign.invocationBudget === 1 &&
    campaign.protocolVersion === 2 &&
    campaign.condition?.requestedModel === 'gpt-5.6-luna' &&
    campaign.condition.reasoningEffort === 'max' &&
    typeof campaign.condition.conditionFingerprint === 'string' &&
    /^[a-f0-9]{64}$/u.test(campaign.condition.conditionFingerprint) &&
    campaign.timeouts?.timeoutMs === 600_000 &&
    campaign.timeouts.maxEvalTimeMs === 660_000 &&
    typeof campaign.fingerprints === 'object' &&
    campaign.fingerprints !== null &&
    fingerprintsValid(campaign.fingerprints) &&
    campaign.condition.conditionFingerprint === campaign.fingerprints.condition &&
    campaign.skillPath === 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/skill' &&
    campaign.oraclePath === 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/oracle.json' &&
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
  const prepared = prepareAuthorInvocation(snapshot, { model: 'gpt-5.6-luna', reasoningEffort: 'max' }, 2);
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
      invocation.options.timeoutMs === 600_000 &&
      invocation.options.maxEvalTimeMs === 660_000 &&
      invocation.options.maxConcurrency === 1 &&
      provider.model === 'gpt-5.6-luna' &&
      provider.model_reasoning_effort === 'max' &&
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
  let operabilityOutcome: AuthorOperabilityOutcome = 'INSUFFICIENT';
  let providerInvocations: 0 | 1 = 0;
  const collectionPath = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json');
  try {
    const snapshot = await createSkillSnapshot({ rootDirectory: resolve(input.repositoryRoot, input.preparation.skillPath) });
    providerInvocations = 1;
    const run = await authorEvaluationBlueprint({
      campaignId: input.preparation.campaignId,
      condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
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
    operabilityOutcome =
      run.status === 'COMPLETED'
        ? elapsedMs <= input.preparation.timeouts.timeoutMs
          ? 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
          : 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
        : timedOutAtPromptfooStep
          ? 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
          : 'INSUFFICIENT';
    const collection =
      run.status === 'COMPLETED'
        ? {
            actualLifecycle: run.blueprint.lifecycle.state,
            blueprint: run.blueprint,
            campaignFingerprint,
            campaignId: input.preparation.campaignId,
            elapsedMs,
            historicalTargetMet: elapsedMs <= 300_000,
            lifecycleExpectationMet: run.blueprint.lifecycle.state === 'BLOCKED',
            operabilityOutcome,
            providerInvocations,
            providerObservation: run.providerObservation ?? null,
            purpose: 'DEVELOPMENT',
            schemaVersion: 1,
            tokenUsage: run.tokenUsage,
          }
        : {
            campaignFingerprint,
            campaignId: input.preparation.campaignId,
            diagnostic: run.error,
            elapsedMs,
            historicalTargetMet: null,
            lifecycleExpectationMet: null,
            operabilityOutcome,
            providerInvocations,
            providerObservation: run.providerObservation ?? null,
            purpose: 'DEVELOPMENT',
            schemaVersion: 1,
            tokenUsage: run.tokenUsage,
          };
    await createExclusiveJson(collectionPath, collection);
    collectionPersisted = true;
  } catch {
    if (providerInvocations === 0) operabilityOutcome = 'INVALIDATED';
    await mkdir(dirname(collectionPath), { recursive: true }).catch(() => undefined);
    await writeFile(
      collectionPath,
      `${canonicalJson({
        campaignFingerprint,
        campaignId: input.preparation.campaignId,
        diagnostic: { code: providerInvocations === 0 ? 'PRE_INVOCATION_FAILURE' : 'COLLECTION_FAILURE' },
        operabilityOutcome,
        providerInvocations,
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
    commit: currentCommit,
    operabilityOutcome,
    providerInvocations,
    status: 'TERMINAL',
  });
  return { collectionPersisted, operabilityOutcome, providerInvocations, terminalReceiptPath: receiptPath };
}
