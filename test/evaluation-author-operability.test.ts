import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { authorEvaluationBlueprint, type AuthorInvocationResponse } from '../src/author/evaluation-author.js';
import { AuthorProviderError } from '../src/author/provider-diagnostic.js';
import { createSkillSnapshot } from '../src/intake/skill-snapshot.js';
import { sha256 } from '../src/canonical-json.js';
import {
  createAuthorViabilityResolutionPacket,
  createAuthorViabilityReviewPacket,
  createAuthorViabilityReviewerSubmission,
  resolveAuthorViabilityReview,
  validateAuthorViabilityReviewerSubmission,
  type AuthorViabilityOracle,
} from '../src/qualification/author-viability-review.js';
import {
  prepareAuthorViabilityResolution,
  prepareAuthorViabilityReview,
  scoreAuthorViability,
} from '../src/qualification/author-viability-workflow.js';
import { runAuthorOperabilityPreflight } from '../src/qualification/preflight-author-operability.js';
import { qualifyAuthorOperabilityRunner } from '../src/qualification/qualify-author-operability.js';
import { runAuthorOperabilityCommand } from '../src/qualification/run-author-operability.js';
import {
  evaluateAuthorOperabilityPreflight,
  inspectAuthorOperabilityCampaign,
  runAuthorOperabilityCampaign,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorOperabilityCampaignPreparation,
  type AuthorOperabilityPreflightEvidence,
} from '../src/qualification/author-operability.js';

const fingerprint = 'a'.repeat(64);
const commit = 'b'.repeat(40);

function preparation(): AuthorOperabilityCampaignPreparation {
  return {
    campaignId: 'e18-luna-max-locale-catalog-20260812-r1',
    condition: {
      conditionFingerprint: fingerprint,
      requestedModel: 'gpt-5.6-luna',
      reasoningEffort: 'max',
    },
    fingerprints: {
      condition: fingerprint,
      instruction: fingerprint,
      oracle: fingerprint,
      packet: fingerprint,
      protocol: fingerprint,
      schema: fingerprint,
      snapshot: fingerprint,
    },
    invocationBudget: 1,
    oraclePath: 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/oracle.json',
    outputDirectory: '.skill-evidence/author-operability/e18-luna-max-locale-catalog-20260812-r1',
    protocolVersion: 2,
    reservationPath: '.skill-evidence/author-operability-reservations/e18-luna-max-locale-catalog-20260812-r1.json',
    sanitizedReportPath: 'docs/experiments/e18-luna-max-locale-catalog-20260812-r1.json',
    schemaVersion: 1,
    skillPath: 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/skill',
    timeouts: { maxEvalTimeMs: 660_000, timeoutMs: 600_000 },
  };
}

function viabilityPreparation(): AuthorOperabilityCampaignPreparation {
  return {
    ...preparation(),
    campaignId: 'e19-luna-max-locale-catalog-20260813-r1',
    oraclePath: 'evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json',
    outputDirectory: '.skill-evidence/author-operability/e19-luna-max-locale-catalog-20260813-r1',
    reservationPath: '.skill-evidence/author-operability-reservations/e19-luna-max-locale-catalog-20260813-r1.json',
    sanitizedReportPath: 'docs/experiments/e19-luna-max-locale-catalog-20260813-r1.json',
    timeouts: { maxEvalTimeMs: 1_860_000, timeoutMs: 1_800_000 },
  };
}

function terraPreparation(): AuthorOperabilityCampaignPreparation {
  return {
    ...viabilityPreparation(),
    campaignId: 'e20-terra-xhigh-locale-catalog-20260813-r1',
    condition: {
      conditionFingerprint: fingerprint,
      reasoningEffort: 'xhigh',
      requestedModel: 'gpt-5.6-terra',
    },
    fingerprints: { ...viabilityPreparation().fingerprints, condition: fingerprint },
    outputDirectory: '.skill-evidence/author-operability/e20-terra-xhigh-locale-catalog-20260813-r1',
    reservationPath: '.skill-evidence/author-operability-reservations/e20-terra-xhigh-locale-catalog-20260813-r1.json',
    sanitizedReportPath: 'docs/experiments/e20-terra-xhigh-locale-catalog-20260813-r1.json',
  };
}

function evidence(): AuthorOperabilityPreflightEvidence {
  return {
    authentication: { codexHome: '/home/renanfranca/.codex', homeWritable: true, loginStatus: 'AUTHENTICATED' },
    credentialVariablesAbsent: true,
    currentCommit: commit,
    derivedFingerprints: preparation().fingerprints,
    environment: {
      codexCliVersion: '0.147.0',
      codexSdkVersion: '0.147.0',
      nodeVersion: '24.16.0',
      npmVersion: '11.13.0',
      promptfooVersion: '0.122.0',
    },
    expectedCommit: commit,
    invocationConfigurationValid: true,
    localQualificationResult: 'SUPPORTED_FOR_DEVELOPMENT',
    outputExists: false,
    packetBlind: true,
    reservationExists: false,
    terminalReceiptExists: false,
    upstreamAligned: true,
    worktreeClean: true,
  };
}

