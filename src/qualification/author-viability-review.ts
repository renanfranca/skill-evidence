import { canonicalJson, sha256 } from '../canonical-json.js';
import type { EvaluationBlueprint } from '../blueprint/evaluation-blueprint.js';
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
  candidate: Record<string, unknown>;
  criteria: AuthorViabilityOracleCriterion[];
  fingerprint: string;
  purpose: 'AUTHOR_VIABILITY_BLIND_REVIEW';
  schemaVersion: 1 | 2;
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
  principalFingerprint?: string;
  reviewerId: 'reviewer-a' | 'reviewer-b';
  schemaVersion: 1;
  sessionFingerprint?: string;
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

export interface AuthorViabilityReviewerProbeSet {
  probes: Array<{
    expected: 'ACCEPT' | 'REJECT';
    family: 'ALTERNATIVE_VALID' | 'KNOWN_INVALID';
    id: string;
    observation: string;
  }>;
  schemaVersion: 1;
}

export interface AuthorViabilityReviewerQualificationPacket {
  fingerprint: string;
  probes: Array<{ id: string; observation: string }>;
  purpose: 'AUTHOR_VIABILITY_REVIEWER_QUALIFICATION';
  schemaVersion: 1;
}

export interface AuthorViabilityReviewerQualificationInput {
  judgments: Array<{ probeId: string; verdict: 'ACCEPT' | 'REJECT' }>;
  principalFingerprint: string;
  reviewerId: 'reviewer-a' | 'reviewer-b';
  sessionFingerprint: string;
}

export interface AuthorViabilityReviewerQualificationSubmission extends AuthorViabilityReviewerQualificationInput {
  fingerprint: string;
  packetFingerprint: string;
  schemaVersion: 1;
}

const mechanicalCriterionId = 'system-controlled-lifecycle-and-provenance';
const verdicts = new Set<AuthorViabilityVerdict>(['ACCEPT', 'NEEDS_ADJUDICATION', 'REJECT']);
const opaqueFingerprint = /^[a-f0-9]{64}$/u;
const protocolV3CandidateKeys = [
  'activationRegions',
  'analysisPlan',
  'claims',
  'contrasts',
  'contracts',
  'evidencePlan',
  'exclusions',
  'oracleQualificationPlan',
  'policies',
  'samplingPlan',
  'skill',
  'stoppingConditions',
  'stressFamilies',
  'unresolvedRequirements',
  'untestedRisks',
  'usageFamilies',
] as const;
const blindForbiddenKeys = new Set([
  'authorProvenance',
  'blueprintId',
  'campaign',
  'campaignId',
  'claimRequirementId',
  'claimRequirements',
  'conditionFingerprint',
  'credential',
  'credentials',
  'decisionContext',
  'identity',
  'identities',
  'lifecycle',
  'missingEvidenceSemantics',
  'model',
  'observedModel',
  'population',
  'populationScopeIds',
  'principalFingerprint',
  'provenance',
  'rawReasoning',
  'rawResponse',
  'reasoning',
  'reasoningEffort',
  'requestedModel',
  'responseRaw',
  'reviewerId',
  'secret',
  'secrets',
  'sessionFingerprint',
  'snapshotFingerprint',
]);

function hasExactKeys(value: object, keys: string[]): boolean {
  return canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function isBlindValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return !/gpt-5\.6-(?:luna|terra)|\bxhigh\b|\be(?:18|19|20|22)-|\b(?:blocked|draft|ready)\b|SYSTEM_AUTHORING_CONTEXT|system:authoring-context/iu.test(
      value,
    );
  }
  if (Array.isArray(value)) return value.every(isBlindValue);
  if (typeof value !== 'object' || value === null) return true;
  return Object.entries(value).every(([key, nested]) => {
    const normalizedKey = key.replaceAll(/[^a-z0-9]/giu, '').toLowerCase();
    const forbiddenVariant =
      /(?:campaign|credential|identity|lifecycle|model|provenance|rawreasoning|rawresponse|reasoning|responseraw|secret)/u.test(
        normalizedKey,
      );
    const conditionVariant =
      normalizedKey.includes('condition') && !['condition', 'conditions', 'preconditions', 'stoppingconditions'].includes(normalizedKey);
    return !blindForbiddenKeys.has(key) && !forbiddenVariant && !conditionVariant && isBlindValue(nested);
  });
}

