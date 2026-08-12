import { access, appendFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { prepareAuthorInvocation } from '../src/author/evaluation-author.js';
import { AuthorProviderError } from '../src/author/provider-diagnostic.js';
import { createSkillSnapshot } from '../src/intake/skill-snapshot.js';
import {
  evaluateAuthorBenchmarkCampaignPreflight,
  validateAuthorBenchmarkCampaignPreparation,
  type AuthorBenchmarkCampaignPreparation,
  type AuthorBenchmarkCampaignPreflightReport,
  type AuthorBenchmarkPreflightEvidence,
} from '../src/qualification/author-benchmark-preflight.js';
import { runAuthorBenchmarkCampaignPreflight } from '../src/qualification/preflight-author-benchmark.js';
import {
  createBlindReviewerSubmission,
  createBlindReviewResolution,
  createBlindReviewPackets,
  fingerprintBlindReviewPacket,
  reserveBlindReviewWorkspace,
  scoreAuthorBenchmark,
  validateBlindReviewerSubmission,
  type BlindReviewPacket,
} from '../src/qualification/author-benchmark-adjudication.js';
import { runAuthorBenchmarkCampaign, type AuthorBenchmarkCollection } from '../src/qualification/author-benchmark-runner.js';
import { runAuthorBenchmarkCommand } from '../src/qualification/run-author-benchmark.js';
import { qualifyAuthorBenchmarkRunner } from '../src/qualification/qualify-author-benchmark-runner.js';

import {
  createAuthorBenchmarkSchedule,
  createReviewerQualificationPacket,
  scoreAuthorBenchmarkSample,
  verifyAuthorBenchmarkPacketBlindness,
  qualifyAuthorBenchmarkReviewers,
  qualifyAuthorBenchmarkOffline,
  qualifyAuthorBenchmarkDirectory,
  renderAuthorBenchmarkOfflineQualification,
  validateAuthorBenchmarkBundle,
  type AuthorBenchmarkBundleCandidate,
  type AuthorBenchmarkMaterial,
} from '../src/qualification/author-benchmark.js';

function balancedBundle(): AuthorBenchmarkBundleCandidate {
  const strata = ['TRANSFORMATION', 'FILESYSTEM', 'EVIDENCE_ANALYSIS', 'AUTHORITY_WORKFLOW'] as const;
  const material: AuthorBenchmarkMaterial = {
    cases: strata.flatMap((stratum, stratumIndex) =>
      (['READY', 'BLOCKED'] as const).map((expectedLifecycle, lifecycleIndex) => ({
        expectedLifecycle,
        id: `case-${stratumIndex}-${lifecycleIndex}`,
        referenceItems: (
          [
            'CLAIM',
            'CONTRACT',
            'ACTIVATION_BOUNDARY',
            'EVIDENCE',
            'PROHIBITED_EFFECT',
            'RECOVERY',
            ...(expectedLifecycle === 'BLOCKED' ? (['BLOCKER'] as const) : []),
          ] as const
        ).map((category, categoryIndex) => ({
          acceptedAlternatives: categoryIndex === 0 ? ['Equivalent behavior stated without incidental wording.'] : [],
          category,
          critical: true,
          id: `item-${stratumIndex}-${lifecycleIndex}-${categoryIndex}`,
          sourcePaths: ['SKILL.md'],
          statement: `Preserve the observable ${category.toLowerCase()} contract.`,
        })),
        skillPath: `skills/case-${stratumIndex}-${lifecycleIndex}`,
        snapshotFingerprint: 'a'.repeat(64),
        stratum,
      })),
    ),
    purpose: 'AUTHOR_QUALIFICATION',
    reviewerProbes: (['KNOWN_VALID', 'KNOWN_INVALID', 'ALTERNATIVE_VALID', 'UNSUPPORTED_FLUENCY'] as const).flatMap((family, familyIndex) =>
      Array.from({ length: 4 }, (_, index) => ({
        expected: family === 'KNOWN_VALID' || family === 'ALTERNATIVE_VALID' ? 'ACCEPT' : 'REJECT',
        family,
        id: `probe-${familyIndex}-${index}`,
        observation: `Synthetic reviewer observation ${familyIndex}-${index}.`,
      })),
    ),
    reviewProtocol: { instructionsDigest: 'b'.repeat(64), resolutionPolicyDigest: 'c'.repeat(64) },
    schemaVersion: 1,
    theoryCommit: '572e963ea6f1207ab53c533592cb70a8239e221c',
  };
  return { ...material, schedule: createAuthorBenchmarkSchedule(material) };
}

async function frozenCampaignFixture(): Promise<{
  bundle: AuthorBenchmarkBundleCandidate;
  bundleDirectory: string;
  campaign: AuthorBenchmarkCampaignPreparation;
}> {
  const bundleDirectory = resolve('evaluations/refactor-design/e5-author-benchmark');
  const [bundle, campaign] = await Promise.all([
    readFile(join(bundleDirectory, 'bundle.json'), 'utf8').then((value) => JSON.parse(value) as AuthorBenchmarkBundleCandidate),
    readFile(join(bundleDirectory, 'campaign-preparation.json'), 'utf8').then(
      (value) => JSON.parse(value) as AuthorBenchmarkCampaignPreparation,
    ),
  ]);
  return { bundle, bundleDirectory, campaign };
}

function readyCampaignPreflight(campaign: AuthorBenchmarkCampaignPreparation, commit: string): AuthorBenchmarkCampaignPreflightReport {
  return {
    campaignFingerprint: '283dcb224800d5d41812078771126798aaf4dcbac0ce82c439c12007ba356b05',
    campaignId: campaign.campaignId,
    checks: [],
    currentCommit: commit,
    expectedCommit: commit,
    externalProviderCalls: 0,
    limitations: [],
    providerInvocations: 0,
    purpose: 'DEVELOPMENT',
    reservationCreated: false,
    result: 'READY_FOR_AUTHORIZATION',
    schemaVersion: 1,
  };
}

describe('blind Evaluation Author benchmark', () => {
  it('accepts and fingerprints exactly four READY/BLOCKED behavioral pairs', () => {
    const first = validateAuthorBenchmarkBundle(balancedBundle());
    const second = validateAuthorBenchmarkBundle({ ...balancedBundle(), cases: [...balancedBundle().cases].reverse() });

    expect(first).toMatchObject({ diagnostics: [], valid: true });
    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toEqual(first);
  });

  it('rejects expected-state and reference leakage from Author-visible identifiers', () => {
    const bundle = balancedBundle();
    bundle.cases[0] = {
      ...bundle.cases[0]!,
      id: 'ready-reference-case',
      skillPath: 'evaluations/reference-ready',
    };

    const validation = validateAuthorBenchmarkBundle(bundle);
    expect(validation).toMatchObject({ fingerprint: null, valid: false });
    expect(validation.diagnostics).toContainEqual({ code: 'EXPECTED_LABEL_LEAK', path: '/cases/0/id' });
    expect(validation.diagnostics).toContainEqual({ code: 'REFERENCE_PATH_LEAK', path: '/cases/0/skillPath' });
  });

  it('blocks collection unless two reviewers reject every unsupported-fluency probe', () => {
    const bundle = balancedBundle();
    const judgments = bundle.reviewerProbes.map((probe) => ({ probeId: probe.id, verdict: probe.expected }));
    const qualified = qualifyAuthorBenchmarkReviewers(bundle, [
      { judgments, reviewerId: 'reviewer-a' },
      { judgments, reviewerId: 'reviewer-b' },
    ]);
    const unsafeJudgments = judgments.map((judgment) =>
      judgment.probeId === 'probe-3-0' ? { ...judgment, verdict: 'ACCEPT' as const } : judgment,
    );

    expect(qualified).toMatchObject({ agreement: 1, result: 'QUALIFIED' });
    expect(
      qualifyAuthorBenchmarkReviewers(bundle, [
        { judgments, reviewerId: 'reviewer-a' },
        { judgments: unsafeJudgments, reviewerId: 'reviewer-b' },
      ]),
    ).toMatchObject({ result: 'BLOCKED' });
  });

  it('returns structured diagnostics for a malformed bundle instead of inspecting missing collections', () => {
    expect(validateAuthorBenchmarkBundle({ purpose: 'AUTHOR_QUALIFICATION' })).toMatchObject({
      fingerprint: null,
      valid: false,
    });
  });

  it('projects reviewer probes without family or expected-status labels', () => {
    const packet = createReviewerQualificationPacket(balancedBundle());

    expect(packet.probes).toHaveLength(16);
    expect(packet.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(packet)).not.toMatch(/KNOWN_VALID|KNOWN_INVALID|ALTERNATIVE_VALID|UNSUPPORTED_FLUENCY|ACCEPT|REJECT/);
  });

  it('qualifies a balanced frozen instrument offline with zero provider calls', () => {
    const bundle = balancedBundle();
    const judgments = bundle.reviewerProbes.map((probe) => ({ probeId: probe.id, verdict: probe.expected }));

    const report = qualifyAuthorBenchmarkOffline(bundle, [
      { judgments, reviewerId: 'reviewer-a' },
      { judgments, reviewerId: 'reviewer-b' },
    ]);

    expect(report).toMatchObject({
      caseCount: 8,
      externalProviderCalls: 0,
      probeCount: 16,
      purpose: 'DEVELOPMENT',
      result: 'SUPPORTED_FOR_DEVELOPMENT',
      reviewerQualification: { result: 'QUALIFIED' },
      schemaVersion: 1,
    });
    expect(JSON.parse(renderAuthorBenchmarkOfflineQualification(report))).toEqual(report);
    expect(renderAuthorBenchmarkOfflineQualification(report).endsWith('\n')).toBe(true);
  });

  it('loads the frozen bundle and locked reviewer judgments through the offline command boundary', async () => {
    const directory = resolve('evaluations/refactor-design/e5-author-benchmark');

    await expect(qualifyAuthorBenchmarkDirectory(directory)).resolves.toMatchObject({
      externalProviderCalls: 0,
      instrumentIntegrity: { findings: [], valid: true },
      result: 'SUPPORTED_FOR_DEVELOPMENT',
    });
  });

  it('freezes a deterministic sixteen-sample schedule with balanced first conditions', () => {
    const bundle = balancedBundle();
    const terraFirst = bundle.cases.filter((entry) => {
      const pair = bundle.schedule.filter((sample) => sample.caseId === entry.id);
      return pair[0]?.condition === 'TERRA_XHIGH';
    });

    expect(bundle.schedule).toHaveLength(16);
    expect(new Set(bundle.schedule.map((entry) => entry.sampleId))).toHaveLength(16);
    expect(terraFirst).toHaveLength(4);
    expect(validateAuthorBenchmarkBundle({ ...bundle, schedule: [...bundle.schedule].reverse() })).toMatchObject({
      diagnostics: [{ code: 'SCHEDULE_MISMATCH', path: '/schedule' }],
      valid: false,
    });
  });

  it('requires complete atomic references and rejects broken provenance', () => {
    const bundle = balancedBundle();
    bundle.cases[0]!.referenceItems[0]!.sourcePaths = ['../oracle.json'];

    const validation = validateAuthorBenchmarkBundle(bundle);
    expect(validation.valid).toBe(false);
    expect(validation.diagnostics).toContainEqual({ code: 'BROKEN_REFERENCE_PROVENANCE', path: '/cases/0/referenceItems/0/sourcePaths' });
  });

  it('detects direct and digest-correlated reference material in an Author packet', () => {
    const bundle = balancedBundle();
    const cleanPacket = JSON.stringify({ skillSnapshot: { fingerprint: bundle.cases[0]!.snapshotFingerprint } });
    const leakedPacket = JSON.stringify({ note: bundle.cases[0]!.referenceItems[0]!.statement });

    expect(verifyAuthorBenchmarkPacketBlindness(bundle, bundle.cases[0]!, cleanPacket)).toEqual({ findings: [], valid: true });
    expect(verifyAuthorBenchmarkPacketBlindness(bundle, bundle.cases[0]!, leakedPacket)).toMatchObject({ valid: false });
  });

  it('creates deterministic review packets only for completed samples without revealing their condition or expected lifecycle', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const candidate = JSON.parse(await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const completed = bundle.schedule[0]!;
    const timedOut = bundle.schedule[1]!;
    const blueprint = {
      ...candidate,
      authorProvenance: {
        campaignId: 'secret-campaign',
        conditionFingerprint: campaign.conditions[0]!.conditionFingerprint,
        instructionDigest: 'a'.repeat(64),
        observedModel: null,
        protocolDigest: 'b'.repeat(64),
        reasoningEffort: 'xhigh',
        requestedModel: 'gpt-5.6-terra',
        schemaDigest: 'c'.repeat(64),
        status: 'NOT_QUALIFIED',
        theoryDigest: 'd'.repeat(64),
      },
      blueprintId: 'ebp-secret',
      lifecycle: { decisionEligible: false, scope: 'DEVELOPMENT_AUTHORING', state: 'READY' },
      schemaVersion: 2,
      snapshotFingerprint: bundle.cases.find((entry) => entry.id === completed.caseId)!.snapshotFingerprint,
    };
    const collection: AuthorBenchmarkCollection = {
      bundleFingerprint: campaign.bundleFingerprint,
      campaignFingerprint: 'e'.repeat(64),
      campaignId: campaign.campaignId,
      currentCommit: 'f'.repeat(40),
      expectedCommit: 'f'.repeat(40),
      providerInvocations: 2,
      purpose: 'AUTHOR_QUALIFICATION_COLLECTION',
      samples: [
        {
          blueprint: blueprint as never,
          caseId: completed.caseId,
          condition: completed.condition,
          conditionFingerprint: campaign.conditions[0]!.conditionFingerprint,
          elapsedMs: 10,
          order: completed.order,
          packetFingerprint: '1'.repeat(64),
          providerLatencyMs: 9,
          sampleId: completed.sampleId,
          snapshotFingerprint: bundle.cases.find((entry) => entry.id === completed.caseId)!.snapshotFingerprint,
          status: 'COMPLETED',
          tokenUsage: null,
        },
        {
          caseId: timedOut.caseId,
          condition: timedOut.condition,
          conditionFingerprint: campaign.conditions[1]!.conditionFingerprint,
          elapsedMs: 300_000,
          error: { code: 'PROVIDER_ERROR', diagnostic: { category: 'TIMEOUT' } },
          order: timedOut.order,
          packetFingerprint: '2'.repeat(64),
          providerLatencyMs: null,
          sampleId: timedOut.sampleId,
          snapshotFingerprint: bundle.cases.find((entry) => entry.id === timedOut.caseId)!.snapshotFingerprint,
          status: 'ERROR',
          tokenUsage: null,
        },
      ],
      schemaVersion: 1,
      status: 'COMPLETE',
      stopReason: null,
    };

    const first = await createBlindReviewPackets({ bundle, bundleDirectory, collection });
    const second = await createBlindReviewPackets({ bundle, bundleDirectory, collection });

    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW', sampleId: completed.sampleId, schemaVersion: 1 });
    expect((first[0] as BlindReviewPacket).fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toMatch(
      /TERRA_XHIGH|LUNA_MAX|gpt-5\.6|xhigh|expectedLifecycle|authorProvenance|blueprintId|snapshotFingerprint|conditionFingerprint|elapsedMs|tokenUsage|secret-campaign/,
    );
    expect(first[0]!.skillFiles.map((entry) => entry.path)).toEqual(['SKILL.md', 'context.md']);
  });

  it('keeps a timed-out condition insufficient while selecting a fully observed condition that passes every frozen gate', () => {
    const bundle = balancedBundle();
    const terraFingerprint = 'a'.repeat(64);
    const lunaFingerprint = 'b'.repeat(64);
    const packets: BlindReviewPacket[] = bundle.schedule
      .filter((entry) => entry.condition === 'TERRA_XHIGH')
      .map((entry) => {
        const benchmarkCase = bundle.cases.find((candidate) => candidate.id === entry.caseId)!;
        const body: Omit<BlindReviewPacket, 'fingerprint'> = {
          candidate: {
            stressFamilies: [{ contractIds: ['contract'], description: 'Stress boundary.', id: 'stress' }],
            usageFamilies: [{ contractIds: ['contract'], description: 'Ordinary use.', id: 'usage' }],
          },
          candidateAssertions: [],
          instructionsDigest: bundle.reviewProtocol.instructionsDigest,
          purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW',
          referenceItems: benchmarkCase.referenceItems,
          resolutionPolicyDigest: bundle.reviewProtocol.resolutionPolicyDigest,
          sampleId: entry.sampleId,
          schemaVersion: 1,
          skillFiles: [{ content: '# Skill\n', path: 'SKILL.md' }],
        };
        return { ...body, fingerprint: fingerprintBlindReviewPacket(body) };
      });
    const judgments = packets.flatMap((packet) =>
      packet.referenceItems.map((item) => ({
        evidencePaths: item.sourcePaths,
        rationale: 'The candidate preserves the referenced observable behavior.',
        sampleId: packet.sampleId,
        targetId: item.id,
        targetType: 'REFERENCE' as const,
        verdict: 'ACCEPT' as const,
      })),
    );
    const reviewerA = createBlindReviewerSubmission({ judgments, packets, reviewerId: 'reviewer-a' });
    const reviewerB = createBlindReviewerSubmission({ judgments, packets, reviewerId: 'reviewer-b' });
    const collection: AuthorBenchmarkCollection = {
      bundleFingerprint: validateAuthorBenchmarkBundle(bundle).fingerprint!,
      campaignFingerprint: 'c'.repeat(64),
      campaignId: 'campaign',
      currentCommit: 'd'.repeat(40),
      expectedCommit: 'd'.repeat(40),
      providerInvocations: 16,
      purpose: 'AUTHOR_QUALIFICATION_COLLECTION',
      samples: bundle.schedule.map((entry) => {
        const benchmarkCase = bundle.cases.find((candidate) => candidate.id === entry.caseId)!;
        return entry.condition === 'TERRA_XHIGH'
          ? ({
              blueprint: {
                lifecycle: { decisionEligible: false, scope: 'DEVELOPMENT_AUTHORING', state: benchmarkCase.expectedLifecycle },
              },
              caseId: entry.caseId,
              condition: entry.condition,
              conditionFingerprint: terraFingerprint,
              elapsedMs: 1,
              order: entry.order,
              packetFingerprint: 'e'.repeat(64),
              providerLatencyMs: 1,
              sampleId: entry.sampleId,
              snapshotFingerprint: benchmarkCase.snapshotFingerprint,
              status: 'COMPLETED',
              tokenUsage: null,
            } as never)
          : {
              caseId: entry.caseId,
              condition: entry.condition,
              conditionFingerprint: lunaFingerprint,
              elapsedMs: 300_000,
              error: { code: 'PROVIDER_ERROR', diagnostic: { category: 'TIMEOUT' } },
              order: entry.order,
              packetFingerprint: 'f'.repeat(64),
              providerLatencyMs: null,
              sampleId: entry.sampleId,
              snapshotFingerprint: benchmarkCase.snapshotFingerprint,
              status: 'ERROR',
              tokenUsage: null,
            };
      }),
      schemaVersion: 1,
      status: 'COMPLETE',
      stopReason: null,
    };

    const report = scoreAuthorBenchmark({
      bundle,
      collection,
      conditionFingerprints: { LUNA_MAX: lunaFingerprint, TERRA_XHIGH: terraFingerprint },
      packets,
      resolutions: [],
      submissions: [reviewerA, reviewerB],
    });

    expect(report).toMatchObject({
      campaignResult: 'QUALIFIED',
      conditionResults: [
        { condition: 'LUNA_MAX', status: 'INSUFFICIENT' },
        { condition: 'TERRA_XHIGH', status: 'QUALIFIED' },
      ],
      selectedCondition: 'TERRA_XHIGH',
      schemaVersion: 2,
    });
  });

  it('claims one immutable adjudication workspace before persisting reviewer packets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-adjudication-lock-'));
    const packetBody: Omit<BlindReviewPacket, 'fingerprint'> = {
      candidate: {},
      candidateAssertions: [],
      instructionsDigest: 'b'.repeat(64),
      purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW',
      referenceItems: [],
      resolutionPolicyDigest: 'c'.repeat(64),
      sampleId: 'sample-opaque',
      schemaVersion: 1,
      skillFiles: [{ content: '# Skill\n', path: 'SKILL.md' }],
    };
    const packet: BlindReviewPacket = { ...packetBody, fingerprint: fingerprintBlindReviewPacket(packetBody) };

    await reserveBlindReviewWorkspace({
      campaignId: 'campaign',
      collectionFingerprint: 'd'.repeat(64),
      instructions: 'Frozen reviewer instructions.',
      outputDirectory: join(root, 'review'),
      packets: [packet],
      qualificationPacket: { fingerprint: 'e'.repeat(64), probes: [] },
      reservationPath: join(root, 'reservation.json'),
      resolutionPolicy: 'Frozen resolution policy.',
    });

    await expect(
      reserveBlindReviewWorkspace({
        campaignId: 'campaign',
        collectionFingerprint: 'd'.repeat(64),
        instructions: 'Frozen reviewer instructions.',
        outputDirectory: join(root, 'review-duplicate'),
        packets: [packet],
        qualificationPacket: { fingerprint: 'e'.repeat(64), probes: [] },
        reservationPath: join(root, 'reservation.json'),
        resolutionPolicy: 'Frozen resolution policy.',
      }),
    ).rejects.toMatchObject({ code: 'ADJUDICATION_ALREADY_RESERVED' });
    expect(JSON.parse(await readFile(join(root, 'reservation.json'), 'utf8'))).toMatchObject({
      campaignId: 'campaign',
      collectionFingerprint: 'd'.repeat(64),
      packetFingerprints: [packet.fingerprint],
      status: 'RESERVED',
    });
    expect(JSON.parse(await readFile(join(root, 'review', 'packets', 'sample-opaque.json'), 'utf8'))).toEqual(packet);
  });

  it('fingerprints locked reviewer judgments and rejects any later verdict mutation', () => {
    const packetBody: Omit<BlindReviewPacket, 'fingerprint'> = {
      candidate: {},
      candidateAssertions: [],
      instructionsDigest: 'b'.repeat(64),
      purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW',
      referenceItems: [
        {
          acceptedAlternatives: [],
          category: 'CLAIM',
          critical: true,
          id: 'reference-item',
          sourcePaths: ['SKILL.md'],
          statement: 'Observable claim.',
        },
      ],
      resolutionPolicyDigest: 'c'.repeat(64),
      sampleId: 'sample-opaque',
      schemaVersion: 1,
      skillFiles: [{ content: '# Skill\n', path: 'SKILL.md' }],
    };
    const packet: BlindReviewPacket = { ...packetBody, fingerprint: fingerprintBlindReviewPacket(packetBody) };
    const submission = createBlindReviewerSubmission({
      judgments: [
        {
          evidencePaths: ['SKILL.md'],
          rationale: 'The candidate preserves the observable claim.',
          sampleId: packet.sampleId,
          targetId: 'reference-item',
          targetType: 'REFERENCE',
          verdict: 'ACCEPT',
        },
      ],
      packets: [packet],
      reviewerId: 'reviewer-a',
    });

    expect(validateBlindReviewerSubmission([packet], submission)).toBe(true);
    expect(
      validateBlindReviewerSubmission([packet], {
        ...submission,
        judgments: submission.judgments.map((judgment) => ({ ...judgment, verdict: 'REJECT' })),
      }),
    ).toBe(false);
    expect(
      validateBlindReviewerSubmission([{ ...packet, candidate: { skill: { name: 'Mutated', summary: 'Changed.' } } }], submission),
    ).toBe(false);
    expect(createBlindReviewResolution([], [submission, { ...submission, reviewerId: 'reviewer-b' }])).toMatchObject({
      resolutions: [],
      schemaVersion: 1,
    });
  });

  it('scores atomic semantic judgments without averaging away critical misses', () => {
    const referenceItems = [
      {
        acceptedAlternatives: ['Equivalent contract.'],
        category: 'CONTRACT' as const,
        critical: true,
        id: 'critical-contract',
        sourcePaths: ['SKILL.md'],
        statement: 'Observable contract.',
      },
      {
        acceptedAlternatives: [],
        category: 'CLAIM' as const,
        critical: false,
        id: 'secondary-claim',
        sourcePaths: ['context.md'],
        statement: 'Secondary claim.',
      },
    ];

    expect(
      scoreAuthorBenchmarkSample(referenceItems, [
        { referenceItemId: 'critical-contract', verdict: 'MISSED' },
        { referenceItemId: 'secondary-claim', verdict: 'MATCHED' },
      ]),
    ).toEqual({ criticalMatched: 0, criticalTotal: 1, matched: 1, missed: 1, total: 2, valid: true });
  });

  it('keeps every frozen reference and expected mapping outside the real Author packets', async () => {
    const directory = resolve('evaluations/refactor-design/e5-author-benchmark');
    const bundle = JSON.parse(await readFile(join(directory, 'bundle.json'), 'utf8')) as AuthorBenchmarkBundleCandidate;

    expect(validateAuthorBenchmarkBundle(bundle)).toMatchObject({ diagnostics: [], valid: true });
    for (const benchmarkCase of bundle.cases) {
      const snapshot = await createSkillSnapshot({ rootDirectory: join(directory, benchmarkCase.skillPath) });
      expect(snapshot.fingerprint).toBe(benchmarkCase.snapshotFingerprint);
      const prepared = prepareAuthorInvocation(snapshot, { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' });
      expect(verifyAuthorBenchmarkPacketBlindness(bundle, benchmarkCase, prepared.request.prompt)).toEqual({ findings: [], valid: true });
    }
  });

  it('requires every frozen campaign prerequisite without creating a reservation or provider call', () => {
    const campaign: AuthorBenchmarkCampaignPreparation = {
      actualAccountCost: 'UNKNOWN',
      apiEquivalentPriceReference: {
        capturedAt: '2026-08-11',
        currency: 'USD',
        perMillionTokens: {
          LUNA_MAX: { cachedInput: 0.02, input: 0.2, output: 1.2 },
          TERRA_XHIGH: { cachedInput: 0.2, input: 2, output: 12 },
        },
        sources: [
          'https://developers.openai.com/api/docs/models/gpt-5.6-terra',
          'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
        ],
      },
      bundleFingerprint: 'a'.repeat(64),
      campaignId: 'e5-author-benchmark-20260811-r1',
      conditions: [
        {
          conditionFingerprint: 'b'.repeat(64),
          id: 'TERRA_XHIGH',
          requestedModel: 'gpt-5.6-terra',
          reasoningEffort: 'xhigh',
        },
        {
          conditionFingerprint: 'c'.repeat(64),
          id: 'LUNA_MAX',
          requestedModel: 'gpt-5.6-luna',
          reasoningEffort: 'max',
        },
      ],
      environment: {
        codexCliVersion: '0.147.0',
        codexHome: '/home/renanfranca/.codex',
        codexSdkVersion: '0.147.0',
        nodeVersion: '24.16.0',
        npmVersion: '11.13.0',
        promptfooVersion: '0.122.0',
      },
      invocationBudget: 16,
      outputDirectory: '.skill-evidence/author-benchmark/e5-author-benchmark-20260811-r1',
      reservationPath: '.skill-evidence/author-benchmark-reservations/e5-author-benchmark-20260811-r1.json',
      reviewerIds: ['reviewer-a', 'reviewer-b'],
      reviewerQualificationFingerprint: 'd'.repeat(64),
      sanitizedReportPath: 'docs/experiments/e5-author-benchmark-20260811-r1.json',
      sanitizedReportPolicy: {
        excludes: ['credentials', 'raw model reasoning', 'absolute local paths'],
        includes: ['terminal outcomes', 'canonical candidates', 'bounded diagnostics', 'usage and elapsed time'],
        publishAfter: 'ADJUDICATION_COMPLETE',
      },
      schemaVersion: 1,
      stopRules: ['Stop on a global authentication failure.', 'Never retry or replace a consumed sample.'],
    };
    const evidence: AuthorBenchmarkPreflightEvidence = {
      authentication: { authFileReadable: true, codexHome: campaign.environment.codexHome, homeWritable: true },
      bundleFingerprint: campaign.bundleFingerprint,
      conditionFingerprints: { LUNA_MAX: 'c'.repeat(64), TERRA_XHIGH: 'b'.repeat(64) },
      currentCommit: 'e'.repeat(40),
      expectedCommit: 'e'.repeat(40),
      credentialVariablesAbsent: true,
      environment: campaign.environment,
      offlineQualificationResult: 'SUPPORTED_FOR_DEVELOPMENT',
      outputDirectoryExists: false,
      outputParentWritable: true,
      reservationExists: false,
      reviewerQualificationFingerprint: campaign.reviewerQualificationFingerprint,
      reviewerQualificationResult: 'QUALIFIED',
      scheduleCount: 16,
      terminalReceiptExists: false,
      worktreeClean: true,
    };

    const ready = evaluateAuthorBenchmarkCampaignPreflight(campaign, evidence);
    const blocked = evaluateAuthorBenchmarkCampaignPreflight(campaign, { ...evidence, reservationExists: true });
    const terminalized = evaluateAuthorBenchmarkCampaignPreflight(campaign, { ...evidence, terminalReceiptExists: true });
    const changedCondition = evaluateAuthorBenchmarkCampaignPreflight(campaign, {
      ...evidence,
      conditionFingerprints: { ...evidence.conditionFingerprints, LUNA_MAX: 'f'.repeat(64) },
    });
    const changedCommit = evaluateAuthorBenchmarkCampaignPreflight(campaign, { ...evidence, currentCommit: 'f'.repeat(40) });
    const dirtyCommit = evaluateAuthorBenchmarkCampaignPreflight(campaign, { ...evidence, worktreeClean: false });

    expect(ready).toMatchObject({
      campaignId: campaign.campaignId,
      externalProviderCalls: 0,
      providerInvocations: 0,
      reservationCreated: false,
      result: 'READY_FOR_AUTHORIZATION',
    });
    expect(ready.checks.every((check) => check.status === 'PASS')).toBe(true);
    expect(blocked).toMatchObject({ result: 'BLOCKED' });
    expect(blocked.checks).toContainEqual({ id: 'RESERVATION_ABSENT', status: 'FAIL' });
    expect(terminalized).toMatchObject({ result: 'BLOCKED' });
    expect(terminalized.checks).toContainEqual({ id: 'TERMINAL_RECEIPT_ABSENT', status: 'FAIL' });
    expect(changedCondition.checks).toContainEqual({ id: 'AUTHOR_CONDITIONS_FROZEN', status: 'FAIL' });
    expect(changedCommit).toMatchObject({ result: 'BLOCKED' });
    expect(changedCommit.checks).toContainEqual({ id: 'EXACT_CLEAN_COMMIT', status: 'FAIL' });
    expect(dirtyCommit).toMatchObject({ result: 'BLOCKED' });
    expect(dirtyCommit.checks).toContainEqual({ id: 'EXACT_CLEAN_COMMIT', status: 'FAIL' });
  });

  it('rejects malformed campaign preparation without interpreting missing fields', () => {
    expect(validateAuthorBenchmarkCampaignPreparation({ campaignId: 'partial' })).toEqual({
      diagnostics: [{ code: 'CAMPAIGN_PREPARATION_INVALID', path: '/' }],
      valid: false,
    });
  });

  it('requires a literal expected commit before collecting preflight evidence', async () => {
    const common = [
      '--bundle',
      'evaluations/refactor-design/e5-author-benchmark',
      '--preparation',
      'evaluations/refactor-design/e5-author-benchmark/campaign-preparation.json',
    ];

    await expect(runAuthorBenchmarkCampaignPreflight(common)).rejects.toThrow(
      'USAGE: --bundle <directory> --preparation <campaign-preparation.json> --expected-commit <40-char-sha>',
    );
    await expect(runAuthorBenchmarkCampaignPreflight([...common, '--expected-commit', 'HEAD'])).rejects.toThrow(
      'USAGE: --bundle <directory> --preparation <campaign-preparation.json> --expected-commit <40-char-sha>',
    );
  });

  it('collects a provider-free preflight through the internal campaign command boundary', async () => {
    const root = resolve('.');
    const bundleDirectory = join(root, 'evaluations/refactor-design/e5-author-benchmark');

    const report = await runAuthorBenchmarkCampaignPreflight(
      [
        '--bundle',
        bundleDirectory,
        '--preparation',
        join(bundleDirectory, 'campaign-preparation.json'),
        '--expected-commit',
        'e'.repeat(40),
      ],
      {
        codexCliVersion: () => Promise.resolve('0.147.0'),
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        environment: { SKILL_EVIDENCE_AUTHOR_CODEX_HOME: '/home/renanfranca/.codex' },
        nodeVersion: () => '24.16.0',
        npmVersion: () => Promise.resolve('11.13.0'),
        packageVersion: (name) => Promise.resolve(name === 'promptfoo' ? '0.122.0' : '0.147.0'),
        pathExists: () => Promise.resolve(false),
        pathReadable: () => Promise.resolve(true),
        pathWritable: (path) => Promise.resolve(path === '/home/renanfranca/.codex' || path === join(root, '.skill-evidence')),
        repositoryRoot: root,
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(report).toMatchObject({
      currentCommit: 'e'.repeat(40),
      expectedCommit: 'e'.repeat(40),
      externalProviderCalls: 0,
      providerInvocations: 0,
      reservationCreated: false,
      result: 'READY_FOR_AUTHORIZATION',
    });
  });

  it('rejects a non-exact invocation approval before reserving or invoking the benchmark', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-guard-'));
    let invocations = 0;

    await expect(
      runAuthorBenchmarkCampaign(
        {
          approval: '15',
          bundle,
          bundleDirectory,
          campaign,
          codexHome: '/unused',
          expectedCommit: 'e'.repeat(40),
          preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
          repositoryRoot,
        },
        {
          createInvoker: () => {
            invocations += 1;
            return () => Promise.reject(new Error('must not invoke'));
          },
          currentCommit: () => Promise.resolve('e'.repeat(40)),
          workingTreeClean: () => Promise.resolve(true),
        },
      ),
    ).rejects.toMatchObject({ code: 'BENCHMARK_APPROVAL_REQUIRED' });
    expect(invocations).toBe(0);
    await expect(access(join(repositoryRoot, campaign.reservationPath))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects commit drift after preflight before reserving or invoking the benchmark', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-commit-'));
    let invocations = 0;

    await expect(
      runAuthorBenchmarkCampaign(
        {
          approval: '16',
          bundle,
          bundleDirectory,
          campaign,
          codexHome: '/unused',
          expectedCommit: 'e'.repeat(40),
          preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
          repositoryRoot,
        },
        {
          createInvoker: () => {
            invocations += 1;
            return () => Promise.reject(new Error('must not invoke'));
          },
          currentCommit: () => Promise.resolve('f'.repeat(40)),
          workingTreeClean: () => Promise.resolve(true),
        },
      ),
    ).rejects.toMatchObject({ code: 'BENCHMARK_COMMIT_MISMATCH' });
    expect(invocations).toBe(0);
    await expect(access(join(repositoryRoot, campaign.reservationPath))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a terminalized campaign before creating a new reservation or invocation', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-terminalized-'));
    const terminalPath = join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json'));
    await mkdir(join(repositoryRoot, '.skill-evidence', 'author-benchmark-reservations'), { recursive: true });
    await writeFile(terminalPath, '{"status":"INSUFFICIENT"}\n');
    let invocations = 0;

    await expect(
      runAuthorBenchmarkCampaign(
        {
          approval: '16',
          bundle,
          bundleDirectory,
          campaign,
          codexHome: '/unused',
          expectedCommit: 'e'.repeat(40),
          preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
          repositoryRoot,
        },
        {
          createInvoker: () => {
            invocations += 1;
            return () => Promise.reject(new Error('must not invoke'));
          },
          currentCommit: () => Promise.resolve('e'.repeat(40)),
          workingTreeClean: () => Promise.resolve(true),
        },
      ),
    ).rejects.toMatchObject({ code: 'BENCHMARK_ALREADY_RESERVED' });

    expect(invocations).toBe(0);
    await expect(access(join(repositoryRoot, campaign.reservationPath))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reserves and collects every sample once in the frozen sequential schedule', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-complete-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    const requestedModels: string[] = [];
    let clock = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => (request) => {
          requestedModels.push(request.model);
          return Promise.resolve({
            observedModel: null,
            output: candidate,
            providerLatencyMs: 4,
            tokenUsage: { cachedInputTokens: 1, inputTokens: 2, outputTokens: 3, reasoningOutputTokens: 4, totalTokens: 5 },
          });
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        now: () => (clock += 5),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ campaignId: campaign.campaignId, providerInvocations: 16, status: 'COMPLETE' });
    expect(collection.samples.map((sample) => sample.sampleId)).toEqual(bundle.schedule.map((sample) => sample.sampleId));
    expect(collection.samples.every((sample) => sample.status === 'COMPLETED')).toBe(true);
    expect(collection.samples[0]).toMatchObject({
      elapsedMs: 5,
      providerLatencyMs: 4,
      tokenUsage: { cachedInputTokens: 1, inputTokens: 2, outputTokens: 3, reasoningOutputTokens: 4, totalTokens: 5 },
    });
    expect(requestedModels).toEqual(
      bundle.schedule.map((sample) => (sample.condition === 'TERRA_XHIGH' ? 'gpt-5.6-terra' : 'gpt-5.6-luna')),
    );
    const reservation = JSON.parse(await readFile(join(repositoryRoot, campaign.reservationPath), 'utf8')) as Record<string, unknown>;
    expect(reservation).toMatchObject({
      campaignFingerprint: readyCampaignPreflight(campaign, 'e'.repeat(40)).campaignFingerprint,
      currentCommit: 'e'.repeat(40),
      expectedCommit: 'e'.repeat(40),
      invocationBudget: 16,
      status: 'RESERVED',
    });
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      campaignFingerprint: readyCampaignPreflight(campaign, 'e'.repeat(40)).campaignFingerprint,
      collectionPersisted: true,
      consumedSampleIds: bundle.schedule.map((sample) => sample.sampleId),
      currentCommit: 'e'.repeat(40),
      expectedCommit: 'e'.repeat(40),
      notRunSampleIds: [],
      persistedSampleIds: bundle.schedule.map((sample) => sample.sampleId),
      providerInvocations: 16,
      status: 'COMPLETE',
      stopReason: null,
    });
    expect(JSON.stringify(collection)).not.toMatch(/expectedLifecycle|referenceItems|acceptedAlternatives/);
    expect(JSON.stringify(terminalReceipt)).not.toMatch(/expectedLifecycle|referenceItems|acceptedAlternatives|\/tmp\//);
  });

  it('stops on a global provider failure and marks the untouched schedule as not run', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-global-stop-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => () => {
          invocations += 1;
          return invocations === 3
            ? Promise.reject(new AuthorProviderError({ category: 'AUTHENTICATION', code: 'HTTP_401', stage: 'RESULT' }))
            : Promise.resolve({ observedModel: null, output: candidate });
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 3, status: 'INSUFFICIENT', stopReason: 'GLOBAL_AUTHENTICATION' });
    expect(collection.samples).toHaveLength(16);
    expect(collection.samples.slice(0, 2).every((sample) => sample.status === 'COMPLETED')).toBe(true);
    expect(collection.samples[2]).toMatchObject({ error: { code: 'PROVIDER_ERROR' }, status: 'ERROR' });
    expect(collection.samples.slice(3).every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    await expect(
      readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8').then(
        (text) => JSON.parse(text) as unknown,
      ),
    ).resolves.toMatchObject({ status: 'INSUFFICIENT', stopReason: 'GLOBAL_AUTHENTICATION' });
  });

  it.each([
    { code: 'HTTP_429' as const, label: 'HTTP 429 rate limit exceeded' },
    { code: 'UNCLASSIFIED' as const, label: 'account quota exhausted' },
    { code: 'UNCLASSIFIED' as const, label: 'usage limit reached' },
  ])('stops globally when the provider reports $label', async ({ code }) => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-rate-limit-'));
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => () => {
          invocations += 1;
          return Promise.reject(new AuthorProviderError({ category: 'RATE_LIMIT', code, stage: 'RESULT' }));
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'GLOBAL_RATE_LIMIT' });
    expect(collection.samples[0]).toMatchObject({ error: { code: 'PROVIDER_ERROR' }, status: 'ERROR' });
    expect(collection.samples.slice(1).every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    expect(invocations).toBe(1);
    await expect(
      readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8').then(
        (text) => JSON.parse(text) as unknown,
      ),
    ).resolves.toMatchObject({ status: 'INSUFFICIENT', stopReason: 'GLOBAL_RATE_LIMIT' });
  });

  it('preserves sample-local invalid output and timeout errors without adapting the schedule', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-local-errors-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => () => {
          invocations += 1;
          if (invocations === 1) return Promise.resolve({ observedModel: null, output: '```json\n{}\n```' });
          if (invocations === 2) {
            return Promise.reject(new AuthorProviderError({ category: 'TIMEOUT', code: 'ABORTED', stage: 'RESULT' }));
          }
          return Promise.resolve({ observedModel: null, output: candidate });
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 16, status: 'COMPLETE', stopReason: null });
    expect(collection.samples[0]).toMatchObject({ error: { code: 'INVALID_JSON' }, status: 'ERROR' });
    expect(collection.samples[1]).toMatchObject({ error: { code: 'PROVIDER_ERROR' }, status: 'ERROR' });
    expect(collection.samples.slice(2).every((sample) => sample.status === 'COMPLETED')).toBe(true);
    expect(JSON.stringify(collection)).not.toContain('```json');
  });

  it('permits only one collector to claim a campaign under concurrent attempts', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-exclusive-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    let invocations = 0;
    const input = {
      approval: '16',
      bundle,
      bundleDirectory,
      campaign,
      codexHome: '/unused',
      expectedCommit: 'e'.repeat(40),
      preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
      repositoryRoot,
    };
    const dependencies = {
      createInvoker: () => () => {
        invocations += 1;
        return Promise.resolve({ observedModel: null, output: candidate });
      },
      currentCommit: () => Promise.resolve('e'.repeat(40)),
      workingTreeClean: () => Promise.resolve(true),
    };

    const attempts = await Promise.allSettled([
      runAuthorBenchmarkCampaign(input, dependencies),
      runAuthorBenchmarkCampaign(input, dependencies),
    ]);

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')[0]).toMatchObject({
      reason: { code: 'BENCHMARK_ALREADY_RESERVED' },
    });
    expect(invocations).toBe(16);
    expect(
      (await readdir(join(repositoryRoot, '.skill-evidence', 'author-benchmark-reservations'))).filter((name) =>
        name.endsWith('.terminal.json'),
      ),
    ).toEqual(['e5-author-benchmark-20260811-r1.terminal.json']);
  });

  it('invalidates collection without a call when frozen skill material drifts after preflight', async () => {
    const fixture = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-drift-root-'));
    const bundleDirectory = join(repositoryRoot, 'bundle-copy');
    await cp(fixture.bundleDirectory, bundleDirectory, { recursive: true });
    const firstCase = fixture.bundle.cases.find((entry) => entry.id === fixture.bundle.schedule[0]!.caseId)!;
    await appendFile(join(bundleDirectory, firstCase.skillPath, 'SKILL.md'), '\nUnexpected post-preflight drift.\n');
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle: fixture.bundle,
        bundleDirectory,
        campaign: fixture.campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(fixture.campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          invocations += 1;
          return () => Promise.reject(new Error('must not invoke'));
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INVALIDATED', stopReason: 'SNAPSHOT_DRIFT' });
    expect(collection.samples.every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    expect(invocations).toBe(0);
  });

  it('persists an invalidated terminal receipt when a frozen snapshot becomes unavailable', async () => {
    const fixture = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-snapshot-unavailable-'));
    const bundleDirectory = join(repositoryRoot, 'bundle-copy');
    await cp(fixture.bundleDirectory, bundleDirectory, { recursive: true });
    const firstCase = fixture.bundle.cases.find((entry) => entry.id === fixture.bundle.schedule[0]!.caseId)!;
    await rm(join(bundleDirectory, firstCase.skillPath), { recursive: true });
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle: fixture.bundle,
        bundleDirectory,
        campaign: fixture.campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(fixture.campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          invocations += 1;
          return () => Promise.reject(new Error('must not invoke'));
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INVALIDATED', stopReason: 'SNAPSHOT_UNAVAILABLE' });
    expect(collection.samples.every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    expect(invocations).toBe(0);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, fixture.campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      collectionPersisted: true,
      consumedSampleIds: [],
      providerInvocations: 0,
      status: 'INVALIDATED',
      stopReason: 'SNAPSHOT_UNAVAILABLE',
    });
  });

  it('invalidates on a sample reservation collision without overwriting the existing artifact', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-sample-collision-'));
    const first = bundle.schedule[0]!;
    const collisionContents = '{"owner":"other"}\n';
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          invocations += 1;
          return () => Promise.reject(new Error('must not invoke'));
        },
        createWorkspace: async () => {
          const path = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-workspace-'));
          await writeFile(
            join(
              repositoryRoot,
              campaign.outputDirectory,
              'reservations',
              `${String(first.order).padStart(2, '0')}-${first.sampleId}.json`,
            ),
            collisionContents,
          );
          return { cleanup: async () => await rm(path, { recursive: true }), path };
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INVALIDATED', stopReason: 'SAMPLE_RESERVATION_COLLISION' });
    expect(collection.samples.every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    expect(invocations).toBe(0);
    await expect(
      readFile(
        join(repositoryRoot, campaign.outputDirectory, 'reservations', `${String(first.order).padStart(2, '0')}-${first.sampleId}.json`),
        'utf8',
      ),
    ).resolves.toBe(collisionContents);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({ status: 'INVALIDATED', stopReason: 'SAMPLE_RESERVATION_COLLISION' });
  });

  it('stops insufficiently without a Blueprint when consumed sample evidence cannot be persisted', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-evidence-failure-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    const first = bundle.schedule[0]!;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => async () => {
          await mkdir(
            join(repositoryRoot, campaign.outputDirectory, 'samples', `${String(first.order).padStart(2, '0')}-${first.sampleId}.json`),
          );
          return { observedModel: null, output: candidate };
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'EVIDENCE_PERSISTENCE' });
    expect(collection.samples[0]).toMatchObject({ error: { code: 'EVIDENCE_NOT_PERSISTED' }, status: 'ERROR' });
    expect(collection.samples[0]).not.toHaveProperty('blueprint');
    expect(collection.samples.slice(1).every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      collectionPersisted: true,
      consumedSampleIds: [first.sampleId],
      persistedSampleIds: [],
      providerInvocations: 1,
      status: 'INSUFFICIENT',
      stopReason: 'EVIDENCE_PERSISTENCE',
    });
    expect(JSON.stringify(terminalReceipt)).not.toContain(candidate.slice(0, 30));
  });

  it('preserves persisted evidence and terminalizes insufficiently when workspace cleanup fails', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-cleanup-failure-'));
    const candidate = await readFile(resolve('evaluations/refactor-design/e5-author-runner/candidate.json'), 'utf8');
    const first = bundle.schedule[0]!;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => () => Promise.resolve({ observedModel: null, output: candidate }),
        createWorkspace: async () => {
          const path = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-cleanup-workspace-'));
          return { cleanup: () => Promise.reject(new Error('synthetic cleanup failure')), path };
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'INFRASTRUCTURE_CLEANUP' });
    expect(collection.samples[0]).toMatchObject({ status: 'COMPLETED' });
    expect(collection.samples.slice(1).every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      consumedSampleIds: [first.sampleId],
      persistedSampleIds: [first.sampleId],
      providerInvocations: 1,
      status: 'INSUFFICIENT',
      stopReason: 'INFRASTRUCTURE_CLEANUP',
    });
  });

  it('terminalizes a catchable unexpected infrastructure failure after sample reservation', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-unexpected-failure-'));
    const first = bundle.schedule[0]!;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          throw new Error('unexpected local adapter construction failure with /tmp/private-path');
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INSUFFICIENT', stopReason: 'INFRASTRUCTURE_UNEXPECTED' });
    expect(collection.samples[0]).toMatchObject({ error: { code: 'INFRASTRUCTURE_ERROR' }, status: 'ERROR' });
    expect(collection.samples.slice(1).every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    const terminalReceiptText = await readFile(
      join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')),
      'utf8',
    );
    expect(JSON.parse(terminalReceiptText)).toMatchObject({
      consumedSampleIds: [first.sampleId],
      providerInvocations: 0,
      status: 'INSUFFICIENT',
      stopReason: 'INFRASTRUCTURE_UNEXPECTED',
    });
    expect(terminalReceiptText).not.toContain('/tmp/private-path');
  });

  it('still terminalizes when an infrastructure diagnostic cannot be persisted per sample', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-diagnostic-persistence-failure-'));
    const first = bundle.schedule[0]!;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          throw new Error('synthetic adapter construction failure');
        },
        createWorkspace: async () => {
          const path = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-diagnostic-workspace-'));
          await mkdir(
            join(repositoryRoot, campaign.outputDirectory, 'samples', `${String(first.order).padStart(2, '0')}-${first.sampleId}.json`),
          );
          return { cleanup: async () => await rm(path, { recursive: true }), path };
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INSUFFICIENT', stopReason: 'EVIDENCE_PERSISTENCE' });
    expect(collection.samples[0]).toMatchObject({ error: { code: 'EVIDENCE_NOT_PERSISTED' }, status: 'ERROR' });
    await expect(
      readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8').then(
        (text) => JSON.parse(text) as unknown,
      ),
    ).resolves.toMatchObject({
      collectionPersisted: true,
      consumedSampleIds: [first.sampleId],
      persistedSampleIds: [],
      status: 'INSUFFICIENT',
      stopReason: 'EVIDENCE_PERSISTENCE',
    });
  });

  it('persists a terminal receipt when the canonical collection cannot be written', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-collection-failure-'));

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => async () => {
          await mkdir(join(repositoryRoot, campaign.outputDirectory, 'collection.json'));
          throw new AuthorProviderError({ category: 'AUTHENTICATION', code: 'HTTP_401', stage: 'RESULT' });
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'COLLECTION_PERSISTENCE' });
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      collectionPersisted: false,
      providerInvocations: 1,
      status: 'INSUFFICIENT',
      stopReason: 'COLLECTION_PERSISTENCE',
    });
  });

  it('terminalizes insufficiently when a remaining NOT_RUN record cannot be persisted', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-not-run-failure-'));
    const second = bundle.schedule[1]!;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => async () => {
          await mkdir(
            join(repositoryRoot, campaign.outputDirectory, 'samples', `${String(second.order).padStart(2, '0')}-${second.sampleId}.json`),
          );
          throw new AuthorProviderError({ category: 'AUTHENTICATION', code: 'HTTP_401', stage: 'RESULT' });
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'NOT_RUN_PERSISTENCE' });
    expect(collection.samples).toHaveLength(16);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      collectionPersisted: true,
      providerInvocations: 1,
      status: 'INSUFFICIENT',
      stopReason: 'NOT_RUN_PERSISTENCE',
    });
  });

  it('stops as insufficient without a call when isolated workspace creation fails', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-infrastructure-'));

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createWorkspace: () => Promise.reject(new Error('synthetic workspace failure')),
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INSUFFICIENT', stopReason: 'INFRASTRUCTURE_WORKSPACE' });
    expect(collection.samples.every((sample) => sample.status === 'NOT_RUN')).toBe(true);
  });

  it('persists an insufficient terminal receipt when campaign output cannot be prepared after reservation', async () => {
    const { bundle, bundleDirectory, campaign } = await frozenCampaignFixture();
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-benchmark-output-failure-'));
    const outputDirectory = join(repositoryRoot, campaign.outputDirectory);
    await mkdir(join(repositoryRoot, '.skill-evidence', 'author-benchmark'), { recursive: true });
    await writeFile(outputDirectory, 'occupied by a non-directory');
    let invocations = 0;

    const collection = await runAuthorBenchmarkCampaign(
      {
        approval: '16',
        bundle,
        bundleDirectory,
        campaign,
        codexHome: '/unused',
        expectedCommit: 'e'.repeat(40),
        preflight: readyCampaignPreflight(campaign, 'e'.repeat(40)),
        repositoryRoot,
      },
      {
        createInvoker: () => {
          invocations += 1;
          return () => Promise.reject(new Error('must not invoke'));
        },
        currentCommit: () => Promise.resolve('e'.repeat(40)),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(collection).toMatchObject({ providerInvocations: 0, status: 'INSUFFICIENT', stopReason: 'INFRASTRUCTURE_OUTPUT' });
    expect(collection.samples.every((sample) => sample.status === 'NOT_RUN')).toBe(true);
    expect(invocations).toBe(0);
    const terminalReceipt = JSON.parse(
      await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
    ) as Record<string, unknown>;
    expect(terminalReceipt).toMatchObject({
      collectionPersisted: false,
      consumedSampleIds: [],
      notRunSampleIds: bundle.schedule.map((sample) => sample.sampleId),
      persistedSampleIds: [],
      providerInvocations: 0,
      status: 'INSUFFICIENT',
      stopReason: 'INFRASTRUCTURE_OUTPUT',
    });
  });

  it('requires every explicit campaign argument at the internal command boundary', async () => {
    await expect(runAuthorBenchmarkCommand(['--bundle', 'evaluations/refactor-design/e5-author-benchmark'])).rejects.toMatchObject({
      code: 'BENCHMARK_ARGUMENT_INVALID',
    });
  });

  it('qualifies the final runner through Promptfoo with only deterministic local processes', async () => {
    await expect(qualifyAuthorBenchmarkRunner()).resolves.toMatchObject({
      campaigns: [
        { providerInvocations: 16, status: 'COMPLETE' },
        { providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'GLOBAL_AUTHENTICATION' },
        { providerInvocations: 1, status: 'INSUFFICIENT', stopReason: 'GLOBAL_RATE_LIMIT' },
      ],
      externalProviderCalls: 0,
      localProcessCalls: 18,
      purpose: 'DEVELOPMENT',
      result: 'SUPPORTED_FOR_DEVELOPMENT',
      schemaVersion: 1,
      workspaceCampaignArtifacts: 0,
    });
  });
});