describe('Evaluation Author operability canary', () => {
  it('accepts only the frozen campaign profiles while preserving the exact model-facing packet', async () => {
    const [e18Value, e19Value, e20Value] = await Promise.all([
      readFile('evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/campaign-preparation.json', 'utf8'),
      readFile('evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/campaign-preparation.json', 'utf8'),
      readFile('evaluations/refactor-design/e5-author-operability/terra-xhigh-controlled-r1/campaign-preparation.json', 'utf8'),
    ]);
    const e18 = JSON.parse(e18Value) as unknown;
    const e19 = JSON.parse(e19Value) as unknown;
    const e20 = JSON.parse(e20Value) as unknown;

    expect(validateAuthorOperabilityCampaignPreparation(e18)).toBe(true);
    expect(validateAuthorOperabilityCampaignPreparation(e19)).toBe(true);
    expect(validateAuthorOperabilityCampaignPreparation(e20)).toBe(true);
    if (
      !validateAuthorOperabilityCampaignPreparation(e18) ||
      !validateAuthorOperabilityCampaignPreparation(e19) ||
      !validateAuthorOperabilityCampaignPreparation(e20)
    )
      return;
    const [e18Inspection, e19Inspection, e20Inspection] = await Promise.all([
      inspectAuthorOperabilityCampaign(process.cwd(), e18),
      inspectAuthorOperabilityCampaign(process.cwd(), e19),
      inspectAuthorOperabilityCampaign(process.cwd(), e20),
    ]);

    expect(e19.timeouts).toEqual({ maxEvalTimeMs: 1_860_000, timeoutMs: 1_800_000 });
    expect(e19Inspection.packet).toBe(e18Inspection.packet);
    expect(e19Inspection.fingerprints).toEqual({
      ...e18Inspection.fingerprints,
      oracle: e19.fingerprints.oracle,
    });
    expect(e19Inspection.invocationConfigurationValid).toBe(true);
    expect(e19Inspection.packetBlind).toBe(true);
    expect(e20.condition).toEqual({
      conditionFingerprint: e20.fingerprints.condition,
      reasoningEffort: 'xhigh',
      requestedModel: 'gpt-5.6-terra',
    });
    expect(e20.timeouts).toEqual(e19.timeouts);
    expect(e20.oraclePath).toBe(e19.oraclePath);
    expect(e20Inspection.packet).toBe(e19Inspection.packet);
    expect(e20Inspection.fingerprints).toEqual({
      ...e19Inspection.fingerprints,
      condition: e20.fingerprints.condition,
    });
    expect(e20Inspection.invocationConfigurationValid).toBe(true);
    expect(e20Inspection.packetBlind).toBe(true);
  });

  it('keeps the final command inert without literal one-call approval', async () => {
    await expect(
      runAuthorOperabilityCommand([
        '--preparation',
        'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/campaign-preparation.json',
        '--expected-commit',
        commit,
        '--approve-provider-invocations',
        '0',
      ]),
    ).rejects.toThrow('OPERABILITY_APPROVAL_REQUIRED');
    await expect(
      runAuthorOperabilityPreflight([
        '--preparation',
        'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/campaign-preparation.json',
      ]),
    ).rejects.toThrow('USAGE:');
  });

  it('qualifies the final runner through local Promptfoo and Codex SDK processes only', async () => {
    const report = await qualifyAuthorOperabilityRunner();

    expect(report).toMatchObject({
      externalProviderCalls: 0,
      localProcessCalls: 9,
      purpose: 'DEVELOPMENT',
      reviewWorkflowQualified: true,
      reviewWorkflowCampaigns: ['e19-luna-max-locale-catalog-20260813-r1', 'e20-terra-xhigh-locale-catalog-20260813-r1'],
      result: 'SUPPORTED_FOR_DEVELOPMENT',
    });
    expect(report.cases).toEqual([
      {
        actual: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        expected: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'e18-luna-max-locale-catalog-20260812-r1:completion',
        viabilityDecision: null,
      },
      {
        actual: 'INSUFFICIENT',
        expected: 'INSUFFICIENT',
        id: 'e18-luna-max-locale-catalog-20260812-r1:codex-turn-timeout',
        viabilityDecision: null,
      },
      {
        actual: 'INSUFFICIENT',
        expected: 'INSUFFICIENT',
        id: 'e18-luna-max-locale-catalog-20260812-r1:process-failure',
        viabilityDecision: null,
      },
      {
        actual: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        expected: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'e19-luna-max-locale-catalog-20260813-r1:completion',
        viabilityDecision: 'PENDING_SEMANTIC_REVIEW',
      },
      {
        actual: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        expected: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'e19-luna-max-locale-catalog-20260813-r1:codex-turn-timeout',
        viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR',
      },
      {
        actual: 'INSUFFICIENT',
        expected: 'INSUFFICIENT',
        id: 'e19-luna-max-locale-catalog-20260813-r1:process-failure',
        viabilityDecision: 'INSUFFICIENT',
      },
      {
        actual: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        comparisonConclusion: 'PENDING_SEMANTIC_REVIEW',
        expected: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'e20-terra-xhigh-locale-catalog-20260813-r1:completion',
        viabilityDecision: null,
      },
      {
        actual: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        comparisonConclusion: 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT',
        expected: 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'e20-terra-xhigh-locale-catalog-20260813-r1:codex-turn-timeout',
        viabilityDecision: null,
      },
      {
        actual: 'INSUFFICIENT',
        comparisonConclusion: 'INSUFFICIENT',
        expected: 'INSUFFICIENT',
        id: 'e20-terra-xhigh-locale-catalog-20260813-r1:process-failure',
        viabilityDecision: null,
      },
    ]);
  }, 20_000);

  it('collects a literal provider-free preflight without creating campaign artifacts', async () => {
    const report = await runAuthorOperabilityPreflight(
      [
        '--preparation',
        'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/campaign-preparation.json',
        '--expected-commit',
        commit,
      ],
      {
        codexCliVersion: () => Promise.resolve('0.147.0'),
        currentCommit: () => Promise.resolve(commit),
        environment: { SKILL_EVIDENCE_AUTHOR_CODEX_HOME: '/home/renanfranca/.codex' },
        loginStatus: () => Promise.resolve(true),
        localQualification: () => Promise.resolve('SUPPORTED_FOR_DEVELOPMENT'),
        nodeVersion: () => '24.16.0',
        npmVersion: () => Promise.resolve('11.13.0'),
        packageVersion: (name) => Promise.resolve(name === 'promptfoo' ? '0.122.0' : '0.147.0'),
        pathExists: () => Promise.resolve(false),
        pathWritable: () => Promise.resolve(true),
        repositoryRoot: process.cwd(),
        upstreamAligned: () => Promise.resolve(true),
        workingTreeClean: () => Promise.resolve(true),
      },
    );

    expect(report).toMatchObject({
      externalProviderCalls: 0,
      expectedCommit: commit,
      providerInvocations: 0,
      reservationCreated: false,
      result: 'READY_FOR_AUTHORIZATION',
    });
  });

  it('derives every material campaign identity while keeping the oracle outside the Author packet', async () => {
    const campaign = preparation();
    const inspected = await inspectAuthorOperabilityCampaign(process.cwd(), campaign);

    expect(inspected.packetBlind).toBe(true);
    expect(inspected.invocationConfigurationValid).toBe(true);
    expect(inspected.fingerprints.condition).toMatch(/^[a-f0-9]{64}$/u);
    expect(inspected.fingerprints.oracle).toMatch(/^[a-f0-9]{64}$/u);
    expect(inspected.fingerprints.packet).toMatch(/^[a-f0-9]{64}$/u);
    expect(inspected.fingerprints.snapshot).toMatch(/^[a-f0-9]{64}$/u);
    expect(inspected.packet).not.toMatch(/expectedLifecycle|minimalChecks|oracle\.json|e5-author-benchmark/u);
  });

  it('requires every frozen provider-free prerequisite without reserving or invoking the canary', () => {
    const ready = evaluateAuthorOperabilityPreflight(preparation(), evidence());
    const drifted = evaluateAuthorOperabilityPreflight(preparation(), { ...evidence(), currentCommit: 'c'.repeat(40) });

    expect(ready).toMatchObject({
      currentCommit: commit,
      expectedCommit: commit,
      externalProviderCalls: 0,
      providerInvocations: 0,
      reservationCreated: false,
      result: 'READY_FOR_AUTHORIZATION',
    });
    expect(ready.checks.every((check) => check.status === 'PASS')).toBe(true);
    expect(drifted).toMatchObject({ result: 'BLOCKED' });
    expect(drifted.checks).toContainEqual({ id: 'EXACT_CLEAN_COMMIT', status: 'FAIL' });

    const consumed = evaluateAuthorOperabilityPreflight(preparation(), {
      ...evidence(),
      terminalReceiptExists: true,
    });
    expect(consumed).toMatchObject({ result: 'BLOCKED' });
    expect(consumed.checks).toContainEqual({ id: 'TERMINAL_RECEIPT_ABSENT', status: 'FAIL' });
  });

  it('blocks approval and commit drift before a real reservation or invocation', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-operability-blocked-'));
    let invocations = 0;
    const invoke = (): Promise<AuthorInvocationResponse> => {
      invocations += 1;
      return Promise.resolve({ observedModel: null, output: '{}' });
    };
    const ready = evaluateAuthorOperabilityPreflight(preparation(), evidence());

    await expect(
      runAuthorOperabilityCampaign({
        approval: '0',
        currentCommit: () => Promise.resolve(commit),
        expectedCommit: commit,
        invoke,
        inspectCampaign: () =>
          Promise.resolve({
            fingerprints: preparation().fingerprints,
            invocationConfigurationValid: true,
            packet: '{}',
            packetBlind: true,
          }),
        preparation: preparation(),
        preflight: ready,
        repositoryRoot,
        workingTreeClean: () => Promise.resolve(true),
      }),
    ).rejects.toThrow('OPERABILITY_APPROVAL_REQUIRED');
    await expect(
      runAuthorOperabilityCampaign({
        approval: '1',
        currentCommit: () => Promise.resolve('c'.repeat(40)),
        expectedCommit: commit,
        invoke,
        inspectCampaign: () =>
          Promise.resolve({
            fingerprints: preparation().fingerprints,
            invocationConfigurationValid: true,
            packet: '{}',
            packetBlind: true,
          }),
        preparation: preparation(),
        preflight: ready,
        repositoryRoot,
        workingTreeClean: () => Promise.resolve(true),
      }),
    ).rejects.toThrow('OPERABILITY_COMMIT_DRIFT');
    await expect(
      runAuthorOperabilityCampaign({
        approval: '1',
        currentCommit: () => Promise.resolve(commit),
        expectedCommit: commit,
        inspectCampaign: () =>
          Promise.resolve({
            fingerprints: { ...preparation().fingerprints, snapshot: 'c'.repeat(64) },
            invocationConfigurationValid: true,
            packet: '{}',
            packetBlind: true,
          }),
        invoke,
        preparation: preparation(),
        preflight: ready,
        repositoryRoot,
        workingTreeClean: () => Promise.resolve(true),
      }),
    ).rejects.toThrow('OPERABILITY_IDENTITY_DRIFT');
    expect(invocations).toBe(0);
    await expect(access(join(repositoryRoot, preparation().reservationPath))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('terminalizes one completed or timed-out invocation without conflating operability and lifecycle', async () => {
    const baseCandidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const blockedCandidate = {
      ...baseCandidate,
      unresolvedRequirements: [
        {
          blocking: true,
          description: 'Decision thresholds are not specified by the skill snapshot.',
          id: 'missing-decision-context',
          relatedSection: 'decisionContext',
        },
      ],
    };

    for (const scenario of ['completed', 'timeout', 'rate-limit'] as const) {
      const repositoryRoot = await mkdtemp(join(tmpdir(), `skill-evidence-operability-${scenario}-`));
      const campaign = preparation();
      const skillRoot = join(repositoryRoot, campaign.skillPath);
      await mkdir(skillRoot, { recursive: true });
      await writeFile(join(skillRoot, 'SKILL.md'), '# Local operability fixture\n');
      await mkdir(dirname(join(repositoryRoot, campaign.oraclePath)), { recursive: true });
      await writeFile(join(repositoryRoot, campaign.oraclePath), '{"expectedLifecycle":"BLOCKED","schemaVersion":1}\n');
      let invocations = 0;
      const invoke = (): Promise<AuthorInvocationResponse> => {
        invocations += 1;
        if (scenario === 'timeout') {
          throw new AuthorProviderError(
            { category: 'TIMEOUT', code: 'ABORTED', stage: 'RESULT' },
            {
              cancellationObserved: true,
              cancellationRequested: true,
              firstProgressAtMs: 10,
              lastObservedStage: 'PROCESS_EXIT',
              lastProgressAtMs: 20,
              progressObserved: true,
              timeoutOwner: 'PROMPTFOO_STEP',
            },
          );
        }
        if (scenario === 'rate-limit') {
          throw new AuthorProviderError({ category: 'RATE_LIMIT', code: 'HTTP_429', stage: 'RESULT' });
        }
        return Promise.resolve({ observedModel: null, output: JSON.stringify(blockedCandidate) });
      };

      const result = await runAuthorOperabilityCampaign({
        approval: '1',
        currentCommit: () => Promise.resolve(commit),
        expectedCommit: commit,
        inspectCampaign: () =>
          Promise.resolve({
            fingerprints: campaign.fingerprints,
            invocationConfigurationValid: true,
            packet: '{}',
            packetBlind: true,
          }),
        invoke,
        preparation: campaign,
        preflight: evaluateAuthorOperabilityPreflight(campaign, evidence()),
        repositoryRoot,
        workingTreeClean: () => Promise.resolve(true),
      });
      const terminal = JSON.parse(
        await readFile(join(repositoryRoot, campaign.reservationPath.replace(/\.json$/u, '.terminal.json')), 'utf8'),
      ) as Record<string, unknown>;
      const collection = JSON.parse(await readFile(join(repositoryRoot, campaign.outputDirectory, 'collection.json'), 'utf8')) as Record<
        string,
        unknown
      >;

      expect(invocations).toBe(1);
      const expectedOutcome =
        scenario === 'completed'
          ? 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
          : scenario === 'timeout'
            ? 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
            : 'INSUFFICIENT';
      expect(result.operabilityOutcome).toBe(expectedOutcome);
      expect(terminal).toMatchObject({ collectionPersisted: true, providerInvocations: 1 });
      expect(collection).toMatchObject({ operabilityOutcome: result.operabilityOutcome });
      expect(JSON.stringify(terminal)).not.toMatch(/Decision thresholds are not specified|Local operability fixture/);
      if (scenario === 'completed') {
        expect(collection).toMatchObject({ actualLifecycle: 'BLOCKED', lifecycleExpectationMet: true });
      }
    }
  });

  it('discards the 30-minute condition after its single prespecified step timeout', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-viability-timeout-'));
    const campaign = viabilityPreparation();
    await mkdir(join(repositoryRoot, campaign.skillPath), { recursive: true });
    await writeFile(join(repositoryRoot, campaign.skillPath, 'SKILL.md'), '# Viability fixture\n');

    const result = await runAuthorOperabilityCampaign({
      approval: '1',
      currentCommit: () => Promise.resolve(commit),
      expectedCommit: commit,
      inspectCampaign: () =>
        Promise.resolve({
          fingerprints: campaign.fingerprints,
          invocationConfigurationValid: true,
          packet: '{}',
          packetBlind: true,
        }),
      invoke: () =>
        Promise.reject(
          new AuthorProviderError(
            { category: 'TIMEOUT', code: 'ABORTED', stage: 'RESULT' },
            {
              cancellationObserved: true,
              cancellationRequested: true,
              firstProgressAtMs: 10,
              lastObservedStage: 'PROCESS_EXIT',
              lastProgressAtMs: 20,
              progressObserved: true,
              timeoutOwner: 'PROMPTFOO_STEP',
            },
          ),
        ),
      preparation: campaign,
      preflight: evaluateAuthorOperabilityPreflight(campaign, {
        ...evidence(),
        derivedFingerprints: campaign.fingerprints,
      }),
      repositoryRoot,
      workingTreeClean: () => Promise.resolve(true),
    });
    const collection = JSON.parse(await readFile(join(repositoryRoot, campaign.outputDirectory, 'collection.json'), 'utf8')) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({ providerInvocations: 1, viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR' });
    expect(collection).toMatchObject({
      target1800SecondsMet: false,
      target300SecondsMet: false,
      target600SecondsMet: false,
      viabilityDecision: 'NOT_VIABLE_FOR_AUTHOR',
    });
  });

  it('discards a completed 30-minute candidate when the system-derived lifecycle is not BLOCKED', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-viability-ready-'));
    const campaign = viabilityPreparation();
    const candidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    await mkdir(join(repositoryRoot, campaign.skillPath), { recursive: true });
    await writeFile(join(repositoryRoot, campaign.skillPath, 'SKILL.md'), '# Viability fixture\n');

    const result = await runAuthorOperabilityCampaign({
      approval: '1',
      currentCommit: () => Promise.resolve(commit),
      expectedCommit: commit,
      inspectCampaign: () =>
        Promise.resolve({
          fingerprints: campaign.fingerprints,
          invocationConfigurationValid: true,
          packet: '{}',
          packetBlind: true,
        }),
      invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(candidate) }),
      now: (() => {
        let value = 0;
        return () => (value += 1_000);
      })(),
      preparation: campaign,
      preflight: evaluateAuthorOperabilityPreflight(campaign, {
        ...evidence(),
        derivedFingerprints: campaign.fingerprints,
      }),
      repositoryRoot,
      workingTreeClean: () => Promise.resolve(true),
    });

    expect(result.viabilityDecision).toBe('NOT_VIABLE_FOR_AUTHOR');
  });

  it('identifies the exact shared evidence-taxonomy failure on the frozen Terra contrast', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-terra-shared-failure-'));
    const campaign = terraPreparation();
    const candidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const claims = candidate.claims as Array<Record<string, unknown>>;
    const contracts = candidate.contracts as Array<Record<string, unknown>>;
    const evidencePlan = candidate.evidencePlan as Array<Record<string, unknown>>;
    claims[0]!.id = 'claim_no_entries';
    contracts[0]!.id = 'contract_no_entries';
    contracts[0]!.claimIds = ['claim_no_entries'];
    evidencePlan[0]!.id = 'evidence_no_entries';
    evidencePlan[0]!.claimIds = ['claim_no_entries'];
    evidencePlan[0]!.contractIds = ['contract_no_entries'];
    evidencePlan[0]!.evidenceType = 'SEMANTIC';
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'Decision context is absent from the supplied skill snapshot.',
        id: 'decision-context-absent',
        relatedSection: 'decisionContext',
      },
    ];
    await mkdir(join(repositoryRoot, campaign.skillPath), { recursive: true });
    await writeFile(join(repositoryRoot, campaign.skillPath, 'SKILL.md'), '# Controlled Terra fixture\n');

    const result = await runAuthorOperabilityCampaign({
      approval: '1',
      currentCommit: () => Promise.resolve(commit),
      expectedCommit: commit,
      inspectCampaign: () =>
        Promise.resolve({ fingerprints: campaign.fingerprints, invocationConfigurationValid: true, packet: '{}', packetBlind: true }),
      invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(candidate) }),
      preparation: campaign,
      preflight: evaluateAuthorOperabilityPreflight(campaign, { ...evidence(), derivedFingerprints: campaign.fingerprints }),
      repositoryRoot,
      workingTreeClean: () => Promise.resolve(true),
    });
    const collection = JSON.parse(await readFile(join(repositoryRoot, campaign.outputDirectory, 'collection.json'), 'utf8')) as Record<
      string,
      unknown
    >;

    expect(result.comparisonConclusion).toBe('SHARED_INSTRUMENT_FAILURE_SUPPORTED');
    expect(collection).toMatchObject({
      actualLifecycle: 'DRAFT',
      comparisonConclusion: 'SHARED_INSTRUMENT_FAILURE_SUPPORTED',
      viabilityDecision: null,
    });
  });

  it('keeps every non-review Terra terminal outcome inside the frozen diagnostic matrix', async () => {
    const baseCandidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const blockedCandidate = {
      ...baseCandidate,
      unresolvedRequirements: [
        {
          blocking: true,
          description: 'Decision context is absent from the supplied snapshot.',
          id: 'decision-context-absent',
          relatedSection: 'decisionContext',
        },
      ],
    };
    const draftCandidate = { ...baseCandidate, evidencePlan: [] };
    const scenarios: Array<{
      expected: string;
      id: string;
      invoke: () => Promise<AuthorInvocationResponse>;
    }> = [
      {
        expected: 'PENDING_SEMANTIC_REVIEW',
        id: 'blocked',
        invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(blockedCandidate) }),
      },
      {
        expected: 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT',
        id: 'other-draft',
        invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(draftCandidate) }),
      },
      {
        expected: 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT',
        id: 'invalid-json',
        invoke: () => Promise.resolve({ observedModel: null, output: 'not-json' }),
      },
      {
        expected: 'TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT',
        id: 'timeout',
        invoke: () => Promise.reject(new AuthorProviderError({ category: 'TIMEOUT', code: 'ABORTED', stage: 'RESULT' })),
      },
      {
        expected: 'INSUFFICIENT',
        id: 'process',
        invoke: () => Promise.reject(new AuthorProviderError({ category: 'PROCESS', code: 'EXIT_NONZERO', stage: 'RESULT' })),
      },
    ];

    for (const scenario of scenarios) {
      const repositoryRoot = await mkdtemp(join(tmpdir(), `skill-evidence-terra-${scenario.id}-`));
      const campaign = terraPreparation();
      await mkdir(join(repositoryRoot, campaign.skillPath), { recursive: true });
      await writeFile(join(repositoryRoot, campaign.skillPath, 'SKILL.md'), '# Controlled Terra fixture\n');

      const result = await runAuthorOperabilityCampaign({
        approval: '1',
        currentCommit: () => Promise.resolve(commit),
        expectedCommit: commit,
        inspectCampaign: () =>
          Promise.resolve({ fingerprints: campaign.fingerprints, invocationConfigurationValid: true, packet: '{}', packetBlind: true }),
        invoke: scenario.invoke,
        preparation: campaign,
        preflight: evaluateAuthorOperabilityPreflight(campaign, { ...evidence(), derivedFingerprints: campaign.fingerprints }),
        repositoryRoot,
        workingTreeClean: () => Promise.resolve(true),
      });

      expect(result.comparisonConclusion).toBe(scenario.expected);
      expect(result.providerInvocations).toBe(1);
    }
  });

  it('keeps semantic review condition-blind and resolves only disagreements before viability', async () => {
    const candidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'Decision context is absent from the skill snapshot.',
        id: 'decision-context-absent',
        relatedSection: 'decisionContext',
      },
    ];
    const snapshot = await createSkillSnapshot({
      rootDirectory: 'evaluations/refactor-design/e5-author-operability/luna-max-canary-r1/skill',
    });
    const run = await authorEvaluationBlueprint({
      campaignId: 'hidden-campaign',
      condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
      invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(candidate) }),
      protocolVersion: 2,
      snapshot,
    });
    expect(run.status).toBe('COMPLETED');
    if (run.status !== 'COMPLETED') return;
    const oracle = JSON.parse(
      await readFile('evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json', 'utf8'),
    ) as AuthorViabilityOracle;
    const packet = createAuthorViabilityReviewPacket({ blueprint: run.blueprint, oracle, skillFiles: snapshot.includedFiles });
    const packetText = JSON.stringify(packet);

    expect(packetText).not.toMatch(/gpt-5\.6-luna|\bmax\b|600649|e18-|hidden-campaign|expectedLifecycle|BLOCKED/u);
    expect(packet.criteria.some((criterion) => criterion.id === 'system-controlled-lifecycle-and-provenance')).toBe(false);
    const accepted = packet.criteria.map((criterion) => ({
      criterionId: criterion.id,
      evidencePaths: ['/candidate/contracts'],
      rationale: 'The candidate preserves the observable skill contract.',
      verdict: 'ACCEPT' as const,
    }));
    const reviewerA = createAuthorViabilityReviewerSubmission({ judgments: accepted, packet, reviewerId: 'reviewer-a' });
    const reviewerB = createAuthorViabilityReviewerSubmission({ judgments: accepted, packet, reviewerId: 'reviewer-b' });
    expect(validateAuthorViabilityReviewerSubmission(packet, reviewerA)).toBe(true);
    expect(validateAuthorViabilityReviewerSubmission(packet, reviewerB)).toBe(true);
    expect(createAuthorViabilityResolutionPacket(packet, [reviewerA, reviewerB]).disagreements).toEqual([]);
    expect(resolveAuthorViabilityReview(packet, [reviewerA, reviewerB], [])).toMatchObject({
      decision: 'VIABLE_CANDIDATE',
    });

    const disputedB = createAuthorViabilityReviewerSubmission({
      judgments: accepted.map((judgment, index) => (index === 0 ? { ...judgment, verdict: 'REJECT' as const } : judgment)),
      packet,
      reviewerId: 'reviewer-b',
    });
    const resolutionPacket = createAuthorViabilityResolutionPacket(packet, [reviewerA, disputedB]);
    expect(resolutionPacket.disagreements.map((entry) => entry.criterionId)).toEqual([packet.criteria[0]!.id]);
    expect(
      resolveAuthorViabilityReview(
        packet,
        [reviewerA, disputedB],
        [
          {
            criterionId: packet.criteria[0]!.id,
            evidencePaths: ['/candidate/activationRegions'],
            rationale: 'The activation boundary is critically incomplete.',
            verdict: 'REJECT',
          },
        ],
      ),
    ).toMatchObject({ decision: 'NOT_VIABLE_FOR_AUTHOR' });
  });

  it('persists independent review packets, disagreement-only resolution, and one sanitized final report', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-viability-review-'));
    const campaign = viabilityPreparation();
    const candidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'Decision authority and release thresholds are absent.',
        id: 'decision-authority-absent',
        relatedSection: 'decisionContext',
      },
    ];
    const skillDirectory = join(repositoryRoot, campaign.skillPath);
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, 'SKILL.md'), '# Locale catalog\n\nRender entries literally.\n');
    await mkdir(dirname(join(repositoryRoot, campaign.oraclePath)), { recursive: true });
    await writeFile(
      join(repositoryRoot, campaign.oraclePath),
      await readFile('evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json', 'utf8'),
    );
    const snapshot = await createSkillSnapshot({ rootDirectory: skillDirectory });
    const run = await authorEvaluationBlueprint({
      campaignId: campaign.campaignId,
      condition: { model: 'gpt-5.6-luna', reasoningEffort: 'max' },
      invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(candidate) }),
      protocolVersion: 2,
      snapshot,
    });
    expect(run.status).toBe('COMPLETED');
    if (run.status !== 'COMPLETED') return;
    const outputDirectory = join(repositoryRoot, campaign.outputDirectory);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      join(outputDirectory, 'collection.json'),
      JSON.stringify({
        actualLifecycle: 'BLOCKED',
        blueprint: run.blueprint,
        campaignFingerprint: sha256(campaign),
        campaignId: campaign.campaignId,
        elapsedMs: 700_000,
        operabilityOutcome: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        providerInvocations: 1,
        providerObservation: null,
        target1800SecondsMet: true,
        target300SecondsMet: false,
        target600SecondsMet: false,
        tokenUsage: null,
        viabilityDecision: 'PENDING_SEMANTIC_REVIEW',
      }),
    );

    const prepared = await prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot });
    const packet = JSON.parse(await readFile(join(prepared.reviewDirectory, 'reviewer-a.packet.json'), 'utf8')) as {
      criteria: Array<{ id: string }>;
    };
    const accepted = packet.criteria.map((criterion) => ({
      criterionId: criterion.id,
      evidencePaths: ['/candidate/contracts'],
      rationale: 'Grounded in the candidate contract.',
      verdict: 'ACCEPT',
    }));
    await Promise.all([
      writeFile(join(prepared.reviewDirectory, 'reviewer-a.input.json'), JSON.stringify({ judgments: accepted, reviewerId: 'reviewer-a' })),
      writeFile(join(prepared.reviewDirectory, 'reviewer-b.input.json'), JSON.stringify({ judgments: accepted, reviewerId: 'reviewer-b' })),
    ]);
    const resolutionPacket = await prepareAuthorViabilityResolution({
      repositoryRoot,
      reviewDirectory: prepared.reviewDirectory,
    });
    expect(resolutionPacket.disagreements).toEqual([]);
    const report = await scoreAuthorViability({
      outputPath: campaign.sanitizedReportPath,
      preparation: campaign,
      repositoryRoot,
    });

    expect(report).toMatchObject({ decisionEligible: false, result: 'VIABLE_CANDIDATE' });
    expect(JSON.stringify(report)).not.toMatch(/hidden-campaign|rawReasoning|responseRaw|SKILL_EVIDENCE_AUTHOR_CODEX_HOME/);
    await expect(prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot })).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(
      scoreAuthorViability({ outputPath: campaign.sanitizedReportPath, preparation: campaign, repositoryRoot }),
    ).rejects.toMatchObject({ code: 'EEXIST' });
  });

  it('passes Terra only after a BLOCKED candidate completes independent semantic review', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-terra-review-'));
    const campaign = terraPreparation();
    const candidate = JSON.parse(await readFile('evaluations/refactor-design/e4-author/base-candidate.json', 'utf8')) as Record<
      string,
      unknown
    >;
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'Decision authority and release thresholds are absent.',
        id: 'decision-authority-absent',
        relatedSection: 'decisionContext',
      },
    ];
    const skillDirectory = join(repositoryRoot, campaign.skillPath);
    await mkdir(skillDirectory, { recursive: true });
    await writeFile(join(skillDirectory, 'SKILL.md'), '# Locale catalog\n\nRender entries literally.\n');
    await mkdir(dirname(join(repositoryRoot, campaign.oraclePath)), { recursive: true });
    await writeFile(
      join(repositoryRoot, campaign.oraclePath),
      await readFile('evaluations/refactor-design/e5-author-operability/luna-max-viability-r1/oracle.json', 'utf8'),
    );
    const snapshot = await createSkillSnapshot({ rootDirectory: skillDirectory });
    const run = await authorEvaluationBlueprint({
      campaignId: campaign.campaignId,
      condition: { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' },
      invoke: () => Promise.resolve({ observedModel: null, output: JSON.stringify(candidate) }),
      protocolVersion: 2,
      snapshot,
    });
    expect(run.status).toBe('COMPLETED');
    if (run.status !== 'COMPLETED') return;
    const outputDirectory = join(repositoryRoot, campaign.outputDirectory);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      join(outputDirectory, 'collection.json'),
      JSON.stringify({
        actualLifecycle: 'BLOCKED',
        blueprint: run.blueprint,
        campaignFingerprint: sha256(campaign),
        campaignId: campaign.campaignId,
        comparisonConclusion: 'PENDING_SEMANTIC_REVIEW',
        elapsedMs: 100_000,
        operabilityOutcome: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        providerInvocations: 1,
        target1800SecondsMet: true,
        target300SecondsMet: true,
        target600SecondsMet: true,
        tokenUsage: null,
        viabilityDecision: null,
      }),
    );

    const prepared = await prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot });
    const packet = JSON.parse(await readFile(join(prepared.reviewDirectory, 'reviewer-a.packet.json'), 'utf8')) as {
      criteria: Array<{ id: string }>;
    };
    expect(JSON.stringify(packet)).not.toMatch(/gpt-5\.6-terra|xhigh|e19-|e20-|Luna|Terra/u);
    const accepted = packet.criteria.map((criterion) => ({
      criterionId: criterion.id,
      evidencePaths: ['/candidate/contracts'],
      rationale: 'The candidate preserves the observable contract.',
      verdict: 'ACCEPT',
    }));
    await Promise.all([
      writeFile(join(prepared.reviewDirectory, 'reviewer-a.input.json'), JSON.stringify({ judgments: accepted, reviewerId: 'reviewer-a' })),
      writeFile(join(prepared.reviewDirectory, 'reviewer-b.input.json'), JSON.stringify({ judgments: accepted, reviewerId: 'reviewer-b' })),
    ]);
    await prepareAuthorViabilityResolution({ repositoryRoot, reviewDirectory: prepared.reviewDirectory });
    const report = await scoreAuthorViability({
      outputPath: campaign.sanitizedReportPath,
      preparation: campaign,
      repositoryRoot,
    });

    expect(report).toMatchObject({
      authorCondition: { qualificationStatus: 'NOT_QUALIFIED', requestedModel: 'gpt-5.6-terra', requestedReasoning: 'xhigh' },
      decisionEligible: false,
      result: 'TERRA_PASSES_CURRENT_INSTRUMENT',
    });
  });

  it('allows only one concurrent reservation and therefore at most one invocation', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-operability-concurrent-'));
    const campaign = preparation();
    const skillRoot = join(repositoryRoot, campaign.skillPath);
    await mkdir(skillRoot, { recursive: true });
    await writeFile(join(skillRoot, 'SKILL.md'), '# Concurrent fixture\n');
    let invocations = 0;
    const invoke = (): Promise<AuthorInvocationResponse> => {
      invocations += 1;
      throw new AuthorProviderError({ category: 'PROCESS', code: 'EXIT_NONZERO', stage: 'RESULT' });
    };
    const input = {
      approval: '1',
      currentCommit: () => Promise.resolve(commit),
      expectedCommit: commit,
      inspectCampaign: () =>
        Promise.resolve({
          fingerprints: campaign.fingerprints,
          invocationConfigurationValid: true,
          packet: '{}',
          packetBlind: true,
        }),
      invoke,
      preparation: campaign,
      preflight: evaluateAuthorOperabilityPreflight(campaign, evidence()),
      repositoryRoot,
      workingTreeClean: () => Promise.resolve(true),
    } as const;

    const results = await Promise.allSettled([runAuthorOperabilityCampaign(input), runAuthorOperabilityCampaign(input)]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(invocations).toBe(1);
  });
});
