import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('pull request validation', () => {
  it('runs the deterministic repository checks with a bounded read-only workflow', async () => {
    const [workflow, packageText] = await Promise.all([
      readFile(join(process.cwd(), '.github', 'workflows', 'ci.yml'), 'utf8'),
      readFile(join(process.cwd(), 'package.json'), 'utf8'),
    ]);
    const packageManifest = JSON.parse(packageText) as { scripts: Record<string, string> };

    expect(workflow).toMatch(/^on:\n {2}pull_request:\s*$/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(workflow).not.toMatch(/permissions:[\s\S]*?\bwrite\b|\$\{\{\s*secrets\./);
    expect(workflow).toContain('timeout-minutes: 20');
    expect(workflow).toContain('uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1');
    expect(workflow).toContain('uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0');
    expect(workflow).toContain('node-version: 24');
    expect(workflow).toContain('cache: npm');

    const commands = [...workflow.matchAll(/^\s+run: (.+)$/gm)].map((match) => match[1]);
    expect(commands).toEqual([
      'npm ci',
      'npm audit',
      'npm run typecheck',
      'npm run lint',
      'npm test',
      'npm run prettier:check',
      'npm run build',
      'npm run experiment:verify',
      'npm run experiment:qualify:archaeological',
    ]);
    expect(packageManifest.scripts['prettier:check']).toContain('.github');
    expect(packageManifest.scripts['prettier:format']).toContain('.github');
  });
});
