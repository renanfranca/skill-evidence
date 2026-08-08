import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { foundationConditions } from '../experiments/conditions.js';
import { createInstrumentFreeze } from '../experiments/freeze.js';
import { runLiveExperiment } from '../experiments/run.js';

function resolvedLockfile(): string {
  return JSON.stringify({
    lockfileVersion: 3,
    packages: {
      'node_modules/@openai/codex': { version: '0.147.0' },
      'node_modules/@openai/codex-sdk': { version: '0.147.0' },
      'node_modules/promptfoo': { version: '0.122.0' },
    },
  });
}

describe('live E1 orchestration', () => {
  it('freezes first, records one started invocation, and curates the provider summary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'c1',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });
    let loads = 0;

    const result = await runLiveExperiment({
      artifactRoot: root,
      campaignId: 'c1',
      environment: {},
      externalCodexHome,
      kind: 'e1',
      loadPromptfoo: () => {
        loads += 1;
        return Promise.resolve({
          evaluate: () =>
            Promise.resolve({
              toEvaluateSummary: () => Promise.resolve({ results: [{ response: { output: 'E1_AUTH_OK' } }] }),
            }),
        });
      },
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
    });

    expect(loads).toBe(1);
    expect(result.status).toBe('PASS');
    expect(JSON.parse(await readFile(join(root, 'campaigns', 'c1', 'budget-ledger.json'), 'utf8'))).toMatchObject({
      reservations: ['e1'],
    });
    expect(await readFile(join(root, 'campaigns', 'c1', 'e1-curated.json'), 'utf8')).not.toContain(externalCodexHome);
  });

  it('fails closed on a forbidden host key before spending the E1 invocation budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-key-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, '{}');
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'c2',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });
    let loads = 0;

    await expect(
      runLiveExperiment({
        artifactRoot: root,
        campaignId: 'c2',
        environment: { OPENAI_API_KEY: '' },
        externalCodexHome,
        kind: 'e1',
        loadPromptfoo: () => {
          loads += 1;
          return Promise.reject(new Error('must not load'));
        },
        lockfilePath,
        manifestPath,
        repositoryCommit: 'abc123',
      }),
    ).rejects.toThrow('OPENAI_API_KEY is forbidden');

    expect(loads).toBe(0);
    await expect(readFile(join(root, 'campaigns', 'c2', 'budget-ledger.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses the deep invocation before loading a provider when the baseline canary is absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-deep-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'c3',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });
    let loads = 0;

    await expect(
      runLiveExperiment({
        artifactRoot: root,
        campaignId: 'c3',
        environment: {},
        externalCodexHome,
        kind: 'e2-deep',
        loadPromptfoo: () => {
          loads += 1;
          return Promise.reject(new Error('must not load'));
        },
        lockfilePath,
        manifestPath,
        repositoryCommit: 'abc123',
      }),
    ).rejects.toThrow('valid baseline E2 canary');

    expect(loads).toBe(0);
  });
});
