import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createSyntheticWorkspace, snapshotWorkspace } from '../experiments/workspace.js';

describe('E2 synthetic workspace', () => {
  it('creates independent ground truth for the canary before any provider invocation', async () => {
    const workspace = await createSyntheticWorkspace();
    try {
      await expect(access(join(workspace.path, '.git'))).resolves.toBeUndefined();
      expect(workspace.instructions).toContain('SKILL.md');
      expect(workspace.instructions).toContain('E2_CANARY_OK');
      expect(workspace.before.entries['created-by-canary.txt']).toEqual({ exists: false });

      await writeFile(join(workspace.path, 'created-by-canary.txt'), 'CANARY_CREATED\n');
      const after = await snapshotWorkspace(workspace.path);

      expect(after.entries['created-by-canary.txt']?.exists).toBe(true);
      expect(await readFile(join(workspace.path, 'marker.txt'), 'utf8')).toContain('E2_CANARY_MARKER');
    } finally {
      await workspace.dispose();
    }
  });
});
