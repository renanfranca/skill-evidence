import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { validateComposedEvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import {
  createAuthorViabilityResolutionPacket,
  createAuthorViabilityReviewPacket,
  createAuthorViabilityReviewerSubmission,
  resolveAuthorViabilityReview,
  validateAuthorViabilityOracle,
  validateAuthorViabilityReviewPacket,
  validateAuthorViabilityReviewerSubmission,
  type AuthorViabilityJudgment,
  type AuthorViabilityResolutionPacket,
  type AuthorViabilityReviewPacket,
  type AuthorViabilityReviewerSubmission,
} from './author-viability-review.js';
import {
  authorOperabilityCampaignPolicy,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorComparisonConclusion,
  type AuthorOperabilityCampaignPreparation,
  type AuthorViabilityDecision,
} from './author-operability.js';

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

export interface AuthorViabilityReviewerInput {
  judgments: AuthorViabilityJudgment[];
  reviewerId: 'reviewer-a' | 'reviewer-b';
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

function isTerraContrast(preparation: AuthorOperabilityCampaignPreparation): boolean {
  return authorOperabilityCampaignPolicy(preparation) === 'TERRA_CONTRAST';
}

function assertReviewCampaign(preparation: AuthorOperabilityCampaignPreparation): void {
  if (authorOperabilityCampaignPolicy(preparation) === 'HISTORICAL_OPERABILITY') {
    throw new Error('AUTHOR_VIABILITY_CAMPAIGN_REQUIRED');
  }
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
  return value as unknown as CompletedViabilityCollection;
}

function reviewerInput(value: unknown, reviewerId: 'reviewer-a' | 'reviewer-b'): AuthorViabilityReviewerInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('reviewerId' in value) ||
    value.reviewerId !== reviewerId ||
    !('judgments' in value) ||
    !Array.isArray(value.judgments)
  ) {
    throw new Error('AUTHOR_VIABILITY_REVIEW_INPUT_INVALID');
  }
  return value as unknown as AuthorViabilityReviewerInput;
}

export async function prepareAuthorViabilityReview(input: {
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
}): Promise<{ packetFingerprint: string; reviewDirectory: string }> {
  assertReviewCampaign(input.preparation);
  const collection = parseCompletedCollection(
    await readJson(resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json')),
    input.preparation,
  );
  const oracleValue = await readJson(resolve(input.repositoryRoot, input.preparation.oraclePath));
  if (!validateAuthorViabilityOracle(oracleValue)) throw new Error('AUTHOR_VIABILITY_ORACLE_INVALID');
  const snapshot = await createSkillSnapshot({ rootDirectory: resolve(input.repositoryRoot, input.preparation.skillPath) });
  const packet = createAuthorViabilityReviewPacket({
    blueprint: collection.blueprint,
    oracle: oracleValue,
    skillFiles: snapshot.includedFiles,
  });
  const reviewDirectory = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'review');
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
  repositoryRoot: string;
  reviewDirectory: string;
}): Promise<AuthorViabilityResolutionPacket> {
  const reviewDirectory = resolve(input.repositoryRoot, input.reviewDirectory);
  const packet = (await readJson(join(reviewDirectory, 'reviewer-a.packet.json'))) as AuthorViabilityReviewPacket;
  const secondPacket = (await readJson(join(reviewDirectory, 'reviewer-b.packet.json'))) as AuthorViabilityReviewPacket;
  if (
    canonicalJson(packet) !== canonicalJson(secondPacket) ||
    !validateAuthorViabilityReviewPacket(packet) ||
    !validateAuthorViabilityReviewPacket(secondPacket)
  ) {
    throw new Error('AUTHOR_VIABILITY_PACKET_INVALID');
  }
  const leftInput = reviewerInput(await readJson(join(reviewDirectory, 'reviewer-a.input.json')), 'reviewer-a');
  const rightInput = reviewerInput(await readJson(join(reviewDirectory, 'reviewer-b.input.json')), 'reviewer-b');
  const submissions = [leftInput, rightInput].map((entry) => createAuthorViabilityReviewerSubmission({ ...entry, packet }));
  if (submissions.some((submission) => !validateAuthorViabilityReviewerSubmission(packet, submission))) {
    throw new Error('AUTHOR_VIABILITY_REVIEW_INPUT_INVALID');
  }
  const resolutionPacket = createAuthorViabilityResolutionPacket(packet, submissions);
  await Promise.all([
    writeExclusive(join(reviewDirectory, 'reviewer-a.json'), submissions[0]),
    writeExclusive(join(reviewDirectory, 'reviewer-b.json'), submissions[1]),
    writeExclusive(join(reviewDirectory, 'resolution.packet.json'), resolutionPacket),
  ]);
  return resolutionPacket;
}

