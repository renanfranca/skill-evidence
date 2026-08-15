import { mkdir, open, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { AuthorErrorCode } from '../author/evaluation-author.js';
import type { EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { validateComposedEvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { canonicalFrozenCopy } from '../canonical-frozen.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot, type IncludedSkillFile } from '../intake/skill-snapshot.js';
import {
  createAuthorViabilityResolutionPacket,
  createAuthorViabilityReviewPacket,
  createAuthorViabilityReviewerQualificationPacket,
  createAuthorViabilityReviewerQualificationSubmission,
  createAuthorViabilityReviewerSubmission,
  qualifyAuthorViabilityReviewers,
  resolveAuthorViabilityReview,
  validateAuthorViabilityOracle,
  validateAuthorViabilityReviewPacket,
  validateAuthorViabilityReviewerContinuity,
  validateAuthorViabilityReviewerProbeSet,
  validateAuthorViabilityReviewerSubmission,
  type AuthorViabilityJudgment,
  type AuthorViabilityOracle,
  type AuthorViabilityResolutionPacket,
  type AuthorViabilityReviewPacket,
  type AuthorViabilityReviewerQualificationInput,
  type AuthorViabilityReviewerQualificationPacket,
  type AuthorViabilityReviewerProbeSet,
  type AuthorViabilityReviewerQualificationSubmission,
  type AuthorViabilityReviewerSubmission,
} from './author-viability-review.js';
import {
  authorOperabilityCampaignPolicy,
  classifyProtocolV3CanaryTerminal,
  inspectAuthorOperabilityCampaign,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorComparisonConclusion,
  type AuthorOperabilityCampaignPreparation,
  type AuthorProtocolV3CanaryPreparation,
  type AuthorViabilityDecision,
} from './author-operability.js';
import { assertConfinedArtifactPath, publishJsonNoReplace, readConfinedJson } from './author-artifact-store.js';

interface CompletedViabilityCollection {
  actualLifecycle: string;
  blueprint: EvaluationBlueprint;
  campaignFingerprint: string;
  campaignId: string;
  comparisonConclusion: AuthorComparisonConclusion | null;
  elapsedMs: number;
  operabilityOutcome: string;
  providerInvocations: number;
  providerObservation: unknown;
  target1800SecondsMet: boolean;
  target300SecondsMet: boolean;
  target600SecondsMet: boolean;
  tokenUsage: unknown;
  viabilityDecision: AuthorViabilityDecision;
}

export interface AuthorViabilityMaterializationRepositoryState {
  currentCommit: string;
  trackedWorktreeClean: boolean;
}

type InspectMaterializationRepositoryState = (repositoryRoot: string) => Promise<AuthorViabilityMaterializationRepositoryState>;

const execFileAsync = promisify(execFile);

export interface AuthorViabilityReviewerInput {
  judgments: AuthorViabilityJudgment[];
  principalFingerprint?: string;
  reviewerId: 'reviewer-a' | 'reviewer-b';
  sessionFingerprint?: string;
}

function hasExactKeys(value: object, keys: string[]): boolean {
  return canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function validNullableMetrics(value: unknown, keys: string[]): boolean {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !hasExactKeys(value, keys)) return false;
  return Object.values(value).every((entry) => entry === null || (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0));
}

function validProviderObservation(value: unknown): boolean {
  if (value === null) return true;
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !hasExactKeys(value, [
      'cancellationObserved',
      'cancellationRequested',
      'firstProgressAtMs',
      'lastObservedStage',
      'lastProgressAtMs',
      'progressObserved',
      'timeoutOwner',
    ])
  ) {
    return false;
  }
  const observation = value as Record<string, unknown>;
  return (
    [observation.cancellationObserved, observation.cancellationRequested, observation.progressObserved].every(
      (entry) => entry === null || typeof entry === 'boolean',
    ) &&
    [observation.firstProgressAtMs, observation.lastProgressAtMs].every(
      (entry) => entry === null || (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0),
    ) &&
    ['ACTIVITY', 'NONE', 'PROCESS', 'PROCESS_EXIT', 'THREAD', 'TURN', 'TURN_COMPLETED', 'TURN_FAILED', 'UNKNOWN'].includes(
      observation.lastObservedStage as string,
    ) &&
    (observation.timeoutOwner === null ||
      ['CODEX_TURN', 'PROMPTFOO_EVALUATION', 'PROMPTFOO_STEP', 'UNKNOWN'].includes(observation.timeoutOwner as string))
  );
}

function validTerminalDiagnostic(value: unknown, providerInvocations: 0 | 1): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const diagnostic = value as Record<string, unknown>;
  if (hasExactKeys(diagnostic, ['code'])) {
    return providerInvocations === 0
      ? [
          'COMMIT_DRIFT',
          'FROZEN_INPUT_READ_FAILURE',
          'IDENTITY_OR_BLINDNESS_DRIFT',
          'ORPHANED_RESERVATION',
          'PRE_INVOCATION_FAILURE',
        ].includes(diagnostic.code as string)
      : ['CANDIDATE_STRUCTURALLY_INVALID', 'COMPOSED_BLUEPRINT_INVALID', 'INVALID_JSON'].includes(diagnostic.code as string);
  }
  if (!hasExactKeys(diagnostic, ['code', 'diagnostic']) || diagnostic.code !== 'PROVIDER_ERROR') return false;
  if (
    providerInvocations !== 1 ||
    typeof diagnostic.diagnostic !== 'object' ||
    diagnostic.diagnostic === null ||
    Array.isArray(diagnostic.diagnostic) ||
    !hasExactKeys(diagnostic.diagnostic, ['category', 'code', 'stage'])
  ) {
    return false;
  }
  const provider = diagnostic.diagnostic as Record<string, unknown>;
  return (
    ['AUTHENTICATION', 'CONFIGURATION', 'MODEL_ACCESS', 'PROCESS', 'RATE_LIMIT', 'TIMEOUT', 'UNKNOWN'].includes(
      provider.category as string,
    ) &&
    ['ABORTED', 'EXIT_NONZERO', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_429', 'NO_RESULT', 'NO_TEXT', 'UNCLASSIFIED'].includes(
      provider.code as string,
    ) &&
    ['EVALUATION', 'OUTPUT', 'RESULT'].includes(provider.stage as string)
  );
}

async function writeExclusive(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function readOptionalJson(path: string, repositoryRoot?: string): Promise<unknown> {
  try {
    return repositoryRoot === undefined ? await readJson(path) : await readConfinedJson(repositoryRoot, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function assertManifest(path: string, expected: unknown, repositoryRoot?: string): Promise<void> {
  try {
    const actual = repositoryRoot === undefined ? await readJson(path) : await readConfinedJson(repositoryRoot, path);
    if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error('manifest');
  } catch {
    throw new Error('AUTHOR_VIABILITY_MANIFEST_INVALID');
  }
}

function isTerraContrast(preparation: AuthorOperabilityCampaignPreparation): boolean {
  return authorOperabilityCampaignPolicy(preparation) === 'TERRA_CONTRAST';
}

function assertReviewCampaign(preparation: AuthorOperabilityCampaignPreparation): void {
  if (authorOperabilityCampaignPolicy(preparation) === 'HISTORICAL_OPERABILITY') {
    throw new Error('AUTHOR_VIABILITY_CAMPAIGN_REQUIRED');
  }
}

interface FrozenProtocolV3ReviewContext {
  oracle: AuthorViabilityOracle;
  packet: AuthorViabilityReviewPacket;
  qualificationPacket: AuthorViabilityReviewerQualificationPacket;
  reviewerProbes: AuthorViabilityReviewerProbeSet;
}

interface FrozenProtocolV3ReviewMaterial {
  oracle: AuthorViabilityOracle;
  reviewerProbes: AuthorViabilityReviewerProbeSet;
  skillFiles: IncludedSkillFile[];
}

async function loadFrozenProtocolV3ReviewMaterial(
  preparation: AuthorProtocolV3CanaryPreparation,
  repositoryRoot: string,
): Promise<FrozenProtocolV3ReviewMaterial> {
  const inspected = await inspectAuthorOperabilityCampaign(repositoryRoot, preparation);
  const reviewMaterial = inspected.reviewMaterial;
  const oracle = reviewMaterial?.oracle;
  const reviewerProbes = reviewMaterial?.reviewerProbes;
  if (
    canonicalJson(inspected.fingerprints) !== canonicalJson(preparation.fingerprints) ||
    !inspected.packetBlind ||
    !inspected.invocationConfigurationValid ||
    preparation.condition.conditionFingerprint !== inspected.fingerprints.condition ||
    reviewMaterial === undefined ||
    !validateAuthorViabilityOracle(oracle) ||
    !validateAuthorViabilityReviewerProbeSet(reviewerProbes)
  ) {
    throw new Error('AUTHOR_VIABILITY_FROZEN_INPUT_INTEGRITY');
  }
  return { oracle, reviewerProbes, skillFiles: reviewMaterial.skillFiles };
}

function createFrozenProtocolV3ReviewContext(
  material: FrozenProtocolV3ReviewMaterial,
  blueprint: EvaluationBlueprint,
): FrozenProtocolV3ReviewContext {
  return canonicalFrozenCopy({
    oracle: material.oracle,
    packet: createAuthorViabilityReviewPacket({
      blueprint,
      oracle: material.oracle,
      skillFiles: material.skillFiles,
    }),
    qualificationPacket: createAuthorViabilityReviewerQualificationPacket(material.reviewerProbes),
    reviewerProbes: material.reviewerProbes,
  });
}

async function deriveFrozenProtocolV3ReviewContext(
  preparation: AuthorProtocolV3CanaryPreparation,
  repositoryRoot: string,
  blueprint: EvaluationBlueprint,
): Promise<FrozenProtocolV3ReviewContext> {
  return createFrozenProtocolV3ReviewContext(await loadFrozenProtocolV3ReviewMaterial(preparation, repositoryRoot), blueprint);
}

function collectionDecision(
  value: object,
  preparation: AuthorOperabilityCampaignPreparation,
): AuthorComparisonConclusion | AuthorViabilityDecision | undefined {
  const collection = value as Record<string, unknown>;
  return isTerraContrast(preparation)
    ? (collection.comparisonConclusion as AuthorComparisonConclusion | undefined)
    : (collection.viabilityDecision as AuthorViabilityDecision | undefined);
}

function terminalReceiptPath(reservationPath: string): string {
  return reservationPath.replace(/\.json$/u, '.terminal.json');
}

async function inspectMaterializationRepositoryState(repositoryRoot: string): Promise<AuthorViabilityMaterializationRepositoryState> {
  const [{ stdout: currentCommit }, { stdout: trackedStatus }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }),
    execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: repositoryRoot, encoding: 'utf8' }),
  ]);
  return { currentCommit: currentCommit.trim(), trackedWorktreeClean: trackedStatus.trim().length === 0 };
}

