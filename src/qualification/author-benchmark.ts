import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson, sha256 } from '../canonical-json.js';
import { prepareAuthorInvocation } from '../author/evaluation-author.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';

export type AuthorBenchmarkStratum = 'AUTHORITY_WORKFLOW' | 'EVIDENCE_ANALYSIS' | 'FILESYSTEM' | 'TRANSFORMATION';
export type ReferenceLifecycle = 'BLOCKED' | 'READY';
export type ReviewerProbeFamily = 'ALTERNATIVE_VALID' | 'KNOWN_INVALID' | 'KNOWN_VALID' | 'UNSUPPORTED_FLUENCY';
export type AuthorBenchmarkCondition = 'LUNA_MAX' | 'TERRA_XHIGH';

export interface AtomicReferenceItem {
  acceptedAlternatives: string[];
  category: 'ACTIVATION_BOUNDARY' | 'BLOCKER' | 'CLAIM' | 'CONTRACT' | 'EVIDENCE' | 'PROHIBITED_EFFECT' | 'RECOVERY';
  critical: boolean;
  id: string;
  sourcePaths: string[];
  statement: string;
}

export interface AuthorBenchmarkCase {
  expectedLifecycle: ReferenceLifecycle;
  id: string;
  referenceItems: AtomicReferenceItem[];
  skillPath: string;
  snapshotFingerprint: string;
  stratum: AuthorBenchmarkStratum;
}

export interface ReviewerProbe {
  expected: 'ACCEPT' | 'NEEDS_ADJUDICATION' | 'REJECT';
  family: ReviewerProbeFamily;
  id: string;
  observation: string;
}

export interface AuthorBenchmarkBundleCandidate {
  cases: AuthorBenchmarkCase[];
  purpose: 'AUTHOR_QUALIFICATION';
  reviewerProbes: ReviewerProbe[];
  reviewProtocol: { instructionsDigest: string; resolutionPolicyDigest: string };
  schedule: AuthorBenchmarkScheduleEntry[];
  schemaVersion: 1;
  theoryCommit: string;
}

export interface AuthorBenchmarkScheduleEntry {
  caseId: string;
  condition: AuthorBenchmarkCondition;
  order: number;
  sampleId: string;
}

export type AuthorBenchmarkMaterial = Omit<AuthorBenchmarkBundleCandidate, 'schedule'>;

export interface AuthorBenchmarkValidation {
  diagnostics: Array<{ code: string; path: string }>;
  fingerprint: string | null;
  valid: boolean;
}

export interface ReviewerQualificationSubmission {
  judgments: Array<{ probeId: string; verdict: ReviewerProbe['expected'] }>;
  reviewerId: string;
}

export interface ReviewerQualificationResult {
  agreement: number;
  result: 'BLOCKED' | 'QUALIFIED';
  reviewers: Array<{ criticalAccuracy: number; noncriticalAccuracy: number; reviewerId: string }>;
}

export interface ReviewerQualificationPacket {
  fingerprint: string;
  probes: Array<{ id: string; observation: string }>;
}

export interface AuthorBenchmarkOfflineQualificationReport {
  bundleFingerprint: string | null;
  caseCount: number;
  externalProviderCalls: 0;
  instrumentIntegrity: { findings: string[]; valid: boolean };
  limitations: string[];
  probeCount: number;
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'SUPPORTED_FOR_DEVELOPMENT';
  reviewerQualification: ReviewerQualificationResult;
  reviewerQualificationFingerprint: string;
  schemaVersion: 1;
}

const strata: AuthorBenchmarkStratum[] = ['AUTHORITY_WORKFLOW', 'EVIDENCE_ANALYSIS', 'FILESYSTEM', 'TRANSFORMATION'];
const probeFamilies: ReviewerProbeFamily[] = ['ALTERNATIVE_VALID', 'KNOWN_INVALID', 'KNOWN_VALID', 'UNSUPPORTED_FLUENCY'];
const referenceCategories: AtomicReferenceItem['category'][] = [
  'ACTIVATION_BOUNDARY',
  'BLOCKER',
  'CLAIM',
  'CONTRACT',
  'EVIDENCE',
  'PROHIBITED_EFFECT',
  'RECOVERY',
];

