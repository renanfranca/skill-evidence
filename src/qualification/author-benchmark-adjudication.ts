import { mkdir, open, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { BlueprintCandidate, EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import type { AuthorBenchmarkCollection } from './author-benchmark-runner.js';
import {
  validateAuthorBenchmarkBundle,
  qualifyAuthorBenchmarkReviewers,
  type AtomicReferenceItem,
  type AuthorBenchmarkBundleCandidate,
  type AuthorBenchmarkCondition,
  type ReviewerQualificationPacket,
  type ReviewerQualificationSubmission,
} from './author-benchmark.js';

export interface BlindReviewCandidateAssertion {
  critical: boolean;
  id: string;
  kind: 'BLOCKER' | 'CLAIM' | 'CONTRACT' | 'DECISION_CONTEXT';
  statement: string;
}

export interface BlindReviewPacket {
  candidate: BlueprintCandidate;
  candidateAssertions: BlindReviewCandidateAssertion[];
  fingerprint: string;
  instructionsDigest: string;
  purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW';
  referenceItems: AtomicReferenceItem[];
  resolutionPolicyDigest: string;
  sampleId: string;
  schemaVersion: 1;
  skillFiles: Array<{ content: string; path: string }>;
}

export interface CreateBlindReviewPacketsInput {
  bundle: AuthorBenchmarkBundleCandidate;
  bundleDirectory: string;
  collection: AuthorBenchmarkCollection;
}

export type BlindReviewVerdict = 'ACCEPT' | 'NEEDS_ADJUDICATION' | 'REJECT';

export interface BlindReviewJudgment {
  evidencePaths: string[];
  rationale: string;
  sampleId: string;
  targetId: string;
  targetType: 'CANDIDATE' | 'REFERENCE';
  verdict: BlindReviewVerdict;
}

export interface BlindReviewerSubmission {
  fingerprint: string;
  judgments: BlindReviewJudgment[];
  packetFingerprints: string[];
  reviewerId: 'reviewer-a' | 'reviewer-b';
  schemaVersion: 1;
}

export interface CreateBlindReviewerSubmissionInput {
  judgments: BlindReviewJudgment[];
  packets: BlindReviewPacket[];
  reviewerId: BlindReviewerSubmission['reviewerId'];
}

export interface BlindReviewResolution {
  evidencePaths: string[];
  rationale: string;
  sampleId: string;
  targetId: string;
  targetType: BlindReviewJudgment['targetType'];
  verdict: 'ACCEPT' | 'REJECT' | 'UNRESOLVED';
}

export interface BlindResolutionPacket {
  fingerprint: string;
  items: Array<{
    candidateAssertion: BlindReviewCandidateAssertion | null;
    referenceItem: AtomicReferenceItem | null;
    reviewerJudgments: Array<{
      evidencePaths: string[];
      rationale: string;
      reviewerId: BlindReviewerSubmission['reviewerId'];
      verdict: BlindReviewVerdict;
    }>;
    sampleId: string;
    skillFiles: BlindReviewPacket['skillFiles'];
    targetId: string;
    targetType: BlindReviewJudgment['targetType'];
  }>;
  purpose: 'AUTHOR_BENCHMARK_BLIND_RESOLUTION';
  schemaVersion: 1;
}

export interface AuthorBenchmarkConditionMetrics {
  activationCoverage: { nearBoundary: number; negative: number; positive: number; total: number };
  criticalMatched: number;
  criticalTotal: number;
  lifecycleMatched: number;
  lifecycleTotal: number;
  macroPrecision: number;
  macroRecall: number;
}

export interface AuthorBenchmarkAdjudicatedConditionResult {
  condition: AuthorBenchmarkCondition;
  conditionFingerprint: string;
  criticalViolations: number;
  limitations: string[];
  metrics: AuthorBenchmarkConditionMetrics | null;
  status: 'INSUFFICIENT' | 'NOT_QUALIFIED' | 'QUALIFIED' | 'STALE';
}

export interface AuthorBenchmarkAdjudicationReport {
  bundleFingerprint: string;
  campaignId: string;
  campaignResult: 'INSUFFICIENT' | 'INVALIDATED' | 'NOT_QUALIFIED' | 'QUALIFIED';
  collectionFingerprint: string;
  conditionResults: AuthorBenchmarkAdjudicatedConditionResult[];
  limitations: string[];
  packetFingerprints: string[];
  purpose: 'AUTHOR_QUALIFICATION';
  reviewerSubmissionFingerprints: string[];
  samples: Array<{
    blueprint: EvaluationBlueprint | null;
    caseId: string;
    condition: AuthorBenchmarkCondition;
    elapsedMs: number;
    error: { code: string; diagnostic: unknown } | null;
    sampleId: string;
    status: 'COMPLETED' | 'ERROR' | 'NOT_RUN';
    tokenUsage: AuthorBenchmarkCollection['samples'][number]['tokenUsage'];
  }>;
  schemaVersion: 2;
  selectedCondition: AuthorBenchmarkCondition | null;
  selectionRationale: string;
}

export interface ScoreAuthorBenchmarkInput {
  bundle: AuthorBenchmarkBundleCandidate;
  collection: AuthorBenchmarkCollection;
  conditionFingerprints: Record<AuthorBenchmarkCondition, string>;
  packets: BlindReviewPacket[];
  resolutions: BlindReviewResolution[];
  submissions: BlindReviewerSubmission[];
}

export class AuthorBenchmarkAdjudicationError extends Error {
  readonly code: 'ADJUDICATION_ALREADY_RESERVED' | 'ADJUDICATION_ARTIFACT_INVALID';

  constructor(code: AuthorBenchmarkAdjudicationError['code'], message: string) {
    super(message);
    this.name = 'AuthorBenchmarkAdjudicationError';
    this.code = code;
  }
}

export interface ReserveBlindReviewWorkspaceInput {
  campaignId: string;
  collectionFingerprint: string;
  instructions: string;
  outputDirectory: string;
  packets: BlindReviewPacket[];
  qualificationPacket: ReviewerQualificationPacket;
  reservationPath: string;
  resolutionPolicy: string;
}

export interface LockBlindReviewerEvidenceInput {
  bundle: AuthorBenchmarkBundleCandidate;
  judgmentInputs: Array<{ judgments: BlindReviewJudgment[]; reviewerId: BlindReviewerSubmission['reviewerId'] }>;
  outputDirectory: string;
  packets: BlindReviewPacket[];
  qualificationSubmissions: ReviewerQualificationSubmission[];
}

const controlledFields = new Set(['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint']);

function candidateFromBlueprint(blueprint: EvaluationBlueprint): BlueprintCandidate {
  return Object.fromEntries(Object.entries(blueprint).filter(([key]) => !controlledFields.has(key))) as BlueprintCandidate;
}

function candidateAssertions(candidate: BlueprintCandidate): BlindReviewCandidateAssertion[] {
  const mandatoryClaims = new Set(candidate.claims?.filter((claim) => claim.mandatory).map((claim) => claim.id));
  return [
    ...(candidate.claims ?? []).map((claim) => ({
      critical: claim.mandatory,
      id: `claim:${claim.id}`,
      kind: 'CLAIM' as const,
      statement: claim.statement,
    })),
    ...(candidate.contracts ?? []).map((contract) => ({
      critical: contract.claimIds.some((claimId) => mandatoryClaims.has(claimId)),
      id: `contract:${contract.id}`,
      kind: 'CONTRACT' as const,
      statement: [
        contract.stimulus,
        ...contract.requiredEffects,
        ...contract.prohibitedEffects,
        ...contract.authorityConstraints,
        ...contract.recoveryBehavior,
      ].join(' '),
    })),
    ...(candidate.unresolvedRequirements ?? []).map((requirement) => ({
      critical: requirement.blocking,
      id: `blocker:${requirement.id}`,
      kind: 'BLOCKER' as const,
      statement: requirement.description,
    })),
    ...(candidate.decisionContext === undefined
      ? []
      : [
          {
            critical: true,
            id: 'decision-context',
            kind: 'DECISION_CONTEXT' as const,
            statement: [
              candidate.decisionContext.decision,
              candidate.decisionContext.minimumWorthwhileImprovement,
              candidate.decisionContext.maximumAcceptableRegression,
              candidate.decisionContext.requiredUncertainty,
              ...candidate.decisionContext.severeHarmLimits,
              ...candidate.decisionContext.efficiencyBudgets,
            ].join(' '),
          },
        ]),
  ].sort((left, right) => left.id.localeCompare(right.id));
}

export function fingerprintBlindReviewPacket(packet: Omit<BlindReviewPacket, 'fingerprint'> | BlindReviewPacket): string {
  const body = Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'fingerprint'));
  return sha256(body);
}

