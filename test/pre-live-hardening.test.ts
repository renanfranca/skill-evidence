import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { reserveProviderInvocation } from '../experiments/budget.js';
import { assertCampaignId, campaignArtifactPath } from '../experiments/campaign.js';
import { canonicalJson, sha256 } from '../experiments/canonical.js';
import { foundationConditions } from '../experiments/conditions.js';
import { sanitizeForPersistence } from '../experiments/redaction.js';
import { assessCanary, createSyntheticWorkspace, snapshotWorkspace } from '../experiments/workspace.js';

describe('pre-live instrument hardening', () => {
  it('fingerprints reasoning and deep OTEL settings as scientific configuration while preserving requested provenance', () => {
    const baseline = foundationConditions();
    const changedReasoning = structuredClone(baseline);
    Reflect.set(changedReasoning.invocations.e1.providerConfig, 'model_reasoning_effort', 'high');
    const changedOtel = structuredClone(baseline);
    changedOtel.invocations['e2-deep'].providerConfig.cli_config = {
      features: { multi_agent: false },
      otel: { exporter: 'otlp-http', log_user_prompt: false, otlp_http: { endpoint: 'http://127.0.0.1:4319/v1/logs', protocol: 'json' } },
    };

    expect(sha256(baseline)).not.toBe(sha256(changedReasoning));
    expect(sha256(baseline)).not.toBe(sha256(changedOtel));
    expect(
      sanitizeForPersistence({
        observedEffectiveReasoning: null,
        observedEffectiveReasoningReason: 'not exposed',
        raw: { reasoning: 'private' },
        requestedReasoning: 'max',
      }),
    ).toMatchObject({
      observedEffectiveReasoningReason: 'not exposed',
      requestedReasoning: 'max',
      raw: '<REDACTED>',
    });
  });

  it('rejects campaign paths that could escape experiment storage', () => {
    for (const campaign of ['../escape', 'UPPER', '-leading', 'trailing-', 'a'.repeat(65)]) {
      expect(() => assertCampaignId(campaign)).toThrow('campaign ID');
    }
    expect(() => campaignArtifactPath('/tmp/artifacts', '../escape', 'freeze.json')).toThrow('campaign ID');
  });

  it('creates one exclusive reservation under concurrent attempts and permits the three distinct conditions', async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-reservation-'));
    const concurrent = await Promise.allSettled(
      Array.from({ length: 8 }, () => reserveProviderInvocation({ artifactRoot, campaignId: 'campaign-1', kind: 'e1' })),
    );

    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    await expect(reserveProviderInvocation({ artifactRoot, campaignId: 'campaign-1', kind: 'e2-baseline' })).resolves.toMatchObject({
      totalStarted: 2,
    });
    await expect(reserveProviderInvocation({ artifactRoot, campaignId: 'campaign-1', kind: 'e2-deep' })).resolves.toMatchObject({
      totalStarted: 3,
    });
  });

  it('requires literal completion and every byte-exact filesystem effect before accepting the E2 canary', async () => {
    const workspace = await createSyntheticWorkspace();
    try {
      expect(assessCanary({ results: [{ response: { output: 'E2_CANARY_OK' } }] }, await snapshotWorkspace(workspace.path)).status).toBe(
        'INVALID_CANARY',
      );

      await writeFile(join(workspace.path, 'created-by-canary.txt'), 'CANARY_CREATED\n');
      await writeFile(join(workspace.path, 'target.txt'), 'AFTER\n');
      const valid = assessCanary({ results: [{ response: { output: 'E2_CANARY_OK' } }] }, await snapshotWorkspace(workspace.path));
      expect(valid.status).toBe('PASS');

      await writeFile(join(workspace.path, 'unexpected.txt'), 'unexpected\n');
      expect(assessCanary({ results: [{ response: { output: 'E2_CANARY_OK' } }] }, await snapshotWorkspace(workspace.path)).status).toBe(
        'INVALID_CANARY',
      );
    } finally {
      await workspace.dispose();
    }
  });

  it('leaves no raw reasoning in the persisted redaction projection', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-redaction-'));
    const artifact = join(root, 'artifact.json');
    const value = sanitizeForPersistence({ reasoning: 'private chain', tokenUsage: { completionDetails: { reasoning: 4 } } });
    await writeFile(artifact, canonicalJson(value));

    expect(await readFile(artifact, 'utf8')).not.toContain('private chain');
    expect(await readFile(artifact, 'utf8')).toContain('"reasoning":4');
  });
});
