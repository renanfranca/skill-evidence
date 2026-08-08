import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runCli } from '../experiments/cli.js';

describe('experimental command interface', () => {
  it('exposes an offline verification command that does not need an experiment login', async () => {
    const result = await runCli(['verify'], { environment: {}, root: process.cwd() });

    expect(result).toEqual({ output: 'offline verification passed; provider imports: 0', status: 0 });
  });

  it('uses the scientific configuration digest in each curated capability row', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skill-evidence-cli-report-'));
    const campaignDirectory = join(root, '.skill-evidence', 'campaigns', 'campaign-1');
    const canary = { effects: [], limitations: [], response: 'E2_CANARY_OK', status: 'PASS' };
    await mkdir(join(campaignDirectory, 'raw'), { recursive: true });
    await Promise.all([
      writeFile(join(campaignDirectory, 'freeze.json'), JSON.stringify({ scientificConfigurationDigest: 'scientific-digest' })),
      writeFile(join(campaignDirectory, 'e1-curated.json'), '{}'),
      writeFile(join(campaignDirectory, 'e2-baseline-curated.json'), JSON.stringify({ canary, workspaceAfter: { entries: {} } })),
      writeFile(join(campaignDirectory, 'e2-deep-curated.json'), JSON.stringify({ canary, workspaceAfter: { entries: {} } })),
      writeFile(join(campaignDirectory, 'raw', 'e2-baseline-summary.json'), JSON.stringify({ results: [{ response: {} }] })),
      writeFile(join(campaignDirectory, 'raw', 'e2-deep-summary.json'), JSON.stringify({ results: [{ response: {} }] })),
      writeFile(join(campaignDirectory, 'raw', 'e2-deep-traces.json'), '[]'),
    ]);

    await runCli(['report', '--campaign', 'campaign-1'], { environment: {}, root });

    const report = JSON.parse(await readFile(join(root, 'docs', 'experiments', 'campaign-1-capability-matrix.json'), 'utf8')) as Array<{
      versionFingerprint: string;
    }>;
    expect(report).not.toHaveLength(0);
    expect(report.every((row) => row.versionFingerprint === 'scientific-digest')).toBe(true);
  });
});
