import { canonicalJson, sha256 } from '../canonical-json.js';
import type { BlueprintCandidate, EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
import type { IncludedSkillFile } from '../intake/skill-snapshot.js';

export type AuthorViabilityVerdict = 'ACCEPT' | 'NEEDS_ADJUDICATION' | 'REJECT';

export interface AuthorViabilityOracleCriterion {
  critical: boolean;
  id: string;
  statement: string;
}

export interface AuthorViabilityOracle {
  criteria: AuthorViabilityOracleCriterion[];
  qualificationCases: Array<{
    description: string;
    expected: AuthorViabilityVerdict;
    id: string;
  }>;
  reviewPolicy: {
    allowedJudgments: AuthorViabilityVerdict[];
    evidenceMustUseBlueprintJsonPointers: true;
    mechanicalCriticalFailuresTakePrecedence: true;
    resolveOnlyDisagreements: true;
  };
  schemaVersion: 1;
}

export interface AuthorViabilityReviewPacket {
  candidate: BlueprintCandidate;
  criteria: AuthorViabilityOracleCriterion[];
  fingerprint: string;
  purpose: 'AUTHOR_VIABILITY_BLIND_REVIEW';
  schemaVersion: 1;
  skillFiles: Array<{ content: string; path: string }>;
}

export interface AuthorViabilityJudgment {
  criterionId: string;
  evidencePaths: string[];
  rationale: string;
  verdict: AuthorViabilityVerdict;
}

export interface AuthorViabilityReviewerSubmission {
  fingerprint: string;
  judgments: AuthorViabilityJudgment[];
  packetFingerprint: string;
  reviewerId: 'reviewer-a' | 'reviewer-b';
  schemaVersion: 1;
}

export interface AuthorViabilityResolutionPacket {
  disagreements: Array<{
    criterion: AuthorViabilityOracleCriterion;
    criterionId: string;
    reviewerJudgments: Array<{
      evidencePaths: string[];
      rationale: string;
      reviewerId: 'reviewer-a' | 'reviewer-b';
      verdict: AuthorViabilityVerdict;
    }>;
  }>;
  fingerprint: string;
  packetFingerprint: string;
  purpose: 'AUTHOR_VIABILITY_DISAGREEMENT_RESOLUTION';
  schemaVersion: 1;
}

const mechanicalCriterionId = 'system-controlled-lifecycle-and-provenance';
const verdicts = new Set<AuthorViabilityVerdict>(['ACCEPT', 'NEEDS_ADJUDICATION', 'REJECT']);

function candidateFromBlueprint(blueprint: EvaluationBlueprint): BlueprintCandidate {
  return Object.fromEntries(
    Object.entries(blueprint).filter(
      ([key]) => !['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint'].includes(key),
    ),
  ) as BlueprintCandidate;
}

function fingerprintWithoutFingerprint(value: object): string {
  return sha256(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'fingerprint')));
}

function orderedCriteria(criteria: AuthorViabilityOracleCriterion[]): AuthorViabilityOracleCriterion[] {
  return [...criteria].sort((left, right) => left.id.localeCompare(right.id));
}

function orderedJudgments(judgments: AuthorViabilityJudgment[]): AuthorViabilityJudgment[] {
  return [...judgments].sort((left, right) => left.criterionId.localeCompare(right.criterionId));
}

function validPointer(candidate: BlueprintCandidate, pointer: string): boolean {
  if (!pointer.startsWith('/candidate/')) return false;
  const segments = pointer
    .slice('/candidate/'.length)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let current: unknown = candidate;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
}