async function assertProtocolV3MaterializationCommitFreeze(input: {
  inspectRepositoryState?: InspectMaterializationRepositoryState;
  preparation: AuthorProtocolV3CanaryPreparation;
  repositoryRoot: string;
}): Promise<string> {
  const reservation = await readConfinedJson(input.repositoryRoot, resolve(input.repositoryRoot, input.preparation.reservationPath));
  if (
    typeof reservation !== 'object' ||
    reservation === null ||
    Array.isArray(reservation) ||
    !('commit' in reservation) ||
    typeof reservation.commit !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(reservation.commit)
  ) {
    throw new Error('AUTHOR_VIABILITY_MATERIALIZATION_COMMIT_DRIFT');
  }
  const state = await (input.inspectRepositoryState ?? inspectMaterializationRepositoryState)(input.repositoryRoot);
  if (!state.trackedWorktreeClean || state.currentCommit !== reservation.commit) {
    throw new Error('AUTHOR_VIABILITY_MATERIALIZATION_COMMIT_DRIFT');
  }
  return reservation.commit;
}

async function assertProtocolV3ReceiptChain(
  value: unknown,
  preparation: AuthorProtocolV3CanaryPreparation,
  repositoryRoot: string,
): Promise<void> {
  try {
    await Promise.all([
      assertConfinedArtifactPath(repositoryRoot, preparation.reservationPath),
      assertConfinedArtifactPath(repositoryRoot, terminalReceiptPath(preparation.reservationPath)),
      assertConfinedArtifactPath(repositoryRoot, resolve(repositoryRoot, preparation.outputDirectory, 'collection.json')),
    ]);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('collection');
    const collection = value as Record<string, unknown>;
    const completedKeys = [
      'actualLifecycle',
      'blueprint',
      'campaignFingerprint',
      'campaignId',
      'comparisonConclusion',
      'elapsedMs',
      'historicalTargetMet',
      'lifecycleExpectationMet',
      'operabilityOutcome',
      'providerInvocations',
      'providerObservation',
      'purpose',
      'reservationFingerprint',
      'schemaVersion',
      'target1800SecondsMet',
      'target300SecondsMet',
      'target600SecondsMet',
      'tokenUsage',
      'viabilityDecision',
    ];
    const errorKeys = completedKeys.filter((key) => key !== 'actualLifecycle' && key !== 'blueprint').concat('diagnostic');
    const zeroCallKeys = [
      'campaignFingerprint',
      'campaignId',
      'diagnostic',
      'operabilityOutcome',
      'providerInvocations',
      'purpose',
      'reservationFingerprint',
      'schemaVersion',
      'viabilityDecision',
    ];
    const collectionKeysValid =
      (collection.providerInvocations === 0 && hasExactKeys(collection, zeroCallKeys)) ||
      (collection.providerInvocations === 1 && (hasExactKeys(collection, completedKeys) || hasExactKeys(collection, errorKeys)));
    const completedShape = hasExactKeys(collection, completedKeys);
    const errorShape = hasExactKeys(collection, errorKeys);
    const blueprint = completedShape ? (collection.blueprint as Record<string, unknown>) : undefined;
    const lifecycle =
      blueprint !== undefined && typeof blueprint.lifecycle === 'object' && blueprint.lifecycle !== null
        ? (blueprint.lifecycle as Record<string, unknown>).state
        : undefined;
    const completedClassification =
      typeof collection.elapsedMs === 'number' &&
      Number.isFinite(collection.elapsedMs) &&
      collection.elapsedMs >= 0 &&
      (lifecycle === 'BLOCKED' || lifecycle === 'DRAFT' || lifecycle === 'READY')
        ? classifyProtocolV3CanaryTerminal({
            elapsedMs: collection.elapsedMs,
            lifecycle,
            status: 'COMPLETED',
            timeoutMs: preparation.timeouts.timeoutMs,
          })
        : undefined;
    const errorDiagnostic = errorShape ? (collection.diagnostic as Record<string, unknown>) : undefined;
    const providerDiagnostic =
      errorDiagnostic?.code === 'PROVIDER_ERROR' && typeof errorDiagnostic.diagnostic === 'object' && errorDiagnostic.diagnostic !== null
        ? (errorDiagnostic.diagnostic as Record<string, unknown>)
        : undefined;
    const providerTimedOut = providerDiagnostic?.category === 'TIMEOUT';
    const errorCode = errorDiagnostic?.code;
    const errorClassification =
      errorCode === 'CANDIDATE_STRUCTURALLY_INVALID' ||
      errorCode === 'COMPOSED_BLUEPRINT_INVALID' ||
      errorCode === 'INVALID_JSON' ||
      errorCode === 'PROVIDER_ERROR'
        ? classifyProtocolV3CanaryTerminal({ errorCode: errorCode as AuthorErrorCode, providerTimedOut, status: 'ERROR' })
        : undefined;
    if (completedShape && !protocolV3CollectionMatchesPreparation(collection, preparation)) {
      throw new Error('AUTHOR_VIABILITY_COLLECTION_INTEGRITY');
    }
    if (
      !collectionKeysValid ||
      collection.schemaVersion !== 2 ||
      collection.campaignId !== preparation.campaignId ||
      collection.campaignFingerprint !== sha256(preparation) ||
      collection.purpose !== 'DEVELOPMENT' ||
      collection.viabilityDecision === 'VIABLE_CANDIDATE' ||
      (collection.providerInvocations === 1 && collection.comparisonConclusion !== null) ||
      (completedShape &&
        (collection.actualLifecycle !== lifecycle ||
          !validateComposedEvaluationBlueprint(collection.blueprint).valid ||
          collection.historicalTargetMet !== (typeof collection.elapsedMs === 'number' && collection.elapsedMs <= 300_000) ||
          collection.lifecycleExpectationMet !== (lifecycle === 'BLOCKED') ||
          collection.target300SecondsMet !== (typeof collection.elapsedMs === 'number' && collection.elapsedMs <= 300_000) ||
          collection.target600SecondsMet !== (typeof collection.elapsedMs === 'number' && collection.elapsedMs <= 600_000) ||
          collection.target1800SecondsMet !== (typeof collection.elapsedMs === 'number' && collection.elapsedMs <= 1_800_000) ||
          completedClassification === undefined ||
          collection.operabilityOutcome !== completedClassification.operabilityOutcome ||
          collection.viabilityDecision !== completedClassification.viabilityDecision)) ||
      (errorShape &&
        (typeof collection.elapsedMs !== 'number' ||
          !Number.isFinite(collection.elapsedMs) ||
          collection.elapsedMs < 0 ||
          collection.historicalTargetMet !== null ||
          collection.lifecycleExpectationMet !== null ||
          collection.target300SecondsMet !== (providerTimedOut ? false : null) ||
          collection.target600SecondsMet !== (providerTimedOut ? false : null) ||
          collection.target1800SecondsMet !== (providerTimedOut ? false : null) ||
          errorClassification === undefined ||
          collection.operabilityOutcome !== errorClassification.operabilityOutcome ||
          collection.viabilityDecision !== errorClassification.viabilityDecision)) ||
      (collection.providerInvocations === 1 &&
        (!validNullableMetrics(collection.tokenUsage, [
          'cachedInputTokens',
          'inputTokens',
          'outputTokens',
          'reasoningOutputTokens',
          'totalTokens',
        ]) ||
          !validProviderObservation(collection.providerObservation) ||
          (hasExactKeys(collection, errorKeys) && !validTerminalDiagnostic(collection.diagnostic, 1)))) ||
      (collection.providerInvocations === 0 && !validTerminalDiagnostic(collection.diagnostic, 0)) ||
      (collection.providerInvocations === 0 &&
        (collection.operabilityOutcome !== 'INVALIDATED' || collection.viabilityDecision !== 'INVALIDATED')) ||
      (collection.viabilityDecision === 'PENDING_SEMANTIC_REVIEW' &&
        (collection.providerInvocations !== 1 ||
          collection.operabilityOutcome !== 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET' ||
          collection.actualLifecycle !== 'BLOCKED'))
    ) {
      throw new Error('collection');
    }
    const reservation = await readConfinedJson(repositoryRoot, resolve(repositoryRoot, preparation.reservationPath));
    if (typeof reservation !== 'object' || reservation === null || Array.isArray(reservation)) throw new Error('reservation');
    const reservationRecord = reservation as Record<string, unknown>;
    const normalReservationKeys = ['campaignFingerprint', 'campaignId', 'commit', 'invocationBudget', 'status'];
    const invalidationReservationKeys = [...normalReservationKeys, 'expectedCommit'];
    const reservationKeysValid =
      hasExactKeys(reservation, normalReservationKeys) ||
      (collection.providerInvocations === 0 && hasExactKeys(reservation, invalidationReservationKeys));
    if (
      !reservationKeysValid ||
      reservationRecord.campaignFingerprint !== sha256(preparation) ||
      reservationRecord.campaignId !== preparation.campaignId ||
      reservationRecord.invocationBudget !== 1 ||
      reservationRecord.status !== 'RESERVED' ||
      typeof reservationRecord.commit !== 'string' ||
      !/^[a-f0-9]{40}$/u.test(reservationRecord.commit) ||
      (Object.hasOwn(reservationRecord, 'expectedCommit') &&
        (typeof reservationRecord.expectedCommit !== 'string' || !/^[a-f0-9]{40}$/u.test(reservationRecord.expectedCommit))) ||
      collection.reservationFingerprint !== sha256(reservation)
    ) {
      throw new Error('reservation');
    }
    const receipt = await readConfinedJson(repositoryRoot, resolve(repositoryRoot, terminalReceiptPath(preparation.reservationPath)));
    const receiptRecord = receipt as Record<string, unknown>;
    const receiptKeys = [
      'campaignFingerprint',
      'campaignId',
      'collectionDigest',
      'collectionPersisted',
      ...(collection.providerInvocations === 1 ? ['comparisonConclusion'] : []),
      'commit',
      'operabilityOutcome',
      'providerInvocations',
      'reservationFingerprint',
      'status',
      'viabilityDecision',
    ];
    if (
      typeof receipt !== 'object' ||
      receipt === null ||
      Array.isArray(receipt) ||
      !hasExactKeys(receipt, receiptKeys) ||
      receiptRecord.campaignFingerprint !== sha256(preparation) ||
      receiptRecord.campaignId !== preparation.campaignId ||
      receiptRecord.collectionDigest !== sha256(collection) ||
      receiptRecord.collectionPersisted !== true ||
      receiptRecord.commit !== reservationRecord.commit ||
      receiptRecord.operabilityOutcome !== collection.operabilityOutcome ||
      receiptRecord.providerInvocations !== collection.providerInvocations ||
      receiptRecord.reservationFingerprint !== sha256(reservation) ||
      receiptRecord.status !== 'TERMINAL' ||
      receiptRecord.viabilityDecision !== collection.viabilityDecision ||
      (collection.providerInvocations === 1 && receiptRecord.comparisonConclusion !== collection.comparisonConclusion)
    ) {
      throw new Error('receipt');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTHOR_VIABILITY_COLLECTION_INTEGRITY') throw error;
    throw new Error('AUTHOR_VIABILITY_RECEIPT_INVALID');
  }
}

function protocolV3CollectionMatchesPreparation(value: Record<string, unknown>, preparation: AuthorProtocolV3CanaryPreparation): boolean {
  if (value.schemaVersion !== 2 || value.providerInvocations !== 1 || typeof value.blueprint !== 'object' || value.blueprint === null) {
    return false;
  }
  const blueprint = value.blueprint as Record<string, unknown>;
  if (
    blueprint.schemaVersion !== 3 ||
    blueprint.snapshotFingerprint !== preparation.fingerprints.snapshot ||
    typeof blueprint.lifecycle !== 'object' ||
    blueprint.lifecycle === null ||
    (blueprint.lifecycle as Record<string, unknown>).state !== value.actualLifecycle ||
    typeof blueprint.authorProvenance !== 'object' ||
    blueprint.authorProvenance === null
  ) {
    return false;
  }
  const provenance = blueprint.authorProvenance as Record<string, unknown>;
  return (
    provenance.authorInstrumentFingerprint === preparation.fingerprints.authorInstrument &&
    provenance.authoringContextFingerprint === preparation.fingerprints.authoringContext &&
    provenance.campaignId === preparation.campaignId &&
    provenance.candidateSchemaDigest === preparation.fingerprints.candidateSchema &&
    provenance.compositionPolicyDigest === preparation.fingerprints.compositionPolicy &&
    provenance.conditionFingerprint === preparation.fingerprints.condition &&
    provenance.instructionDigest === preparation.fingerprints.instruction &&
    provenance.packetFingerprint === preparation.fingerprints.packet &&
    provenance.protocolDigest === preparation.fingerprints.protocol &&
    provenance.reasoningEffort === preparation.condition.reasoningEffort &&
    provenance.requestedModel === preparation.condition.requestedModel &&
    provenance.schemaDigest === preparation.fingerprints.schema
  );
}

function parseCompletedCollection(value: unknown, preparation: AuthorOperabilityCampaignPreparation): CompletedViabilityCollection {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('campaignId' in value) ||
    value.campaignId !== preparation.campaignId ||
    !('campaignFingerprint' in value) ||
    value.campaignFingerprint !== sha256(preparation) ||
    collectionDecision(value, preparation) !== 'PENDING_SEMANTIC_REVIEW' ||
    !('blueprint' in value) ||
    !validateComposedEvaluationBlueprint(value.blueprint).valid
  ) {
    throw new Error('AUTHOR_VIABILITY_REVIEW_NOT_REQUIRED');
  }
  if (preparation.schemaVersion === 2 && !protocolV3CollectionMatchesPreparation(value as Record<string, unknown>, preparation)) {
    throw new Error('AUTHOR_VIABILITY_COLLECTION_INTEGRITY');
  }
  return value as unknown as CompletedViabilityCollection;
}