export function validateAuthorViabilityReviewerProbeSet(value: unknown): value is AuthorViabilityReviewerProbeSet {
  if (
    typeof value !== 'object' ||
    value === null ||
    !hasExactKeys(value, ['probes', 'schemaVersion']) ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('probes' in value)
  ) {
    return false;
  }
  if (!Array.isArray(value.probes) || value.probes.length !== 4) return false;
  const ids = new Set<string>();
  let alternatives = 0;
  let knownInvalid = 0;
  return (
    value.probes.every((probe: unknown) => {
      if (
        typeof probe !== 'object' ||
        probe === null ||
        !hasExactKeys(probe, ['expected', 'family', 'id', 'observation']) ||
        !('id' in probe) ||
        typeof probe.id !== 'string' ||
        !/^q-[a-f0-9]{8}$/u.test(probe.id) ||
        ids.has(probe.id) ||
        !('observation' in probe) ||
        typeof probe.observation !== 'string' ||
        probe.observation.length === 0 ||
        !('family' in probe) ||
        !('expected' in probe)
      ) {
        return false;
      }
      ids.add(probe.id);
      if (probe.family === 'ALTERNATIVE_VALID' && probe.expected === 'ACCEPT') alternatives += 1;
      else if (probe.family === 'KNOWN_INVALID' && probe.expected === 'REJECT') knownInvalid += 1;
      else return false;
      return alternatives <= 1 && knownInvalid <= 3;
    }) &&
    alternatives === 1 &&
    knownInvalid === 3
  );
}