export async function createBlindReviewPackets(input: CreateBlindReviewPacketsInput): Promise<BlindReviewPacket[]> {
  const packets: BlindReviewPacket[] = [];
  for (const sample of input.collection.samples.filter(
    (entry): entry is typeof entry & { blueprint: EvaluationBlueprint } => entry.status === 'COMPLETED' && entry.blueprint !== undefined,
  )) {
    const benchmarkCase = input.bundle.cases.find((entry) => entry.id === sample.caseId);
    if (benchmarkCase === undefined) continue;
    const snapshot = await createSkillSnapshot({ rootDirectory: `${input.bundleDirectory}/${benchmarkCase.skillPath}` });
    const candidate = candidateFromBlueprint(sample.blueprint);
    const body = {
      candidate,
      candidateAssertions: candidateAssertions(candidate),
      instructionsDigest: input.bundle.reviewProtocol.instructionsDigest,
      purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW' as const,
      referenceItems: benchmarkCase.referenceItems,
      resolutionPolicyDigest: input.bundle.reviewProtocol.resolutionPolicyDigest,
      sampleId: sample.sampleId,
      schemaVersion: 1 as const,
      skillFiles: snapshot.includedFiles.map(({ content, path }) => ({ content, path })),
    };
    packets.push({ ...body, fingerprint: fingerprintBlindReviewPacket(body) });
  }
  return packets.sort((left, right) => left.sampleId.localeCompare(right.sampleId));
}