function reviewerInput(value: unknown, reviewerId: 'reviewer-a' | 'reviewer-b', requireIdentity: boolean): AuthorViabilityReviewerInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasExactKeys(
      value,
      requireIdentity ? ['judgments', 'principalFingerprint', 'reviewerId', 'sessionFingerprint'] : ['judgments', 'reviewerId'],
    ) ||
    !('reviewerId' in value) ||
    value.reviewerId !== reviewerId ||
    !('judgments' in value) ||
    !Array.isArray(value.judgments) ||
    (requireIdentity &&
      (!('principalFingerprint' in value) ||
        typeof value.principalFingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(value.principalFingerprint) ||
        !('sessionFingerprint' in value) ||
        typeof value.sessionFingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(value.sessionFingerprint)))
  ) {
    throw new Error('AUTHOR_VIABILITY_REVIEW_INPUT_INVALID');
  }
  return value as unknown as AuthorViabilityReviewerInput;
}

function reviewerQualificationInput(value: unknown, reviewerId: 'reviewer-a' | 'reviewer-b'): AuthorViabilityReviewerQualificationInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasExactKeys(value, ['judgments', 'principalFingerprint', 'reviewerId', 'sessionFingerprint']) ||
    !('reviewerId' in value) ||
    value.reviewerId !== reviewerId ||
    !('judgments' in value) ||
    !Array.isArray(value.judgments) ||
    !('principalFingerprint' in value) ||
    typeof value.principalFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.principalFingerprint) ||
    !('sessionFingerprint' in value) ||
    typeof value.sessionFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.sessionFingerprint) ||
    value.judgments.some(
      (judgment: unknown) =>
        typeof judgment !== 'object' ||
        judgment === null ||
        !hasExactKeys(judgment, ['probeId', 'verdict']) ||
        !('probeId' in judgment) ||
        typeof judgment.probeId !== 'string' ||
        !('verdict' in judgment) ||
        (judgment.verdict !== 'ACCEPT' && judgment.verdict !== 'REJECT'),
    )
  ) {
    throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_INPUT_INVALID');
  }
  return value as AuthorViabilityReviewerQualificationInput;
}