export function createAuthorViabilityReviewerQualificationPacket(
  probes: AuthorViabilityReviewerProbeSet,
): AuthorViabilityReviewerQualificationPacket {
  if (!validateAuthorViabilityReviewerProbeSet(probes)) throw new Error('author viability reviewer probes are invalid');
  const body = {
    probes: probes.probes.map(({ id, observation }) => ({ id, observation })).sort((left, right) => left.id.localeCompare(right.id)),
    purpose: 'AUTHOR_VIABILITY_REVIEWER_QUALIFICATION' as const,
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

export function createAuthorViabilityReviewerQualificationSubmission(input: {
  input: AuthorViabilityReviewerQualificationInput;
  packet: AuthorViabilityReviewerQualificationPacket;
}): AuthorViabilityReviewerQualificationSubmission {
  const body = {
    judgments: [...input.input.judgments].sort((left, right) => left.probeId.localeCompare(right.probeId)),
    packetFingerprint: input.packet.fingerprint,
    principalFingerprint: input.input.principalFingerprint,
    reviewerId: input.input.reviewerId,
    schemaVersion: 1 as const,
    sessionFingerprint: input.input.sessionFingerprint,
  };
  return { ...body, fingerprint: sha256(body) };
}

export function qualifyAuthorViabilityReviewers(input: {
  packet: AuthorViabilityReviewerQualificationPacket;
  probes: AuthorViabilityReviewerProbeSet;
  submissions: AuthorViabilityReviewerQualificationSubmission[];
}): {
  fingerprint: string;
  result: 'BLOCKED' | 'QUALIFIED';
  reviewerCount: number;
  reviewerSubmissionFingerprints: string[];
  schemaVersion: 1;
} {
  const expected = new Map(input.probes.probes.map((probe) => [probe.id, probe.expected]));
  const valid =
    input.submissions.length === 2 &&
    new Set(input.submissions.map((submission) => submission.reviewerId)).size === 2 &&
    new Set(input.submissions.map((submission) => submission.principalFingerprint)).size === 2 &&
    new Set(input.submissions.map((submission) => submission.sessionFingerprint)).size === 2 &&
    input.submissions.every(
      (submission) =>
        hasExactKeys(submission, [
          'fingerprint',
          'judgments',
          'packetFingerprint',
          'principalFingerprint',
          'reviewerId',
          'schemaVersion',
          'sessionFingerprint',
        ]) &&
        submission.schemaVersion === 1 &&
        typeof submission.principalFingerprint === 'string' &&
        opaqueFingerprint.test(submission.principalFingerprint) &&
        typeof submission.sessionFingerprint === 'string' &&
        opaqueFingerprint.test(submission.sessionFingerprint) &&
        submission.packetFingerprint === input.packet.fingerprint &&
        submission.fingerprint === fingerprintWithoutFingerprint(submission) &&
        submission.judgments.length === expected.size &&
        new Set(submission.judgments.map((judgment) => judgment.probeId)).size === expected.size &&
        submission.judgments.every(
          (judgment) => hasExactKeys(judgment, ['probeId', 'verdict']) && expected.get(judgment.probeId) === judgment.verdict,
        ),
    );
  const body = {
    result: valid ? ('QUALIFIED' as const) : ('BLOCKED' as const),
    reviewerCount: input.submissions.length,
    reviewerSubmissionFingerprints: input.submissions.map((submission) => submission.fingerprint).sort(),
    schemaVersion: 1 as const,
  };
  return { ...body, fingerprint: sha256(body) };
}

function candidateFromBlueprint(blueprint: EvaluationBlueprint): Record<string, unknown> {
  if (blueprint.schemaVersion !== 3) {
    return Object.fromEntries(
      Object.entries(blueprint).filter(
        ([key]) => !['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint'].includes(key),
      ),
    );
  }
  const candidate: Record<string, unknown> = Object.fromEntries(
    Object.entries(blueprint).filter(([key]) => protocolV3CandidateKeys.includes(key as (typeof protocolV3CandidateKeys)[number])),
  );
  candidate.claims = blueprint.claims.map((claim) =>
    Object.fromEntries(
      Object.entries(claim).filter(
        ([key]) => !['claimRequirementId', 'decisionCritical', 'mandatory', 'populationScopeIds', 'status'].includes(key),
      ),
    ),
  );
  candidate.evidencePlan = blueprint.evidencePlan.map((requirement) =>
    Object.fromEntries(Object.entries(requirement).filter(([key]) => key !== 'missingEvidenceSemantics')),
  );
  candidate.unresolvedRequirements = blueprint.unresolvedRequirements
    .filter((requirement) => requirement.origin === 'AUTHOR')
    .map((requirement) => Object.fromEntries(Object.entries(requirement).filter(([key]) => key !== 'origin')));
  return candidate;
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

function validPointer(candidate: Record<string, unknown>, pointer: string): boolean {
  if (!pointer.startsWith('/candidate/')) return false;
  const encodedSegments = pointer.slice('/candidate/'.length).split('/');
  if (encodedSegments.some((segment) => /~(?:[^01]|$)/u.test(segment))) return false;
  const segments = encodedSegments.map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let current: unknown = candidate;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(segment)) return false;
      const index = Number(segment);
      if (!Number.isSafeInteger(index) || index >= current.length || !Object.hasOwn(current, index)) return false;
      current = current[index];
      continue;
    }
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, segment)) return false;
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
    schemaVersion: input.blueprint.schemaVersion === 3 ? (2 as const) : (1 as const),
    skillFiles: input.skillFiles.map(({ content, path }) => ({ content, path })).sort((left, right) => left.path.localeCompare(right.path)),
  };
  return { ...body, fingerprint: sha256(body) };
}

export function validateAuthorViabilityReviewPacket(packet: AuthorViabilityReviewPacket): boolean {
  const packetKeys = Object.keys(packet).sort();
  const candidateKeys = Object.keys(packet.candidate);
  const packetText = canonicalJson(packet);
  const forbiddenV3Keys =
    /"(?:authorProvenance|blueprintId|claimRequirements|decisionContext|lifecycle|missingEvidenceSemantics|population|populationScopeIds|snapshotFingerprint)":/u;
  return (
    canonicalJson(packetKeys) ===
      canonicalJson(['candidate', 'criteria', 'fingerprint', 'purpose', 'schemaVersion', 'skillFiles'].sort()) &&
    (packet.schemaVersion === 1 || packet.schemaVersion === 2) &&
    packet.purpose === 'AUTHOR_VIABILITY_BLIND_REVIEW' &&
    packet.criteria.length > 0 &&
    packet.criteria.every(
      (criterion) => hasExactKeys(criterion, ['critical', 'id', 'statement']) && criterion.id !== mechanicalCriterionId,
    ) &&
    packet.skillFiles.every(
      (file) => hasExactKeys(file, ['content', 'path']) && typeof file.content === 'string' && typeof file.path === 'string',
    ) &&
    candidateKeys.every((key) => !['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint'].includes(key)) &&
    !/gpt-5\.6-(?:luna|terra)|e18-|e19-|e20-|e22-|expectedLifecycle|authorProvenance/u.test(packetText) &&
    (packet.schemaVersion === 1 ||
      (hasExactKeys(packet.candidate, [...protocolV3CandidateKeys]) && !forbiddenV3Keys.test(packetText) && isBlindValue(packet))) &&
    packet.fingerprint === fingerprintWithoutFingerprint(packet)
  );
}

