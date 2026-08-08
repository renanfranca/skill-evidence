import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { reserveProviderInvocation } from '../experiments/budget.js';

describe('campaign invocation budget', () => {
  it('records an invocation before it starts and refuses a retry for the same condition', async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-budget-'));

    await expect(reserveProviderInvocation({ artifactRoot, campaignId: 'c1', kind: 'e1' })).resolves.toEqual({
      attempt: 1,
      totalStarted: 1,
    });
    expect(JSON.parse(await readFile(join(artifactRoot, 'campaigns', 'c1', 'budget-ledger.json'), 'utf8'))).toMatchObject({
      started: [{ attempt: 1, kind: 'e1' }],
    });
    await expect(reserveProviderInvocation({ artifactRoot, campaignId: 'c1', kind: 'e1' })).rejects.toThrow('already started');
  });
});