export async function prepareAuthorViabilityReview(input: {
  inspectRepositoryState?: InspectMaterializationRepositoryState;
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
}): Promise<{
  packetFingerprint: string;
  reviewDirectory: string;
  status?: 'PENDING_REVIEWER_QUALIFICATION' | 'READY_FOR_BLIND_REVIEW';
}> {
  assertReviewCampaign(input.preparation);
  const collectionPath = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json');
  if (input.preparation.schemaVersion === 2) await assertConfinedArtifactPath(input.repositoryRoot, collectionPath);
  const collectionValue =
    input.preparation.schemaVersion === 2 ? await readConfinedJson(input.repositoryRoot, collectionPath) : await readJson(collectionPath);
  if (input.preparation.schemaVersion === 2) {
    await assertProtocolV3ReceiptChain(collectionValue, input.preparation, input.repositoryRoot);
    await assertProtocolV3MaterializationCommitFreeze({
      ...(input.inspectRepositoryState === undefined ? {} : { inspectRepositoryState: input.inspectRepositoryState }),
      preparation: input.preparation,
      repositoryRoot: input.repositoryRoot,
    });
  }
  const collection = parseCompletedCollection(collectionValue, input.preparation);
  const reviewDirectory = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'review');
  if (input.preparation.schemaVersion === 2) {
    await assertConfinedArtifactPath(input.repositoryRoot, reviewDirectory);
    const frozen = await deriveFrozenProtocolV3ReviewContext(input.preparation, input.repositoryRoot, collection.blueprint);
    const qualificationPacket = frozen.qualificationPacket;
    const qualificationPacketPath = join(reviewDirectory, 'qualification.packet.json');
    const existingQualificationPacket = await readOptionalJson(qualificationPacketPath, input.repositoryRoot);
    if (existingQualificationPacket !== undefined && canonicalJson(existingQualificationPacket) !== canonicalJson(qualificationPacket)) {
      throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_PACKET_INVALID');
    }
    const packetPublication = await publishJsonNoReplace({
      repositoryRoot: input.repositoryRoot,
      targetPath: qualificationPacketPath,
      value: qualificationPacket,
      verifyExisting: true,
    });
    const manifestPublication = await publishJsonNoReplace({
      repositoryRoot: input.repositoryRoot,
      targetPath: join(reviewDirectory, 'manifest.json'),
      value: {
        campaignFingerprint: collection.campaignFingerprint,
        campaignId: collection.campaignId,
        purpose: 'AUTHOR_VIABILITY_REVIEWER_QUALIFICATION',
        qualificationPacketFingerprint: qualificationPacket.fingerprint,
        schemaVersion: 2,
      },
      verifyExisting: true,
    });
    if (packetPublication === 'CREATED' || manifestPublication === 'CREATED') {
      return {
        packetFingerprint: qualificationPacket.fingerprint,
        reviewDirectory,
        status: 'PENDING_REVIEWER_QUALIFICATION',
      };
    }
    const qualificationInputs = await Promise.all([
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.qualification.input.json')).then((value) =>
        reviewerQualificationInput(value, 'reviewer-a'),
      ),
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.qualification.input.json')).then((value) =>
        reviewerQualificationInput(value, 'reviewer-b'),
      ),
    ]);
    const qualificationSubmissions = qualificationInputs.map((qualificationInput) =>
      createAuthorViabilityReviewerQualificationSubmission({ input: qualificationInput, packet: qualificationPacket }),
    );
    const qualification = qualifyAuthorViabilityReviewers({
      packet: qualificationPacket,
      probes: frozen.reviewerProbes,
      submissions: qualificationSubmissions,
    });
    if (qualification.result !== 'QUALIFIED') throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_FAILED');
    const packet = frozen.packet;
    if (!validateAuthorViabilityReviewPacket(packet)) throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
    const candidateComponents: Array<readonly [string, unknown]> = [
      [join(reviewDirectory, 'reviewer-a.packet.json'), packet],
      [join(reviewDirectory, 'reviewer-b.packet.json'), packet],
      ...qualificationSubmissions.map(
        (submission) => [join(reviewDirectory, `${submission.reviewerId}.qualification.json`), submission] as const,
      ),
      [join(reviewDirectory, 'reviewer-qualification-result.json'), qualification],
    ];
    for (const [targetPath, value] of candidateComponents) {
      await publishJsonNoReplace({ repositoryRoot: input.repositoryRoot, targetPath, value, verifyExisting: true });
    }
    await publishJsonNoReplace({
      repositoryRoot: input.repositoryRoot,
      targetPath: join(reviewDirectory, 'candidate.manifest.json'),
      value: {
        campaignFingerprint: collection.campaignFingerprint,
        packetFingerprint: packet.fingerprint,
        qualificationFingerprint: qualification.fingerprint,
        schemaVersion: 2,
      },
      verifyExisting: true,
    });
    return { packetFingerprint: packet.fingerprint, reviewDirectory, status: 'READY_FOR_BLIND_REVIEW' };
  }
  const oracleValue = await readJson(resolve(input.repositoryRoot, input.preparation.oraclePath));
  if (!validateAuthorViabilityOracle(oracleValue)) throw new Error('AUTHOR_VIABILITY_ORACLE_INVALID');
  const snapshot = await createSkillSnapshot({ rootDirectory: resolve(input.repositoryRoot, input.preparation.skillPath) });
  const packet = createAuthorViabilityReviewPacket({
    blueprint: collection.blueprint,
    oracle: oracleValue,
    skillFiles: snapshot.includedFiles,
  });
  await mkdir(reviewDirectory, { recursive: true });
  await Promise.all([
    writeExclusive(join(reviewDirectory, 'reviewer-a.packet.json'), packet),
    writeExclusive(join(reviewDirectory, 'reviewer-b.packet.json'), packet),
    writeExclusive(join(reviewDirectory, 'manifest.json'), {
      campaignFingerprint: collection.campaignFingerprint,
      campaignId: collection.campaignId,
      packetFingerprint: packet.fingerprint,
      purpose: 'AUTHOR_VIABILITY_BLIND_REVIEW',
      schemaVersion: 1,
    }),
  ]);
  return { packetFingerprint: packet.fingerprint, reviewDirectory };
}