export function validateAuthorViabilityOracle(value: unknown): value is AuthorViabilityOracle {
  if (typeof value !== 'object' || value === null) return false;
  const oracle = value as Partial<AuthorViabilityOracle>;
  if (oracle.schemaVersion !== 1 || !Array.isArray(oracle.criteria) || !Array.isArray(oracle.qualificationCases)) return false;
  if (
    oracle.reviewPolicy === undefined ||
    !Array.isArray(oracle.reviewPolicy.allowedJudgments) ||
    canonicalJson([...oracle.reviewPolicy.allowedJudgments].sort()) !== canonicalJson([...verdicts].sort()) ||
    oracle.reviewPolicy.evidenceMustUseBlueprintJsonPointers !== true ||
    oracle.reviewPolicy.mechanicalCriticalFailuresTakePrecedence !== true ||
    oracle.reviewPolicy.resolveOnlyDisagreements !== true
  ) {
    return false;
  }
  const ids = new Set<string>();
  return (
    oracle.criteria.length > 0 &&
    oracle.criteria.every((criterion) => {
      if (
        typeof criterion !== 'object' ||
        criterion === null ||
        typeof criterion.id !== 'string' ||
        criterion.id.length === 0 ||
        ids.has(criterion.id) ||
        typeof criterion.critical !== 'boolean' ||
        typeof criterion.statement !== 'string' ||
        criterion.statement.length === 0
      ) {
        return false;
      }
      ids.add(criterion.id);
      return true;
    }) &&
    ids.has(mechanicalCriterionId) &&
    oracle.qualificationCases.length >= 3 &&
    oracle.qualificationCases.every(
      (qualificationCase) =>
        typeof qualificationCase.id === 'string' &&
        qualificationCase.id.length > 0 &&
        typeof qualificationCase.description === 'string' &&
        qualificationCase.description.length > 0 &&
        verdicts.has(qualificationCase.expected),
    ) &&
    oracle.qualificationCases.some((qualificationCase) => qualificationCase.expected === 'ACCEPT') &&
    oracle.qualificationCases.some((qualificationCase) => qualificationCase.expected === 'REJECT')
  );
}

export function createAuthorViabilityReviewPacket(input: {
  blueprint: EvaluationBlueprint;
  oracle: AuthorViabilityOracle;
  skillFiles: IncludedSkillFile[];
}): AuthorViabilityReviewPacket {
  if (!validateAuthorViabilityOracle(input.oracle)) throw new Error('author viability oracle is invalid');
  const body = {
    candidate: candidateFromBlueprint(input.blueprint),
    criteria: orderedCriteria(input.oracle.criteria.filter((criterion) => criterion.id !== mechanicalCriterionId)),
    purpose: 'AUTHOR_VIABILITY_BLIND_REVIEW' as const,
    schemaVersion: 1 as const,
    skillFiles: input.skillFiles.map(({ content, path }) => ({ content, path })).sort((left, right) => left.path.localeCompare(right.path)),
  };
  return { ...body, fingerprint: sha256(body) };
}

export function validateAuthorViabilityReviewPacket(packet: AuthorViabilityReviewPacket): boolean {
  const packetKeys = Object.keys(packet).sort();
  const candidateKeys = Object.keys(packet.candidate);
  return (
    canonicalJson(packetKeys) ===
      canonicalJson(['candidate', 'criteria', 'fingerprint', 'purpose', 'schemaVersion', 'skillFiles'].sort()) &&
    packet.schemaVersion === 1 &&
    packet.purpose === 'AUTHOR_VIABILITY_BLIND_REVIEW' &&
    packet.criteria.length > 0 &&
    packet.criteria.every((criterion) => criterion.id !== mechanicalCriterionId) &&
    candidateKeys.every((key) => !['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint'].includes(key)) &&
    !/gpt-5\.6-(?:luna|terra)|e18-|e19-|expectedLifecycle|authorProvenance/u.test(canonicalJson(packet)) &&
    packet.fingerprint === fingerprintWithoutFingerprint(packet)
  );
}