function canonicalMaterial(material: AuthorBenchmarkMaterial): AuthorBenchmarkMaterial {
  return {
    ...material,
    cases: [...material.cases].sort((left, right) => left.id.localeCompare(right.id)),
    reviewerProbes: [...material.reviewerProbes].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function createAuthorBenchmarkSchedule(material: AuthorBenchmarkMaterial): AuthorBenchmarkScheduleEntry[] {
  const materialFingerprint = sha256(canonicalMaterial(material));
  const rankedCases = [...material.cases]
    .map((entry) => ({ entry, rank: sha256({ caseId: entry.id, materialFingerprint }) }))
    .sort((left, right) => left.rank.localeCompare(right.rank));
  const terraFirst = new Set(rankedCases.slice(0, 4).map(({ entry }) => entry.id));
  let order = 0;
  return [...material.cases]
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((entry) => {
      const conditions: AuthorBenchmarkCondition[] = terraFirst.has(entry.id) ? ['TERRA_XHIGH', 'LUNA_MAX'] : ['LUNA_MAX', 'TERRA_XHIGH'];
      return conditions.map((condition) => ({
        caseId: entry.id,
        condition,
        order: ++order,
        sampleId: `sample-${sha256({ caseId: entry.id, condition, materialFingerprint }).slice(0, 16)}`,
      }));
    });
}

function duplicateDiagnostics(ids: string[], path: string): AuthorBenchmarkValidation['diagnostics'] {
  const seen = new Set<string>();
  const diagnostics: AuthorBenchmarkValidation['diagnostics'] = [];
  ids.forEach((id, index) => {
    if (seen.has(id)) diagnostics.push({ code: 'DUPLICATE_ID', path: `${path}/${index}/id` });
    seen.add(id);
  });
  return diagnostics;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBundleCandidate(value: unknown): value is AuthorBenchmarkBundleCandidate {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.purpose !== 'AUTHOR_QUALIFICATION') return false;
  if (
    typeof value.theoryCommit !== 'string' ||
    !Array.isArray(value.cases) ||
    !Array.isArray(value.reviewerProbes) ||
    !isRecord(value.reviewProtocol) ||
    typeof value.reviewProtocol.instructionsDigest !== 'string' ||
    typeof value.reviewProtocol.resolutionPolicyDigest !== 'string' ||
    !Array.isArray(value.schedule)
  )
    return false;
  const validCases = value.cases.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.skillPath === 'string' &&
      typeof entry.snapshotFingerprint === 'string' &&
      typeof entry.stratum === 'string' &&
      (entry.expectedLifecycle === 'READY' || entry.expectedLifecycle === 'BLOCKED') &&
      Array.isArray(entry.referenceItems) &&
      entry.referenceItems.every(
        (item) =>
          isRecord(item) &&
          Array.isArray(item.acceptedAlternatives) &&
          item.acceptedAlternatives.every((alternative) => typeof alternative === 'string') &&
          referenceCategories.includes(item.category as AtomicReferenceItem['category']) &&
          typeof item.critical === 'boolean' &&
          typeof item.id === 'string' &&
          Array.isArray(item.sourcePaths) &&
          item.sourcePaths.every((path) => typeof path === 'string') &&
          typeof item.statement === 'string',
      ),
  );
  const validProbes = value.reviewerProbes.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.family === 'string' &&
      typeof entry.observation === 'string' &&
      (entry.expected === 'ACCEPT' || entry.expected === 'REJECT' || entry.expected === 'NEEDS_ADJUDICATION'),
  );
  const validSchedule = value.schedule.every(
    (entry) =>
      isRecord(entry) &&
      typeof entry.caseId === 'string' &&
      (entry.condition === 'TERRA_XHIGH' || entry.condition === 'LUNA_MAX') &&
      typeof entry.order === 'number' &&
      typeof entry.sampleId === 'string',
  );
  return validCases && validProbes && validSchedule;
}

