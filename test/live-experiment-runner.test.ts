import { access, chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../experiments/canonical.js';
import { foundationConditions } from '../experiments/conditions.js';
import { createInstrumentFreeze } from '../experiments/freeze.js';
import { sanitizeForPersistence } from '../experiments/redaction.js';
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

  it('canonically persists undefined Promptfoo fields while preserving the provider error and G1 ERROR', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-provider-error-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    const providerError = 'failed to initialize the in-process app-server client';
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'provider-error',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });

    const result = await runLiveExperiment({
      artifactRoot: root,
      campaignId: 'provider-error',
      environment: {},
      externalCodexHome,
      kind: 'e1',
      loadPromptfoo: () =>
        Promise.resolve({
          evaluate: () =>
            Promise.resolve({
              toEvaluateSummary: () =>
                Promise.resolve({
                  optional: undefined,
                  results: [
                    {
                      optional: undefined,
                      response: {
                        diagnostics: [
                          undefined,
                          {
                            apiKey: 'sensitive-key',
                            reasoning: 'private chain',
                            source: externalCodexHome,
                            tokenUsage: { completionDetails: { reasoning: 7 } },
                          },
                        ],
                        error: providerError,
                        optional: undefined,
                      },
                    },
                  ],
                }),
            }),
        }),
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
    });

    const summaryText = await readFile(join(root, 'campaigns', 'provider-error', 'raw', 'e1-summary.json'), 'utf8');
    const summary = JSON.parse(summaryText) as { results: Array<{ response: { diagnostics: unknown[]; error: string } }> };
    const report = JSON.parse(await readFile(join(root, 'campaigns', 'provider-error', 'e1-curated.json'), 'utf8')) as {
      g1: string;
      providerError: string;
    };
    expect(summaryText).toBe(canonicalJson(summary) + '\n');
    expect(summary).toEqual({
      results: [
        {
          response: {
            diagnostics: [
              null,
              {
                apiKey: '<REDACTED>',
                reasoning: '<REDACTED>',
                source: '<EXTERNAL_CODEX_HOME>',
                tokenUsage: { completionDetails: { reasoning: 7 } },
              },
            ],
            error: providerError,
          },
        },
      ],
    });
    expect(result).toMatchObject({ status: 'ERROR' });
    expect(report).toMatchObject({ g1: 'ERROR', providerError });
    expect(summaryText).not.toContain('sensitive-key');
    expect(summaryText).not.toContain('private chain');
    expect(summaryText).not.toContain(externalCodexHome);
    expect(sanitizeForPersistence(undefined)).toBeNull();
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

  it('rejects a non-writable external CODEX_HOME before loading Promptfoo or reserving budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-read-only-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'read-only-home',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });
    let loads = 0;
    await chmod(externalCodexHome, 0o500);

    try {
      const rejection = await runLiveExperiment({
        artifactRoot: root,
        campaignId: 'read-only-home',
        environment: {},
        externalCodexHome,
        kind: 'e1',
        loadPromptfoo: () => {
          loads += 1;
          return Promise.reject(new Error('must not load'));
        },
        lockfilePath,
        manifestPath,
        repositoryCommit: 'abc123',
      }).then(
        () => undefined,
        (error: unknown) => error,
      );

      expect(rejection).toBeInstanceOf(Error);
      expect((rejection as Error).message).toBe('external CODEX_HOME is not writable: read-only filesystem or insufficient permissions');
      expect((rejection as Error).message).not.toContain(externalCodexHome);
      expect(loads).toBe(0);
      await expect(readFile(join(root, 'campaigns', 'read-only-home', 'reservations', 'e1.json'), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await expect(readFile(join(root, 'campaigns', 'read-only-home', 'budget-ledger.json'), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await chmod(externalCodexHome, 0o700);
    }
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

  it('retains sanitized E2 summary and traces before removing the temporary Promptfoo database', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-runner-retention-'));
    const externalCodexHome = join(root, 'dedicated-login');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await mkdir(externalCodexHome);
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(lockfilePath, resolvedLockfile());
    await createInstrumentFreeze({
      artifactRoot: root,
      campaignId: 'c4',
      externalCodexHome,
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
      scientificConfiguration: foundationConditions(),
    });
    let databasePath = '';

    const result = await runLiveExperiment({
      artifactRoot: root,
      campaignId: 'c4',
      environment: {},
      externalCodexHome,
      kind: 'e2-baseline',
      loadPromptfoo: () =>
        Promise.resolve({
          evaluate: async (suite: unknown) => {
            const invocation = suite as { providers: Array<{ config: { working_dir: string } }> };
            const workspace = invocation.providers[0]?.config.working_dir;
            if (workspace === undefined || process.env.PROMPTFOO_CONFIG_DIR === undefined) {
              throw new Error('isolated E2 paths were unavailable');
            }
            databasePath = join(process.env.PROMPTFOO_CONFIG_DIR, 'promptfoo.db');
            await Promise.all([
              writeFile(databasePath, 'temporary database'),
              writeFile(join(workspace, 'created-by-canary.txt'), 'CANARY_CREATED\n'),
              writeFile(join(workspace, 'target.txt'), 'AFTER\n'),
            ]);
            return {
              getTraces: () => Promise.resolve([{ raw: 'private trace', source: externalCodexHome }]),
              toEvaluateSummary: () =>
                Promise.resolve({
                  results: [{ response: { output: 'E2_CANARY_OK', reasoning: 'private chain', source: externalCodexHome } }],
                }),
            };
          },
        }),
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
    });

    const summary = await readFile(join(root, 'campaigns', 'c4', 'raw', 'e2-baseline-summary.json'), 'utf8');
    const traces = await readFile(join(root, 'campaigns', 'c4', 'raw', 'e2-baseline-traces.json'), 'utf8');
    expect(result.status).toBe('PASS');
    expect(summary).toContain('E2_CANARY_OK');
    expect(summary).not.toContain('private chain');
    expect(traces).not.toContain('private trace');
    expect(summary + traces).not.toContain(externalCodexHome);
    await expect(access(databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
