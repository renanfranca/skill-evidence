import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { prepareAuthorInvocation } from '../src/author/evaluation-author.js';
import { createSkillSnapshot } from '../src/intake/skill-snapshot.js';
import {
  evaluateAuthorBenchmarkCampaignPreflight,
  validateAuthorBenchmarkCampaignPreparation,
  type AuthorBenchmarkCampaignPreparation,
  type AuthorBenchmarkPreflightEvidence,
} from '../src/qualification/author-benchmark-preflight.js';
import { runAuthorBenchmarkCampaignPreflight } from '../src/qualification/preflight-author-benchmark.js';

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
      worktreeClean: true,
    };

    const ready = evaluateAuthorBenchmarkCampaignPreflight(campaign, evidence);
    const blocked = evaluateAuthorBenchmarkCampaignPreflight(campaign, { ...evidence, reservationExists: true });
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
});