export function validateAuthorBenchmarkBundle(value: unknown): AuthorBenchmarkValidation {
  if (!isBundleCandidate(value)) {
    return { diagnostics: [{ code: 'SCHEMA_INVALID', path: '/' }], fingerprint: null, valid: false };
  }
  const candidate = value;
  const diagnostics = [
    ...duplicateDiagnostics(
      candidate.cases.map((entry) => entry.id),
      '/cases',
    ),
    ...duplicateDiagnostics(
      candidate.reviewerProbes.map((entry) => entry.id),
      '/reviewerProbes',
    ),
    ...duplicateDiagnostics(
      candidate.cases.flatMap((entry) => entry.referenceItems.map((item) => item.id)),
      '/referenceItems',
    ),
  ];
  candidate.cases.forEach((entry, index) => {
    if (/(?:ready|blocked|expected|reference|oracle)/i.test(entry.id)) {
      diagnostics.push({ code: 'EXPECTED_LABEL_LEAK', path: `/cases/${index}/id` });
    }
    if (!/^skills\/[a-z0-9-]+$/.test(entry.skillPath) || /(?:eval|reference|oracle)/i.test(entry.skillPath)) {
      diagnostics.push({ code: 'REFERENCE_PATH_LEAK', path: `/cases/${index}/skillPath` });
    }
    if (entry.referenceItems.length === 0) diagnostics.push({ code: 'EMPTY_REFERENCE_ITEMS', path: `/cases/${index}/referenceItems` });
    entry.referenceItems.forEach((item, itemIndex) => {
      if (item.sourcePaths.length === 0 || item.sourcePaths.some((path) => !/^(?:SKILL\.md|context\.md)$/.test(path))) {
        diagnostics.push({ code: 'BROKEN_REFERENCE_PROVENANCE', path: `/cases/${index}/referenceItems/${itemIndex}/sourcePaths` });
      }
    });
    const categories = new Set(entry.referenceItems.map((item) => item.category));
    for (const category of ['CLAIM', 'CONTRACT', 'ACTIVATION_BOUNDARY', 'EVIDENCE', 'PROHIBITED_EFFECT', 'RECOVERY'] as const) {
      if (!categories.has(category))
        diagnostics.push({ code: 'REFERENCE_CATEGORY_MISSING', path: `/cases/${index}/referenceItems/${category}` });
    }
    const blockers = entry.referenceItems.filter((item) => item.category === 'BLOCKER');
    if ((entry.expectedLifecycle === 'BLOCKED' && blockers.length === 0) || (entry.expectedLifecycle === 'READY' && blockers.length > 0)) {
      diagnostics.push({ code: 'REFERENCE_BLOCKER_MISMATCH', path: `/cases/${index}/referenceItems` });
    }
    if (!entry.referenceItems.some((item) => item.acceptedAlternatives.length > 0)) {
      diagnostics.push({ code: 'ACCEPTED_ALTERNATIVE_MISSING', path: `/cases/${index}/referenceItems` });
    }
  });
  if (candidate.cases.length !== 8) diagnostics.push({ code: 'CASE_COUNT', path: '/cases' });
  for (const stratum of strata) {
    const cases = candidate.cases.filter((entry) => entry.stratum === stratum);
    if (
      cases.length !== 2 ||
      !cases.some((entry) => entry.expectedLifecycle === 'READY') ||
      !cases.some((entry) => entry.expectedLifecycle === 'BLOCKED')
    ) {
      diagnostics.push({ code: 'STRATUM_LIFECYCLE_BALANCE', path: `/cases/${stratum}` });
    }
  }
  if (candidate.reviewerProbes.length !== 16) diagnostics.push({ code: 'PROBE_COUNT', path: '/reviewerProbes' });
  if (!/^[a-f0-9]{64}$/.test(candidate.reviewProtocol.instructionsDigest)) {
    diagnostics.push({ code: 'REVIEW_INSTRUCTIONS_DIGEST_INVALID', path: '/reviewProtocol/instructionsDigest' });
  }
  if (!/^[a-f0-9]{64}$/.test(candidate.reviewProtocol.resolutionPolicyDigest)) {
    diagnostics.push({ code: 'RESOLUTION_POLICY_DIGEST_INVALID', path: '/reviewProtocol/resolutionPolicyDigest' });
  }
  for (const family of probeFamilies) {
    if (candidate.reviewerProbes.filter((entry) => entry.family === family).length !== 4) {
      diagnostics.push({ code: 'PROBE_FAMILY_COUNT', path: `/reviewerProbes/${family}` });
    }
  }
  const material: AuthorBenchmarkMaterial = {
    cases: candidate.cases,
    purpose: candidate.purpose,
    reviewerProbes: candidate.reviewerProbes,
    reviewProtocol: candidate.reviewProtocol,
    schemaVersion: candidate.schemaVersion,
    theoryCommit: candidate.theoryCommit,
  };
  if (canonicalJson(candidate.schedule) !== canonicalJson(createAuthorBenchmarkSchedule(material))) {
    diagnostics.push({ code: 'SCHEDULE_MISMATCH', path: '/schedule' });
  }
  if (diagnostics.length > 0) return { diagnostics, fingerprint: null, valid: false };
  const canonical = {
    ...candidate,
    cases: [...candidate.cases].sort((left, right) => left.id.localeCompare(right.id)),
    reviewerProbes: [...candidate.reviewerProbes].sort((left, right) => left.id.localeCompare(right.id)),
    schedule: [...candidate.schedule].sort((left, right) => left.order - right.order),
  };
  return { diagnostics: [], fingerprint: sha256(canonical), valid: true };
}