function orderedJudgments(judgments: BlindReviewJudgment[]): BlindReviewJudgment[] {
  return [...judgments].sort((left, right) =>
    `${left.sampleId}:${left.targetType}:${left.targetId}`.localeCompare(`${right.sampleId}:${right.targetType}:${right.targetId}`),
  );
}

export function createBlindReviewerSubmission(input: CreateBlindReviewerSubmissionInput): BlindReviewerSubmission {
  const body = {
    judgments: orderedJudgments(input.judgments),
    packetFingerprints: input.packets.map((packet) => packet.fingerprint).sort(),
    reviewerId: input.reviewerId,
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

async function writeExclusive(path: string, value: unknown): Promise<void> {
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new AuthorBenchmarkAdjudicationError('ADJUDICATION_ALREADY_RESERVED', 'exclusive adjudication artifact already exists');
    }
    throw error;
  }
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

export async function reserveBlindReviewWorkspace(input: ReserveBlindReviewWorkspaceInput): Promise<void> {
  if (
    input.campaignId.trim().length === 0 ||
    !/^[a-f0-9]{64}$/u.test(input.collectionFingerprint) ||
    input.packets.some(
      (packet) => !/^[a-f0-9]{64}$/u.test(packet.fingerprint) || packet.fingerprint !== fingerprintBlindReviewPacket(packet),
    )
  ) {
    throw new AuthorBenchmarkAdjudicationError('ADJUDICATION_ARTIFACT_INVALID', 'adjudication identities are invalid');
  }
  await mkdir(dirname(input.reservationPath), { recursive: true });
  await writeExclusive(input.reservationPath, {
    campaignId: input.campaignId,
    collectionFingerprint: input.collectionFingerprint,
    packetFingerprints: input.packets.map((packet) => packet.fingerprint).sort(),
    schemaVersion: 1,
    status: 'RESERVED',
  });
  await mkdir(join(input.outputDirectory, 'packets'), { recursive: true });
  await Promise.all([
    writeFile(join(input.outputDirectory, 'reviewer-instructions.md'), input.instructions, { encoding: 'utf8', flag: 'wx', mode: 0o600 }),
    writeFile(join(input.outputDirectory, 'resolution-policy.md'), input.resolutionPolicy, { encoding: 'utf8', flag: 'wx', mode: 0o600 }),
    writeExclusive(join(input.outputDirectory, 'qualification-packet.json'), input.qualificationPacket),
    ...input.packets.map((packet) => writeExclusive(join(input.outputDirectory, 'packets', `${packet.sampleId}.json`), packet)),
  ]);
  await writeExclusive(join(input.outputDirectory, 'manifest.json'), {
    campaignId: input.campaignId,
    collectionFingerprint: input.collectionFingerprint,
    instructionsDigest: sha256(input.instructions),
    packetFingerprints: input.packets.map((packet) => packet.fingerprint).sort(),
    qualificationPacketFingerprint: input.qualificationPacket.fingerprint,
    resolutionPolicyDigest: sha256(input.resolutionPolicy),
    schemaVersion: 1,
  });
}

export async function lockBlindReviewerEvidence(input: LockBlindReviewerEvidenceInput): Promise<BlindReviewerSubmission[]> {
  const qualification = qualifyAuthorBenchmarkReviewers(input.bundle, input.qualificationSubmissions);
  if (qualification.result !== 'QUALIFIED') {
    throw new AuthorBenchmarkAdjudicationError('ADJUDICATION_ARTIFACT_INVALID', 'reviewers did not qualify before candidate exposure');
  }
  const submissions = input.judgmentInputs.map((entry) =>
    createBlindReviewerSubmission({ judgments: entry.judgments, packets: input.packets, reviewerId: entry.reviewerId }),
  );
  if (
    submissions.length !== 2 ||
    new Set(submissions.map((entry) => entry.reviewerId)).size !== 2 ||
    submissions.some((submission) => !validateBlindReviewerSubmission(input.packets, submission))
  ) {
    throw new AuthorBenchmarkAdjudicationError('ADJUDICATION_ARTIFACT_INVALID', 'reviewer judgments are incomplete or invalid');
  }
  await Promise.all([
    ...input.qualificationSubmissions.map((submission) =>
      writeExclusive(join(input.outputDirectory, `${submission.reviewerId}-qualification.json`), submission),
    ),
    writeExclusive(join(input.outputDirectory, 'reviewer-qualification-result.json'), qualification),
    ...submissions.map((submission) => writeExclusive(join(input.outputDirectory, `${submission.reviewerId}.json`), submission)),
  ]);
  return submissions;
}

export function createBlindReviewResolution(
  resolutions: BlindReviewResolution[],
  submissions: BlindReviewerSubmission[],
): { fingerprint: string; resolutions: BlindReviewResolution[]; reviewerSubmissionFingerprints: string[]; schemaVersion: 1 } {
  const body = {
    resolutions: [...resolutions].sort((left, right) => targetKey(left).localeCompare(targetKey(right))),
    reviewerSubmissionFingerprints: submissions.map((submission) => submission.fingerprint).sort(),
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

export function createBlindResolutionPacket(packets: BlindReviewPacket[], submissions: BlindReviewerSubmission[]): BlindResolutionPacket {
  if (submissions.length !== 2 || submissions.some((submission) => !validateBlindReviewerSubmission(packets, submission))) {
    throw new AuthorBenchmarkAdjudicationError('ADJUDICATION_ARTIFACT_INVALID', 'resolution requires two valid locked submissions');
  }
  const first = new Map(submissions[0]!.judgments.map((judgment) => [targetKey(judgment), judgment]));
  const second = new Map(submissions[1]!.judgments.map((judgment) => [targetKey(judgment), judgment]));
  const items = [...expectedTargets(packets)]
    .filter((key) => {
      const left = first.get(key)?.verdict;
      const right = second.get(key)?.verdict;
      return left !== right || left === 'NEEDS_ADJUDICATION';
    })
    .sort()
    .map((key) => {
      const left = first.get(key)!;
      const right = second.get(key)!;
      const packet = packets.find((entry) => entry.sampleId === left.sampleId)!;
      return {
        candidateAssertion:
          left.targetType === 'CANDIDATE' ? (packet.candidateAssertions.find((entry) => entry.id === left.targetId) ?? null) : null,
        referenceItem: left.targetType === 'REFERENCE' ? (packet.referenceItems.find((entry) => entry.id === left.targetId) ?? null) : null,
        reviewerJudgments: [
          {
            evidencePaths: left.evidencePaths,
            rationale: left.rationale,
            reviewerId: submissions[0]!.reviewerId,
            verdict: left.verdict,
          },
          {
            evidencePaths: right.evidencePaths,
            rationale: right.rationale,
            reviewerId: submissions[1]!.reviewerId,
            verdict: right.verdict,
          },
        ].sort((a, b) => a.reviewerId.localeCompare(b.reviewerId)),
        sampleId: left.sampleId,
        skillFiles: packet.skillFiles,
        targetId: left.targetId,
        targetType: left.targetType,
      };
    });
  const body = { items, purpose: 'AUTHOR_BENCHMARK_BLIND_RESOLUTION' as const, schemaVersion: 1 as const };
  return { ...body, fingerprint: sha256(body) };
}

export async function lockBlindResolutionPacket(outputDirectory: string, packet: BlindResolutionPacket): Promise<void> {
  await writeExclusive(join(outputDirectory, 'resolution-packet.json'), packet);
}

export async function lockBlindReviewResolution(
  outputDirectory: string,
  packets: BlindReviewPacket[],
  resolutions: BlindReviewResolution[],
  submissions: BlindReviewerSubmission[],
): Promise<ReturnType<typeof createBlindReviewResolution>> {
  if (!resolvedVerdicts(packets, submissions, resolutions).valid) {
    throw new AuthorBenchmarkAdjudicationError(
      'ADJUDICATION_ARTIFACT_INVALID',
      'resolution does not cover exactly the locked disagreements',
    );
  }
  const artifact = createBlindReviewResolution(resolutions, submissions);
  await writeExclusive(join(outputDirectory, 'resolution.json'), artifact);
  return artifact;
}

function targetKey(value: Pick<BlindReviewJudgment, 'sampleId' | 'targetId' | 'targetType'>): string {
  return `${value.sampleId}:${value.targetType}:${value.targetId}`;
}

function expectedTargets(packets: BlindReviewPacket[]): Set<string> {
  return new Set(
    packets.flatMap((packet) => [
      ...packet.referenceItems.map((item) => `${packet.sampleId}:REFERENCE:${item.id}`),
      ...packet.candidateAssertions.map((item) => `${packet.sampleId}:CANDIDATE:${item.id}`),
    ]),
  );
}

export function validateBlindReviewerSubmission(packets: BlindReviewPacket[], submission: BlindReviewerSubmission): boolean {
  const expected = expectedTargets(packets);
  const actual = submission.judgments.map(targetKey);
  const body = {
    judgments: orderedJudgments(submission.judgments),
    packetFingerprints: submission.packetFingerprints,
    reviewerId: submission.reviewerId,
    schemaVersion: submission.schemaVersion,
  };
  return (
    submission.schemaVersion === 1 &&
    packets.every((packet) => packet.fingerprint === fingerprintBlindReviewPacket(packet)) &&
    submission.fingerprint === sha256(body) &&
    JSON.stringify(submission.packetFingerprints) === JSON.stringify(packets.map((packet) => packet.fingerprint).sort()) &&
    actual.length === expected.size &&
    new Set(actual).size === actual.length &&
    actual.every((key) => expected.has(key)) &&
    submission.judgments.every((judgment) => judgment.rationale.trim().length > 0)
  );
}

function resolvedVerdicts(
  packets: BlindReviewPacket[],
  submissions: BlindReviewerSubmission[],
  resolutions: BlindReviewResolution[],
): { unresolved: Set<string>; verdicts: Map<string, 'ACCEPT' | 'REJECT'>; valid: boolean } {
  if (
    submissions.length !== 2 ||
    new Set(submissions.map((submission) => submission.reviewerId)).size !== 2 ||
    submissions.some((submission) => !validateBlindReviewerSubmission(packets, submission))
  ) {
    return { unresolved: new Set(), valid: false, verdicts: new Map() };
  }
  const first = new Map(submissions[0]!.judgments.map((judgment) => [targetKey(judgment), judgment.verdict]));
  const second = new Map(submissions[1]!.judgments.map((judgment) => [targetKey(judgment), judgment.verdict]));
  const resolutionMap = new Map(resolutions.map((resolution) => [targetKey(resolution), resolution.verdict]));
  const verdicts = new Map<string, 'ACCEPT' | 'REJECT'>();
  const unresolved = new Set<string>();
  const disagreements = new Set<string>();
  for (const key of expectedTargets(packets)) {
    const left = first.get(key);
    const right = second.get(key);
    if (left === right && left !== 'NEEDS_ADJUDICATION' && left !== undefined) {
      verdicts.set(key, left);
      continue;
    }
    disagreements.add(key);
    const resolved = resolutionMap.get(key);
    if (resolved === 'ACCEPT' || resolved === 'REJECT') verdicts.set(key, resolved);
    else unresolved.add(key);
  }
  const validResolutions =
    resolutionMap.size === resolutions.length &&
    resolutions.every((resolution) => disagreements.has(targetKey(resolution)) && resolution.rationale.trim().length > 0) &&
    disagreements.size === resolutions.length;
  return { unresolved, valid: validResolutions, verdicts };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

export function scoreAuthorBenchmark(input: ScoreAuthorBenchmarkInput): AuthorBenchmarkAdjudicationReport {
  const bundleValidation = validateAuthorBenchmarkBundle(input.bundle);
  const resolved = resolvedVerdicts(input.packets, input.submissions, input.resolutions);
  const completedSampleIds = new Set(
    input.collection.samples.filter((sample) => sample.status === 'COMPLETED').map((sample) => sample.sampleId),
  );
  const packetSampleIds = new Set(input.packets.map((packet) => packet.sampleId));
  const integrityValid =
    bundleValidation.valid &&
    bundleValidation.fingerprint === input.collection.bundleFingerprint &&
    resolved.valid &&
    completedSampleIds.size === packetSampleIds.size &&
    [...completedSampleIds].every((sampleId) => packetSampleIds.has(sampleId));
  const conditionResults = (['LUNA_MAX', 'TERRA_XHIGH'] as const).map((condition): AuthorBenchmarkAdjudicatedConditionResult => {
    const samples = input.collection.samples.filter((sample) => sample.condition === condition);
    if (samples.length !== 8 || samples.some((sample) => sample.status !== 'COMPLETED')) {
      return {
        condition,
        conditionFingerprint: input.conditionFingerprints[condition],
        criticalViolations: 0,
        limitations: ['One or more scheduled samples lack a completed canonical Blueprint; semantic quality is not inferred.'],
        metrics: null,
        status: 'INSUFFICIENT',
      };
    }
    const caseRatios: Array<{ precision: number; recall: number }> = [];
    let criticalMatched = 0;
    let criticalTotal = 0;
    let lifecycleMatched = 0;
    let unsupportedCritical = 0;
    let unresolvedCritical = 0;
    const activation = [0, 0, 0];
    const activationTotals = [0, 0, 0];
    for (const sample of samples) {
      const benchmarkCase = input.bundle.cases.find((entry) => entry.id === sample.caseId)!;
      const packet = input.packets.find((entry) => entry.sampleId === sample.sampleId)!;
      if (sample.blueprint?.lifecycle.state === benchmarkCase.expectedLifecycle) lifecycleMatched += 1;
      const criticalItems = benchmarkCase.referenceItems.filter((item) => item.critical);
      criticalTotal += criticalItems.length;
      criticalMatched += criticalItems.filter(
        (item) => resolved.verdicts.get(`${sample.sampleId}:REFERENCE:${item.id}`) === 'ACCEPT',
      ).length;
      unresolvedCritical += criticalItems.filter((item) => resolved.unresolved.has(`${sample.sampleId}:REFERENCE:${item.id}`)).length;
      const noncriticalReference = benchmarkCase.referenceItems.filter(
        (item) => !item.critical && (item.category === 'CLAIM' || item.category === 'CONTRACT'),
      );
      const noncriticalCandidate = packet.candidateAssertions.filter(
        (item) => !item.critical && (item.kind === 'CLAIM' || item.kind === 'CONTRACT'),
      );
      caseRatios.push({
        precision: ratio(
          noncriticalCandidate.filter((item) => resolved.verdicts.get(`${sample.sampleId}:CANDIDATE:${item.id}`) === 'ACCEPT').length,
          noncriticalCandidate.length,
        ),
        recall: ratio(
          noncriticalReference.filter((item) => resolved.verdicts.get(`${sample.sampleId}:REFERENCE:${item.id}`) === 'ACCEPT').length,
          noncriticalReference.length,
        ),
      });
      unsupportedCritical += packet.candidateAssertions.filter(
        (item) => item.critical && resolved.verdicts.get(`${sample.sampleId}:CANDIDATE:${item.id}`) === 'REJECT',
      ).length;
      benchmarkCase.referenceItems
        .filter((item) => item.category === 'ACTIVATION_BOUNDARY')
        .forEach((item, index) => {
          activationTotals[index] = (activationTotals[index] ?? 0) + 1;
          if (resolved.verdicts.get(`${sample.sampleId}:REFERENCE:${item.id}`) === 'ACCEPT')
            activation[index] = (activation[index] ?? 0) + 1;
        });
    }
    const macroPrecision = average(caseRatios.map((entry) => entry.precision));
    const macroRecall = average(caseRatios.map((entry) => entry.recall));
    const criticalViolations = criticalTotal - criticalMatched + unsupportedCritical + unresolvedCritical;
    const usageStressDistinct = samples.every((sample) => {
      const packet = input.packets.find((entry) => entry.sampleId === sample.sampleId)!;
      const usage = packet.candidate.usageFamilies?.map((entry) => entry.description) ?? [];
      const stress = packet.candidate.stressFamilies?.map((entry) => entry.description) ?? [];
      return usage.length > 0 && stress.length > 0 && JSON.stringify(usage) !== JSON.stringify(stress);
    });
    const qualified =
      integrityValid &&
      lifecycleMatched === 8 &&
      criticalViolations === 0 &&
      macroPrecision >= 0.9 &&
      macroRecall >= 0.9 &&
      activation.every((count, index) => count >= Math.min(7, activationTotals[index] ?? 0)) &&
      usageStressDistinct;
    return {
      condition,
      conditionFingerprint: input.conditionFingerprints[condition],
      criticalViolations,
      limitations: qualified ? [] : ['One or more prespecified noncompensatory qualification gates failed.'],
      metrics: {
        activationCoverage: { nearBoundary: activation[2] ?? 0, negative: activation[1] ?? 0, positive: activation[0] ?? 0, total: 8 },
        criticalMatched,
        criticalTotal,
        lifecycleMatched,
        lifecycleTotal: 8,
        macroPrecision,
        macroRecall,
      },
      status: qualified ? 'QUALIFIED' : 'NOT_QUALIFIED',
    };
  });
  const selected = conditionResults.find((entry) => entry.condition === 'LUNA_MAX' && entry.status === 'QUALIFIED')
    ? 'LUNA_MAX'
    : conditionResults.find((entry) => entry.condition === 'TERRA_XHIGH' && entry.status === 'QUALIFIED')
      ? 'TERRA_XHIGH'
      : null;
  const campaignResult = !integrityValid
    ? 'INVALIDATED'
    : selected !== null
      ? 'QUALIFIED'
      : conditionResults.some((entry) => entry.status === 'INSUFFICIENT')
        ? 'INSUFFICIENT'
        : 'NOT_QUALIFIED';
  return {
    bundleFingerprint: input.collection.bundleFingerprint,
    campaignId: input.collection.campaignId,
    campaignResult,
    collectionFingerprint: sha256(input.collection),
    conditionResults,
    limitations: [
      'One scheduled sample per case and condition does not establish general reliability or statistical superiority.',
      'Effective provider model identity is unavailable on the collected SDK surface.',
    ],
    packetFingerprints: input.packets.map((packet) => packet.fingerprint).sort(),
    purpose: 'AUTHOR_QUALIFICATION',
    reviewerSubmissionFingerprints: input.submissions.map((submission) => submission.fingerprint).sort(),
    samples: input.collection.samples.map((sample) => ({
      blueprint: sample.blueprint ?? null,
      caseId: sample.caseId,
      condition: sample.condition,
      elapsedMs: sample.elapsedMs,
      error: sample.error === undefined ? null : { code: sample.error.code, diagnostic: sample.error.diagnostic ?? null },
      sampleId: sample.sampleId,
      status: sample.status,
      tokenUsage: sample.tokenUsage,
    })),
    schemaVersion: 2,
    selectedCondition: selected,
    selectionRationale:
      selected === 'LUNA_MAX'
        ? 'Luna/max qualified and is selected by the frozen cost-minimizing rule.'
        : selected === 'TERRA_XHIGH'
          ? 'Luna/max did not qualify with complete evidence; Terra/xhigh qualified as the fallback.'
          : 'AUTOMATIC_AUTHOR_NOT_DEFENSIBLE',
  };
}