export function createAuthorViabilityReviewerSubmission(input: {
  judgments: AuthorViabilityJudgment[];
  packet: AuthorViabilityReviewPacket;
  principalFingerprint?: string;
  reviewerId: 'reviewer-a' | 'reviewer-b';
  sessionFingerprint?: string;
}): AuthorViabilityReviewerSubmission {
  const body = {
    judgments: orderedJudgments(input.judgments),
    packetFingerprint: input.packet.fingerprint,
    ...(input.principalFingerprint === undefined ? {} : { principalFingerprint: input.principalFingerprint }),
    reviewerId: input.reviewerId,
    schemaVersion: 1 as const,
    ...(input.sessionFingerprint === undefined ? {} : { sessionFingerprint: input.sessionFingerprint }),
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
    hasExactKeys(
      submission,
      packet.schemaVersion === 2
        ? ['fingerprint', 'judgments', 'packetFingerprint', 'principalFingerprint', 'reviewerId', 'schemaVersion', 'sessionFingerprint']
        : ['fingerprint', 'judgments', 'packetFingerprint', 'reviewerId', 'schemaVersion'],
    ) &&
    submission.schemaVersion === 1 &&
    (submission.reviewerId === 'reviewer-a' || submission.reviewerId === 'reviewer-b') &&
    submission.packetFingerprint === packet.fingerprint &&
    canonicalJson(actualIds) === canonicalJson(expectedIds) &&
    new Set(actualIds).size === actualIds.length &&
    (packet.schemaVersion === 1 ||
      (typeof submission.principalFingerprint === 'string' &&
        opaqueFingerprint.test(submission.principalFingerprint) &&
        typeof submission.sessionFingerprint === 'string' &&
        opaqueFingerprint.test(submission.sessionFingerprint))) &&
    submission.judgments.every(
      (judgment) =>
        hasExactKeys(judgment, ['criterionId', 'evidencePaths', 'rationale', 'verdict']) &&
        verdicts.has(judgment.verdict) &&
        judgment.rationale.trim().length > 0 &&
        judgment.evidencePaths.length > 0 &&
        judgment.evidencePaths.every((path) => validPointer(packet.candidate, path)),
    ) &&
    submission.fingerprint === fingerprintWithoutFingerprint(submission)
  );
}

export function validateAuthorViabilityReviewerContinuity(
  qualificationSubmissions: AuthorViabilityReviewerQualificationSubmission[],
  reviewSubmissions: AuthorViabilityReviewerSubmission[],
): boolean {
  if (
    qualificationSubmissions.length !== 2 ||
    reviewSubmissions.length !== 2 ||
    new Set(qualificationSubmissions.map((submission) => submission.reviewerId)).size !== 2 ||
    new Set(reviewSubmissions.map((submission) => submission.reviewerId)).size !== 2 ||
    new Set(qualificationSubmissions.map((submission) => submission.principalFingerprint)).size !== 2 ||
    new Set(qualificationSubmissions.map((submission) => submission.sessionFingerprint)).size !== 2 ||
    new Set(reviewSubmissions.map((submission) => submission.principalFingerprint)).size !== 2 ||
    new Set(reviewSubmissions.map((submission) => submission.sessionFingerprint)).size !== 2
  ) {
    return false;
  }
  const qualifiedByReviewer = new Map(qualificationSubmissions.map((submission) => [submission.reviewerId, submission]));
  return reviewSubmissions.every((submission) => {
    const qualified = qualifiedByReviewer.get(submission.reviewerId);
    return (
      qualified !== undefined &&
      submission.principalFingerprint === qualified.principalFingerprint &&
      submission.sessionFingerprint === qualified.sessionFingerprint
    );
  });
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
        !hasExactKeys(resolution, ['criterionId', 'evidencePaths', 'rationale', 'verdict']) ||
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