export interface AuthorBenchmarkPacketBlindness {
  findings: Array<{ code: 'DIGEST_CORRELATED_MATERIAL' | 'REFERENCE_MATERIAL'; sourceId: string }>;
  valid: boolean;
}

export function verifyAuthorBenchmarkPacketBlindness(
  bundle: AuthorBenchmarkBundleCandidate,
  benchmarkCase: AuthorBenchmarkCase,
  prompt: string,
): AuthorBenchmarkPacketBlindness {
  const forbidden = [
    benchmarkCase.id,
    benchmarkCase.skillPath,
    'AUTHOR_QUALIFICATION',
    'TERRA_XHIGH',
    'LUNA_MAX',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'reviewer-a.json',
    'reviewer-b.json',
    'bundle.json',
    ...bundle.schedule.map((sample) => sample.sampleId),
    ...benchmarkCase.referenceItems.flatMap((item) => [item.id, item.statement, ...item.acceptedAlternatives]),
    ...bundle.reviewerProbes.flatMap((probe) => [probe.id, probe.observation]),
  ].filter((value) => value.length > 0);
  const findings: AuthorBenchmarkPacketBlindness['findings'] = [];
  forbidden.forEach((value, index) => {
    const sourceId = `forbidden-${index + 1}`;
    if (prompt.includes(value)) findings.push({ code: 'REFERENCE_MATERIAL', sourceId });
    if (prompt.includes(sha256(value))) findings.push({ code: 'DIGEST_CORRELATED_MATERIAL', sourceId });
  });
  return { findings, valid: findings.length === 0 };
}

export interface AuthorBenchmarkAtomicJudgment {
  referenceItemId: string;
  verdict: 'MATCHED' | 'MISSED';
}

export interface AuthorBenchmarkSampleScore {
  criticalMatched: number;
  criticalTotal: number;
  matched: number;
  missed: number;
  total: number;
  valid: boolean;
}

export function scoreAuthorBenchmarkSample(
  referenceItems: AtomicReferenceItem[],
  judgments: AuthorBenchmarkAtomicJudgment[],
): AuthorBenchmarkSampleScore {
  const judgmentMap = new Map(judgments.map((entry) => [entry.referenceItemId, entry.verdict]));
  const valid =
    judgments.length === referenceItems.length &&
    judgmentMap.size === judgments.length &&
    judgments.every((entry) => referenceItems.some((item) => item.id === entry.referenceItemId));
  const matched = referenceItems.filter((item) => judgmentMap.get(item.id) === 'MATCHED').length;
  const criticalItems = referenceItems.filter((item) => item.critical);
  return {
    criticalMatched: criticalItems.filter((item) => judgmentMap.get(item.id) === 'MATCHED').length,
    criticalTotal: criticalItems.length,
    matched,
    missed: referenceItems.length - matched,
    total: referenceItems.length,
    valid,
  };
}