export async function prepareAuthorViabilityResolution(input: {
  inspectRepositoryState?: InspectMaterializationRepositoryState;
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
}): Promise<AuthorViabilityResolutionPacket> {
  assertReviewCampaign(input.preparation);
  const reviewDirectory = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'review');
  let lockedQualificationSubmissions: AuthorViabilityReviewerQualificationSubmission[] | undefined;
  let lockedPacket: AuthorViabilityReviewPacket | undefined;
  if (input.preparation.schemaVersion === 2) {
    await assertConfinedArtifactPath(input.repositoryRoot, reviewDirectory);
    const collectionPath = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json');
    await assertConfinedArtifactPath(input.repositoryRoot, collectionPath);
    const collectionValue = await readConfinedJson(input.repositoryRoot, collectionPath);
    await assertProtocolV3ReceiptChain(collectionValue, input.preparation, input.repositoryRoot);
    await assertProtocolV3MaterializationCommitFreeze({
      ...(input.inspectRepositoryState === undefined ? {} : { inspectRepositoryState: input.inspectRepositoryState }),
      preparation: input.preparation,
      repositoryRoot: input.repositoryRoot,
    });
    const collection = parseCompletedCollection(collectionValue, input.preparation);
    const frozen = await deriveFrozenProtocolV3ReviewContext(input.preparation, input.repositoryRoot, collection.blueprint);
    const expectedPacket = frozen.packet;
    const [storedPacketA, storedPacketB] = await Promise.all([
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.packet.json')),
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.packet.json')),
    ]);
    if (canonicalJson(storedPacketA) !== canonicalJson(expectedPacket) || canonicalJson(storedPacketB) !== canonicalJson(expectedPacket)) {
      throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
    }
    lockedPacket = expectedPacket;
    const expectedQualificationPacket = frozen.qualificationPacket;
    const qualificationPacket = (await readConfinedJson(
      input.repositoryRoot,
      join(reviewDirectory, 'qualification.packet.json'),
    )) as AuthorViabilityReviewerQualificationPacket;
    if (canonicalJson(qualificationPacket) !== canonicalJson(expectedQualificationPacket)) {
      throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_PACKET_INVALID');
    }
    const qualificationSubmissions = (await Promise.all([
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.qualification.json')),
      readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.qualification.json')),
    ])) as AuthorViabilityReviewerQualificationSubmission[];
    lockedQualificationSubmissions = qualificationSubmissions;
    const expectedQualification = qualifyAuthorViabilityReviewers({
      packet: expectedQualificationPacket,
      probes: frozen.reviewerProbes,
      submissions: qualificationSubmissions,
    });
    const qualification = await readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-qualification-result.json'));
    if (expectedQualification.result !== 'QUALIFIED' || canonicalJson(qualification) !== canonicalJson(expectedQualification)) {
      throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_INVALID');
    }
    await assertManifest(
      join(reviewDirectory, 'manifest.json'),
      {
        campaignFingerprint: collection.campaignFingerprint,
        campaignId: collection.campaignId,
        purpose: 'AUTHOR_VIABILITY_REVIEWER_QUALIFICATION',
        qualificationPacketFingerprint: expectedQualificationPacket.fingerprint,
        schemaVersion: 2,
      },
      input.repositoryRoot,
    );
    await assertManifest(
      join(reviewDirectory, 'candidate.manifest.json'),
      {
        campaignFingerprint: collection.campaignFingerprint,
        packetFingerprint: expectedPacket.fingerprint,
        qualificationFingerprint: expectedQualification.fingerprint,
        schemaVersion: 2,
      },
      input.repositoryRoot,
    );
  }
  const packet = lockedPacket ?? ((await readJson(join(reviewDirectory, 'reviewer-a.packet.json'))) as AuthorViabilityReviewPacket);
  if (lockedPacket === undefined) {
    const secondPacket = (await readJson(join(reviewDirectory, 'reviewer-b.packet.json'))) as AuthorViabilityReviewPacket;
    if (
      canonicalJson(packet) !== canonicalJson(secondPacket) ||
      !validateAuthorViabilityReviewPacket(packet) ||
      !validateAuthorViabilityReviewPacket(secondPacket)
    ) {
      throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
    }
  } else if (!validateAuthorViabilityReviewPacket(packet)) {
    throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
  }
  const readReviewInput = (path: string): Promise<unknown> =>
    packet.schemaVersion === 2 ? readConfinedJson(input.repositoryRoot, path) : readJson(path);
  const leftInput = reviewerInput(
    await readReviewInput(join(reviewDirectory, 'reviewer-a.input.json')),
    'reviewer-a',
    packet.schemaVersion === 2,
  );
  const rightInput = reviewerInput(
    await readReviewInput(join(reviewDirectory, 'reviewer-b.input.json')),
    'reviewer-b',
    packet.schemaVersion === 2,
  );
  const submissions = [leftInput, rightInput].map((entry) => createAuthorViabilityReviewerSubmission({ ...entry, packet }));
  if (submissions.some((submission) => !validateAuthorViabilityReviewerSubmission(packet, submission))) {
    throw new Error('AUTHOR_VIABILITY_REVIEW_INPUT_INVALID');
  }
  if (
    packet.schemaVersion === 2 &&
    (lockedQualificationSubmissions === undefined ||
      !validateAuthorViabilityReviewerContinuity(lockedQualificationSubmissions, submissions))
  ) {
    throw new Error('AUTHOR_VIABILITY_REVIEWER_IDENTITY_INVALID');
  }
  const resolutionPacket = createAuthorViabilityResolutionPacket(packet, submissions);
  if (input.preparation.schemaVersion === 2) {
    for (const [targetPath, value] of [
      [join(reviewDirectory, 'reviewer-a.json'), submissions[0]],
      [join(reviewDirectory, 'reviewer-b.json'), submissions[1]],
      [join(reviewDirectory, 'resolution.packet.json'), resolutionPacket],
    ] as const) {
      await publishJsonNoReplace({ repositoryRoot: input.repositoryRoot, targetPath, value, verifyExisting: true });
    }
    await publishJsonNoReplace({
      repositoryRoot: input.repositoryRoot,
      targetPath: join(reviewDirectory, 'resolution.manifest.json'),
      value: {
        campaignFingerprint: sha256(input.preparation),
        packetFingerprint: packet.fingerprint,
        resolutionPacketFingerprint: resolutionPacket.fingerprint,
        reviewerSubmissionFingerprints: submissions.map((submission) => submission.fingerprint).sort(),
        schemaVersion: 2,
      },
      verifyExisting: true,
    });
  } else {
    await Promise.all([
      writeExclusive(join(reviewDirectory, 'reviewer-a.json'), submissions[0]),
      writeExclusive(join(reviewDirectory, 'reviewer-b.json'), submissions[1]),
      writeExclusive(join(reviewDirectory, 'resolution.packet.json'), resolutionPacket),
    ]);
  }
  return resolutionPacket;
}

