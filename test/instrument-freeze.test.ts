import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertFreezeCurrent, createInstrumentFreeze } from '../experiments/freeze.js';

describe('instrument freeze', () => {
  it('records normalized instrument provenance and rejects later lockfile drift', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-freeze-'));
    const artifacts = join(root, 'artifacts');
    const manifestPath = join(root, 'package.json');
    const lockfilePath = join(root, 'package-lock.json');
    await writeFile(manifestPath, JSON.stringify({ dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } }));
    await writeFile(
      lockfilePath,
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { dependencies: { '@openai/codex-sdk': '0.147.0', promptfoo: '0.122.0' } },
          'node_modules/@openai/codex': { version: '0.147.0' },
          'node_modules/@openai/codex-sdk': { version: '0.147.0' },
          'node_modules/promptfoo': { version: '0.122.0' },
        },
      }),
    );

    const freeze = await createInstrumentFreeze({
      artifactRoot: artifacts,
      campaignId: 'campaign-a',
      conditions: { externalCodexHome: '/private/login', model: 'gpt-5.6-luna' },
      lockfilePath,
      manifestPath,
      repositoryCommit: 'abc123',
    });

    expect(JSON.stringify(freeze)).toContain('<EXTERNAL_CODEX_HOME>');
    expect(JSON.stringify(freeze)).not.toContain('/private/login');
    expect(freeze.instrument).toEqual({ codexCli: '0.147.0', codexSdk: '0.147.0', promptfoo: '0.122.0' });
    expect(JSON.parse(await readFile(join(artifacts, 'campaigns', 'campaign-a', 'freeze.json'), 'utf8'))).toEqual(freeze);
    await expect(assertFreezeCurrent({ freeze, lockfilePath, manifestPath, repositoryCommit: 'abc123' })).resolves.toBeUndefined();

    await writeFile(lockfilePath, '{"lockfileVersion":3,"changed":true}');
    await expect(assertFreezeCurrent({ freeze, lockfilePath, manifestPath, repositoryCommit: 'abc123' })).rejects.toThrow(
      'instrument drift',
    );
  });
});