function parseResolutions(value: unknown): AuthorViabilityJudgment[] {
  if (typeof value !== 'object' || value === null || !('judgments' in value) || !Array.isArray(value.judgments)) {
    throw new Error('AUTHOR_VIABILITY_RESOLUTION_INPUT_INVALID');
  }
  return value.judgments as AuthorViabilityJudgment[];
}

export async function scoreAuthorViability(input: {
  outputPath: string;
  preparation: AuthorOperabilityCampaignPreparation;
  repositoryRoot: string;
}): Promise<Record<string, unknown>> {
  assertReviewCampaign(input.preparation);
  if (input.outputPath !== input.preparation.sanitizedReportPath) throw new Error('AUTHOR_VIABILITY_REPORT_PATH_INVALID');
  const collectionValue = await readJson(resolve(input.repositoryRoot, input.preparation.outputDirectory, 'collection.json'));
  if (
    typeof collectionValue !== 'object' ||
    collectionValue === null ||
    collectionDecision(collectionValue, input.preparation) === undefined ||
    !('campaignId' in collectionValue) ||
    collectionValue.campaignId !== input.preparation.campaignId ||
    !('campaignFingerprint' in collectionValue) ||
    collectionValue.campaignFingerprint !== sha256(input.preparation) ||
    !('providerInvocations' in collectionValue) ||
    collectionValue.providerInvocations !== 1
  ) {
    throw new Error('AUTHOR_VIABILITY_COLLECTION_INVALID');
  }
  let decision = collectionDecision(collectionValue, input.preparation)!;
  let review: Record<string, unknown> | null = null;
  if (decision === 'PENDING_SEMANTIC_REVIEW') {
    const collection = parseCompletedCollection(collectionValue, input.preparation);
    const reviewDirectory = resolve(input.repositoryRoot, input.preparation.outputDirectory, 'review');
    const packet = (await readJson(join(reviewDirectory, 'reviewer-a.packet.json'))) as AuthorViabilityReviewPacket;
    const submissions = (await Promise.all([
      readJson(join(reviewDirectory, 'reviewer-a.json')),
      readJson(join(reviewDirectory, 'reviewer-b.json')),
    ])) as AuthorViabilityReviewerSubmission[];
    const resolutionPacket = (await readJson(join(reviewDirectory, 'resolution.packet.json'))) as AuthorViabilityResolutionPacket;
    const expectedResolutionPacket = createAuthorViabilityResolutionPacket(packet, submissions);
    if (canonicalJson(resolutionPacket) !== canonicalJson(expectedResolutionPacket))
      throw new Error('AUTHOR_VIABILITY_RESOLUTION_PACKET_INVALID');
    const resolutions =
      resolutionPacket.disagreements.length === 0 ? [] : parseResolutions(await readJson(join(reviewDirectory, 'resolver.input.json')));
    const resolved = resolveAuthorViabilityReview(packet, submissions, resolutions);
    decision = isTerraContrast(input.preparation)
      ? resolved.decision === 'VIABLE_CANDIDATE'
        ? 'TERRA_PASSES_CURRENT_INSTRUMENT'
        : 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT'
      : resolved.decision;
    review = {
      packetFingerprint: packet.fingerprint,
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
    limitations: isTerraContrast(input.preparation)
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
    result: decision,
    review,
    schemaVersion: 1,
    target1800SecondsMet: collection.target1800SecondsMet ?? null,
    target300SecondsMet: collection.target300SecondsMet ?? null,
    target600SecondsMet: collection.target600SecondsMet ?? null,
    tokenUsage: collection.tokenUsage ?? null,
  };
  await writeExclusive(resolve(input.repositoryRoot, input.outputPath), report);
  return report;
}

export async function loadAuthorViabilityPreparation(
  repositoryRoot: string,
  preparationPath: string,
): Promise<AuthorOperabilityCampaignPreparation> {
  const value = await readJson(resolve(repositoryRoot, preparationPath));
  if (!validateAuthorOperabilityCampaignPreparation(value)) throw new Error('OPERABILITY_PREPARATION_INVALID');
  assertReviewCampaign(value);
  return value;
}