function parseResolutions(value: unknown): AuthorViabilityJudgment[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasExactKeys(value, ['judgments']) ||
    !('judgments' in value) ||
    !Array.isArray(value.judgments)
  ) {
    throw new Error('AUTHOR_VIABILITY_RESOLUTION_INPUT_INVALID');
  }
  return value.judgments as AuthorViabilityJudgment[];
}

export async function scoreAuthorViability(input: {
  inspectRepositoryState?: InspectMaterializationRepositoryState;
  outputPath: string;
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
}): Promise<Record<string, unknown>> {
  assertReviewCampaign(input.preparation);
  let reservedCommit: string | undefined;
  if (input.outputPath !== input.preparation.sanitizedReportPath) throw new Error('AUTHOR_VIABILITY_REPORT_PATH_INVALID');
  const collectionPath = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json');
  if (input.preparation.schemaVersion === 2) await assertConfinedArtifactPath(input.repositoryRoot, collectionPath);
  const collectionValue =
    input.preparation.schemaVersion === 2 ? await readConfinedJson(input.repositoryRoot, collectionPath) : await readJson(collectionPath);
  let frozenReviewMaterial: FrozenProtocolV3ReviewMaterial | undefined;
  if (input.preparation.schemaVersion === 2) {
    await assertProtocolV3ReceiptChain(collectionValue, input.preparation, input.repositoryRoot);
    reservedCommit = await assertProtocolV3MaterializationCommitFreeze({
      ...(input.inspectRepositoryState === undefined ? {} : { inspectRepositoryState: input.inspectRepositoryState }),
      preparation: input.preparation,
      repositoryRoot: input.repositoryRoot,
    });
    frozenReviewMaterial = await loadFrozenProtocolV3ReviewMaterial(input.preparation, input.repositoryRoot);
  }
  if (
    typeof collectionValue !== 'object' ||
    collectionValue === null ||
    collectionDecision(collectionValue, input.preparation) === undefined ||
    !('campaignId' in collectionValue) ||
    collectionValue.campaignId !== input.preparation.campaignId ||
    !('campaignFingerprint' in collectionValue) ||
    collectionValue.campaignFingerprint !== sha256(input.preparation) ||
    !('providerInvocations' in collectionValue) ||
    (collectionValue.providerInvocations !== 1 &&
      !(
        input.preparation.schemaVersion === 2 &&
        collectionValue.providerInvocations === 0 &&
        collectionDecision(collectionValue, input.preparation) === 'INVALIDATED'
      ))
  ) {
    throw new Error('AUTHOR_VIABILITY_COLLECTION_INVALID');
  }
  let decision = collectionDecision(collectionValue, input.preparation)!;
  let review: Record<string, unknown> | null = null;
  if (decision === 'PENDING_SEMANTIC_REVIEW') {
    const collection = parseCompletedCollection(collectionValue, input.preparation);
    const reviewDirectory = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'review');
    if (input.preparation.schemaVersion === 2) await assertConfinedArtifactPath(input.repositoryRoot, reviewDirectory);
    let packet = (await (input.preparation.schemaVersion === 2
      ? readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.packet.json'))
      : readJson(join(reviewDirectory, 'reviewer-a.packet.json')))) as AuthorViabilityReviewPacket;
    let reviewerQualification: Record<string, unknown> | null = null;
    let lockedQualificationSubmissions: AuthorViabilityReviewerQualificationSubmission[] | undefined;
    if (input.preparation.schemaVersion === 2) {
      if (frozenReviewMaterial === undefined) throw new Error('AUTHOR_VIABILITY_FROZEN_INPUT_INTEGRITY');
      const frozen = createFrozenProtocolV3ReviewContext(frozenReviewMaterial, collection.blueprint);
      const expectedPacket = frozen.packet;
      const secondPacket = await readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.packet.json'));
      if (canonicalJson(packet) !== canonicalJson(expectedPacket) || canonicalJson(secondPacket) !== canonicalJson(expectedPacket)) {
        throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
      }
      packet = expectedPacket;
      const expectedQualificationPacket = frozen.qualificationPacket;
      const qualificationPacket = (await readConfinedJson(
        input.repositoryRoot,
        join(reviewDirectory, 'qualification.packet.json'),
      )) as AuthorViabilityReviewerQualificationPacket;
      if (canonicalJson(qualificationPacket) !== canonicalJson(expectedQualificationPacket)) {
        throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_PACKET_INVALID');
      }
      const qualificationSubmissions = (await Promise.all([
        readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.qualification.json')),
        readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.qualification.json')),
      ])) as AuthorViabilityReviewerQualificationSubmission[];
      lockedQualificationSubmissions = qualificationSubmissions;
      const expectedQualification = qualifyAuthorViabilityReviewers({
        packet: qualificationPacket,
        probes: frozen.reviewerProbes,
        submissions: qualificationSubmissions,
      });
      const qualification = await readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-qualification-result.json'));
      if (expectedQualification.result !== 'QUALIFIED' || canonicalJson(qualification) !== canonicalJson(expectedQualification)) {
        throw new Error('AUTHOR_VIABILITY_REVIEWER_QUALIFICATION_INVALID');
      }
      await assertManifest(
        join(reviewDirectory, 'manifest.json'),
        {
          campaignFingerprint: collection.campaignFingerprint,
          campaignId: collection.campaignId,
          purpose: 'AUTHOR_VIABILITY_REVIEWER_QUALIFICATION',
          qualificationPacketFingerprint: expectedQualificationPacket.fingerprint,
          schemaVersion: 2,
        },
        input.repositoryRoot,
      );
      await assertManifest(
        join(reviewDirectory, 'candidate.manifest.json'),
        {
          campaignFingerprint: collection.campaignFingerprint,
          packetFingerprint: expectedPacket.fingerprint,
          qualificationFingerprint: expectedQualification.fingerprint,
          schemaVersion: 2,
        },
        input.repositoryRoot,
      );
      reviewerQualification = {
        qualificationSubmissionFingerprints: qualificationSubmissions.map((submission) => submission.fingerprint).sort(),
        reviewerQualificationFingerprint: expectedQualification.fingerprint,
      };
    }
    const submissions = (await Promise.all([
      input.preparation.schemaVersion === 2
        ? readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-a.json'))
        : readJson(join(reviewDirectory, 'reviewer-a.json')),
      input.preparation.schemaVersion === 2
        ? readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'reviewer-b.json'))
        : readJson(join(reviewDirectory, 'reviewer-b.json')),
    ])) as AuthorViabilityReviewerSubmission[];
    if (
      packet.schemaVersion === 2 &&
      (lockedQualificationSubmissions === undefined ||
        !validateAuthorViabilityReviewerContinuity(lockedQualificationSubmissions, submissions))
    ) {
      throw new Error('AUTHOR_VIABILITY_REVIEWER_IDENTITY_INVALID');
    }
    const resolutionPacket = (await (input.preparation.schemaVersion === 2
      ? readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'resolution.packet.json'))
      : readJson(join(reviewDirectory, 'resolution.packet.json')))) as AuthorViabilityResolutionPacket;
    const expectedResolutionPacket = createAuthorViabilityResolutionPacket(packet, submissions);
    if (canonicalJson(resolutionPacket) !== canonicalJson(expectedResolutionPacket))
      throw new Error('AUTHOR_VIABILITY_RESOLUTION_PACKET_INVALID');
    if (input.preparation.schemaVersion === 2) {
      await assertManifest(
        join(reviewDirectory, 'resolution.manifest.json'),
        {
          campaignFingerprint: sha256(input.preparation),
          packetFingerprint: packet.fingerprint,
          resolutionPacketFingerprint: expectedResolutionPacket.fingerprint,
          reviewerSubmissionFingerprints: submissions.map((submission) => submission.fingerprint).sort(),
          schemaVersion: 2,
        },
        input.repositoryRoot,
      );
    }
    const resolutions =
      resolutionPacket.disagreements.length === 0
        ? []
        : parseResolutions(
            input.preparation.schemaVersion === 2
              ? await readConfinedJson(input.repositoryRoot, join(reviewDirectory, 'resolver.input.json'))
              : await readJson(join(reviewDirectory, 'resolver.input.json')),
          );
    const resolved = resolveAuthorViabilityReview(packet, submissions, resolutions);
    decision = isTerraContrast(input.preparation)
      ? resolved.decision === 'VIABLE_CANDIDATE'
        ? 'TERRA_PASSES_CURRENT_INSTRUMENT'
        : 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
      : resolved.decision;
    review = {
      packetFingerprint: packet.fingerprint,
      ...(reviewerQualification ?? {}),
      resolutionFingerprint: resolved.fingerprint,
      reviewerSubmissionFingerprints: submissions.map((submission) => submission.fingerprint).sort(),
      judgments: resolved.judgments,
    };
    if (collection.blueprint.lifecycle.state !== 'BLOCKED') {
      decision = isTerraContrast(input.preparation) ? 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT' : 'NOT_VIABLE_FOR_AUTHOR';
    }
  }
  const collection = collectionValue as Record<string, unknown>;
  const report = {
    actualLifecycle: collection.actualLifecycle ?? null,
    authorCondition: {
      observedModel:
        typeof collection.blueprint === 'object' && collection.blueprint !== null && 'authorProvenance' in collection.blueprint
          ? (collection.blueprint.authorProvenance as Record<string, unknown>).observedModel
          : null,
      qualificationStatus: 'NOT_QUALIFIED',
      requestedModel: input.preparation.condition.requestedModel,
      requestedReasoning: input.preparation.condition.reasoningEffort,
    },
    campaignFingerprint: sha256(input.preparation),
    campaignId: input.preparation.campaignId,
    decisionEligible: false,
    elapsedMs: collection.elapsedMs ?? null,
    fingerprints: input.preparation.fingerprints,
    limitations:
      input.preparation.schemaVersion === 2
        ? [
            'This single E22 protocol-v3 canary applies only to the frozen priority-queue snapshot-renderer instrument and Terra/xhigh condition.',
            'VIABLE_CANDIDATE does not qualify Terra, establish stability or generalization, or enable decision runs.',
            'A terminal result never authorizes reuse of this campaign, reservation, or output.',
          ]
        : isTerraContrast(input.preparation)
          ? [
              'This controlled development contrast applies only to Terra/xhigh on the frozen E19 protocol-v2 packet.',
              'Passing the current instrument does not qualify Terra or prove a general intelligence difference from Luna.',
              'A terminal result never authorizes reuse of this campaign, reservation, or output.',
            ]
          : [
              'This adaptive development gate applies only to Luna/max with Author protocol v2 and the frozen locale-catalog packet.',
              'VIABLE_CANDIDATE does not qualify the Author or establish reliability on blind cases.',
              'A terminal result never authorizes reuse of this campaign, reservation, or output.',
            ],
    operabilityOutcome: collection.operabilityOutcome,
    providerInvocations: collection.providerInvocations,
    purpose: 'DEVELOPMENT',
    ...(reservedCommit === undefined ? {} : { reservedCommit }),
    result: decision,
    review,
    schemaVersion: input.preparation.schemaVersion,
    target1800SecondsMet: collection.target1800SecondsMet ?? null,
    target300SecondsMet: collection.target300SecondsMet ?? null,
    target600SecondsMet: collection.target600SecondsMet ?? null,
    tokenUsage: collection.tokenUsage ?? null,
  };
  if (input.preparation.schemaVersion === 2) {
    await publishJsonNoReplace({
      repositoryRoot: input.repositoryRoot,
      targetPath: resolve(input.repositoryRoot, input.outputPath),
      value: report,
    });
  } else {
    await writeExclusive(resolve(input.repositoryRoot, input.outputPath), report);
  }
  return report;
}

export async function loadAuthorViabilityPreparation(
  repositoryRoot: string,
  preparationPath: string,
): Promise<AuthorOperabilityCampaignPreparation> {
  const absolutePreparationPath = resolve(repositoryRoot, preparationPath);
  const value = await readConfinedJson(repositoryRoot, absolutePreparationPath);
  if (!validateAuthorOperabilityCampaignPreparation(value)) throw new Error('OPERABILITY_PREPARATION_INVALID');
  assertReviewCampaign(value);
  return value;
}