export function createAuthorViabilityReviewerSubmission(input: {
  judgments: AuthorViabilityJudgment[];
  packet: AuthorViabilityReviewPacket;
  reviewerId: 'reviewer-a' | 'reviewer-b';
}): AuthorViabilityReviewerSubmission {
  const body = {
    judgments: orderedJudgments(input.judgments),
    packetFingerprint: input.packet.fingerprint,
    reviewerId: input.reviewerId,
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

export function validateAuthorViabilityReviewerSubmission(
  packet: AuthorViabilityReviewPacket,
  submission: AuthorViabilityReviewerSubmission,
): boolean {
  const expectedIds = packet.criteria.map((criterion) => criterion.id).sort();
  const actualIds = submission.judgments.map((judgment) => judgment.criterionId).sort();
  return (
    submission.schemaVersion === 1 &&
    (submission.reviewerId === 'reviewer-a' || submission.reviewerId === 'reviewer-b') &&
    submission.packetFingerprint === packet.fingerprint &&
    canonicalJson(actualIds) === canonicalJson(expectedIds) &&
    new Set(actualIds).size === actualIds.length &&
    submission.judgments.every(
      (judgment) =>
        verdicts.has(judgment.verdict) &&
        judgment.rationale.trim().length > 0 &&
        judgment.evidencePaths.length > 0 &&
        judgment.evidencePaths.every((path) => validPointer(packet.candidate, path)),
    ) &&
    submission.fingerprint === fingerprintWithoutFingerprint(submission)
  );
}

export function createAuthorViabilityResolutionPacket(
  packet: AuthorViabilityReviewPacket,
  submissions: AuthorViabilityReviewerSubmission[],
): AuthorViabilityResolutionPacket {
  if (
    submissions.length !== 2 ||
    new Set(submissions.map((submission) => submission.reviewerId)).size !== 2 ||
    submissions.some((submission) => !validateAuthorViabilityReviewerSubmission(packet, submission))
  ) {
    throw new Error('resolution requires two independent valid reviewer submissions');
  }
  const ordered = [...submissions].sort((left, right) => left.reviewerId.localeCompare(right.reviewerId));
  const judgmentMaps = ordered.map((submission) => new Map(submission.judgments.map((judgment) => [judgment.criterionId, judgment])));
  const disagreements = packet.criteria
    .filter((criterion) => {
      const left = judgmentMaps[0]!.get(criterion.id)!;
      const right = judgmentMaps[1]!.get(criterion.id)!;
      return left.verdict !== right.verdict || left.verdict === 'NEEDS_ADJUDICATION';
    })
    .map((criterion) => ({
      criterion,
      criterionId: criterion.id,
      reviewerJudgments: ordered.map((submission, index) => {
        const judgment = judgmentMaps[index]!.get(criterion.id)!;
        return {
          evidencePaths: judgment.evidencePaths,
          rationale: judgment.rationale,
          reviewerId: submission.reviewerId,
          verdict: judgment.verdict,
        };
      }),
    }));
  const body = {
    disagreements,
    packetFingerprint: packet.fingerprint,
    purpose: 'AUTHOR_VIABILITY_DISAGREEMENT_RESOLUTION' as const,
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

export function resolveAuthorViabilityReview(
  packet: AuthorViabilityReviewPacket,
  submissions: AuthorViabilityReviewerSubmission[],
  resolutions: AuthorViabilityJudgment[],
): { decision: 'NOT_VIABLE_FOR_AUTHOR' | 'VIABLE_CANDIDATE'; fingerprint: string; judgments: AuthorViabilityJudgment[] } {
  const resolutionPacket = createAuthorViabilityResolutionPacket(packet, submissions);
  const expectedIds = resolutionPacket.disagreements.map((entry) => entry.criterionId).sort();
  const actualIds = resolutions.map((resolution) => resolution.criterionId).sort();
  if (
    canonicalJson(actualIds) !== canonicalJson(expectedIds) ||
    new Set(actualIds).size !== actualIds.length ||
    resolutions.some(
      (resolution) =>
        resolution.verdict === 'NEEDS_ADJUDICATION' ||
        !verdicts.has(resolution.verdict) ||
        resolution.rationale.trim().length === 0 ||
        resolution.evidencePaths.length === 0 ||
        resolution.evidencePaths.some((path) => !validPointer(packet.candidate, path)),
    )
  ) {
    throw new Error('resolver judgments must cover exactly the disagreements');
  }
  const resolutionMap = new Map(resolutions.map((resolution) => [resolution.criterionId, resolution]));
  const reviewerMaps = submissions.map((submission) => new Map(submission.judgments.map((judgment) => [judgment.criterionId, judgment])));
  const judgments = packet.criteria.map((criterion) => {
    const resolution = resolutionMap.get(criterion.id);
    if (resolution !== undefined) return resolution;
    const agreed = reviewerMaps[0]!.get(criterion.id)!;
    return agreed;
  });
  const criticalIds = new Set(packet.criteria.filter((criterion) => criterion.critical).map((criterion) => criterion.id));
  const decision: 'NOT_VIABLE_FOR_AUTHOR' | 'VIABLE_CANDIDATE' = judgments.some(
    (judgment) => criticalIds.has(judgment.criterionId) && judgment.verdict !== 'ACCEPT',
  )
    ? 'NOT_VIABLE_FOR_AUTHOR'
    : 'VIABLE_CANDIDATE';
  const body = { decision, judgments: orderedJudgments(judgments) };
  return { ...body, fingerprint: sha256(body) };
}