export function qualifyAuthorBenchmarkReviewers(
  bundle: AuthorBenchmarkBundleCandidate,
  submissions: ReviewerQualificationSubmission[],
): ReviewerQualificationResult {
  const expected = new Map(bundle.reviewerProbes.map((probe) => [probe.id, probe]));
  const reviewers = submissions.map((submission) => {
    const judgments = new Map(submission.judgments.map((judgment) => [judgment.probeId, judgment.verdict]));
    const critical = bundle.reviewerProbes.filter((probe) => probe.family === 'KNOWN_INVALID' || probe.family === 'UNSUPPORTED_FLUENCY');
    const noncritical = bundle.reviewerProbes.filter((probe) => probe.family === 'KNOWN_VALID' || probe.family === 'ALTERNATIVE_VALID');
    const accuracy = (probes: ReviewerProbe[]): number =>
      probes.length === 0
        ? 0
        : probes.filter((probe) => judgments.get(probe.id) === expected.get(probe.id)?.expected).length / probes.length;
    return { criticalAccuracy: accuracy(critical), noncriticalAccuracy: accuracy(noncritical), reviewerId: submission.reviewerId };
  });
  const [first, second] = submissions;
  const firstJudgments = new Map(first?.judgments.map((entry) => [entry.probeId, entry.verdict]));
  const secondJudgments = new Map(second?.judgments.map((entry) => [entry.probeId, entry.verdict]));
  const agreement =
    bundle.reviewerProbes.length === 0
      ? 0
      : bundle.reviewerProbes.filter((probe) => firstJudgments.get(probe.id) === secondJudgments.get(probe.id)).length /
        bundle.reviewerProbes.length;
  const complete =
    submissions.length === 2 &&
    new Set(submissions.map((entry) => entry.reviewerId)).size === 2 &&
    submissions.every(
      (submission) =>
        submission.judgments.length === bundle.reviewerProbes.length &&
        new Set(submission.judgments.map((entry) => entry.probeId)).size === bundle.reviewerProbes.length &&
        submission.judgments.every((entry) => expected.has(entry.probeId)),
    );
  const qualified =
    complete && agreement >= 0.9 && reviewers.every((reviewer) => reviewer.criticalAccuracy === 1 && reviewer.noncriticalAccuracy >= 0.9);
  return { agreement, result: qualified ? 'QUALIFIED' : 'BLOCKED', reviewers };
}

