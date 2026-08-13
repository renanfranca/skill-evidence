import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AuthorInvocationResponse } from '../src/author/evaluation-author.js';
import { AuthorProviderError } from '../src/author/provider-diagnostic.js';
import { runAuthorOperabilityPreflight } from '../src/qualification/preflight-author-operability.js';
import { qualifyAuthorOperabilityRunner } from '../src/qualification/qualify-author-operability.js';
import { runAuthorOperabilityCommand } from '../src/qualification/run-author-operability.js';
import {
  evaluateAuthorOperabilityPreflight,
  inspectAuthorOperabilityCampaign,
  runAuthorOperabilityCampaign,
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
      localProcessCalls: 3,
      purpose: 'DEVELOPMENT',
      result: 'SUPPORTED_FOR_DEVELOPMENT',
    });
    expect(report.cases).toEqual([
      {
        actual: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        expected: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
        id: 'completion',
      },
      { actual: 'INSUFFICIENT', expected: 'INSUFFICIENT', id: 'codex-turn-timeout' },
      { actual: 'INSUFFICIENT', expected: 'INSUFFICIENT', id: 'process-failure' },
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