export function createReviewerQualificationPacket(bundle: AuthorBenchmarkBundleCandidate): ReviewerQualificationPacket {
  const probes = bundle.reviewerProbes
    .map((probe) => ({ id: probe.id, observation: probe.observation }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return { fingerprint: sha256(probes), probes };
}

export function qualifyAuthorBenchmarkOffline(
  bundle: AuthorBenchmarkBundleCandidate,
  submissions: ReviewerQualificationSubmission[],
  instrumentIntegrity = { findings: [] as string[], valid: true },
): AuthorBenchmarkOfflineQualificationReport {
  const validation = validateAuthorBenchmarkBundle(bundle);
  const reviewerQualification = qualifyAuthorBenchmarkReviewers(bundle, submissions);
  const reviewerQualificationFingerprint = sha256({
    packet: createReviewerQualificationPacket(bundle),
    reviewerQualification,
    submissions: [...submissions].sort((left, right) => left.reviewerId.localeCompare(right.reviewerId)),
  });
  const supported = validation.valid && reviewerQualification.result === 'QUALIFIED' && instrumentIntegrity.valid;
  return {
    bundleFingerprint: validation.fingerprint,
    caseCount: bundle.cases.length,
    externalProviderCalls: 0,
    instrumentIntegrity,
    limitations: [
      'Offline qualification does not evaluate a model-backed Author condition.',
      'Development probes qualify the frozen review protocol only for the fingerprinted bundle.',
      'No benchmark provider invocation, Author output, or reliability claim is produced.',
    ],
    probeCount: bundle.reviewerProbes.length,
    purpose: 'DEVELOPMENT',
    result: supported ? 'SUPPORTED_FOR_DEVELOPMENT' : 'BLOCKED',
    reviewerQualification,
    reviewerQualificationFingerprint,
    schemaVersion: 1,
  };
}

async function validateAuthorBenchmarkDirectoryIntegrity(
  directory: string,
  bundle: AuthorBenchmarkBundleCandidate,
): Promise<{ findings: string[]; valid: boolean }> {
  const findings: string[] = [];
  const [probeValue, instructions, resolutionPolicy] = await Promise.all([
    readJson(join(directory, 'reviewer-probes.json')),
    readFile(join(directory, 'reviewer-instructions.md'), 'utf8'),
    readFile(join(directory, 'resolution-policy.md'), 'utf8'),
  ]);
  if (canonicalJson(probeValue) !== canonicalJson(bundle.reviewerProbes)) findings.push('REVIEWER_PROBES_MISMATCH');
  if (sha256(instructions) !== bundle.reviewProtocol.instructionsDigest) findings.push('REVIEW_INSTRUCTIONS_MISMATCH');
  if (sha256(resolutionPolicy) !== bundle.reviewProtocol.resolutionPolicyDigest) findings.push('RESOLUTION_POLICY_MISMATCH');
  for (const benchmarkCase of bundle.cases) {
    const reference = await readJson(join(directory, 'references', `${benchmarkCase.id}.json`));
    const expectedReference = {
      expectedLifecycle: benchmarkCase.expectedLifecycle,
      id: benchmarkCase.id,
      referenceItems: benchmarkCase.referenceItems,
      stratum: benchmarkCase.stratum,
    };
    if (canonicalJson(reference) !== canonicalJson(expectedReference)) findings.push(`REFERENCE_MISMATCH:${benchmarkCase.id}`);
    const snapshot = await createSkillSnapshot({ rootDirectory: join(directory, benchmarkCase.skillPath) });
    if (snapshot.fingerprint !== benchmarkCase.snapshotFingerprint) findings.push(`SNAPSHOT_MISMATCH:${benchmarkCase.id}`);
    const prepared = prepareAuthorInvocation(snapshot, { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' });
    if (!verifyAuthorBenchmarkPacketBlindness(bundle, benchmarkCase, prepared.request.prompt).valid) {
      findings.push(`PACKET_BLINDNESS_FAILED:${benchmarkCase.id}`);
    }
  }
  findings.sort();
  return { findings, valid: findings.length === 0 };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

function reviewerSubmission(value: unknown): ReviewerQualificationSubmission | null {
  if (!isRecord(value) || typeof value.reviewerId !== 'string' || !Array.isArray(value.judgments)) return null;
  const judgments = value.judgments.filter(
    (entry): entry is ReviewerQualificationSubmission['judgments'][number] =>
      isRecord(entry) &&
      typeof entry.probeId === 'string' &&
      (entry.verdict === 'ACCEPT' || entry.verdict === 'REJECT' || entry.verdict === 'NEEDS_ADJUDICATION'),
  );
  return judgments.length === value.judgments.length ? { judgments, reviewerId: value.reviewerId } : null;
}

export async function qualifyAuthorBenchmarkDirectory(directory: string): Promise<AuthorBenchmarkOfflineQualificationReport> {
  const [bundleValue, firstValue, secondValue] = await Promise.all([
    readJson(join(directory, 'bundle.json')),
    readJson(join(directory, 'reviewer-a.json')),
    readJson(join(directory, 'reviewer-b.json')),
  ]);
  const validation = validateAuthorBenchmarkBundle(bundleValue);
  if (!validation.valid || !isBundleCandidate(bundleValue)) {
    return {
      bundleFingerprint: null,
      caseCount: 0,
      externalProviderCalls: 0,
      instrumentIntegrity: { findings: ['BUNDLE_INVALID'], valid: false },
      limitations: ['The frozen bundle is structurally or semantically invalid.'],
      probeCount: 0,
      purpose: 'DEVELOPMENT',
      result: 'BLOCKED',
      reviewerQualification: { agreement: 0, result: 'BLOCKED', reviewers: [] },
      reviewerQualificationFingerprint: sha256({ reason: 'INVALID_BUNDLE' }),
      schemaVersion: 1,
    };
  }
  const submissions = [reviewerSubmission(firstValue), reviewerSubmission(secondValue)].filter(
    (entry): entry is ReviewerQualificationSubmission => entry !== null,
  );
  let instrumentIntegrity: { findings: string[]; valid: boolean };
  try {
    instrumentIntegrity = await validateAuthorBenchmarkDirectoryIntegrity(directory, bundleValue);
  } catch {
    instrumentIntegrity = { findings: ['INSTRUMENT_FILE_UNAVAILABLE'], valid: false };
  }
  return qualifyAuthorBenchmarkOffline(bundleValue, submissions, instrumentIntegrity);
}

export function renderAuthorBenchmarkOfflineQualification(report: AuthorBenchmarkOfflineQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}
