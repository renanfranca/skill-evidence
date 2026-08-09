import { access, writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { withPromptfooIsolation } from '../experiments/isolation.js';

describe('Promptfoo process isolation', () => {
  it('sets dedicated storage and disables telemetry before the provider can be imported', async () => {
    const originalConfig = process.env.PROMPTFOO_CONFIG_DIR;
    let databasePath = '';

    await withPromptfooIsolation(async (environment, storage) => {
      expect(environment.PROMPTFOO_DISABLE_TELEMETRY).toBe('true');
      expect(environment.PROMPTFOO_DISABLE_UPDATE).toBe('true');
      expect(environment.PROMPTFOO_CACHE_ENABLED).toBe('false');
      expect(environment.PROMPTFOO_CONFIG_DIR).toContain('skill-evidence-promptfoo-');
      expect(storage.databasePath).toBe(`${environment.PROMPTFOO_CONFIG_DIR}/promptfoo.db`);
      databasePath = storage.databasePath;
      await writeFile(databasePath, 'temporary database');
      await expect(access(environment.PROMPTFOO_CONFIG_DIR)).resolves.toBeUndefined();
      await expect(access(databasePath)).resolves.toBeUndefined();
    });

    expect(process.env.PROMPTFOO_CONFIG_DIR).toBe(originalConfig);
    await expect(access(databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('removes the temporary database when the isolated operation fails', async () => {
    let databasePath = '';

    await expect(
      withPromptfooIsolation(async (_environment, storage) => {
        databasePath = storage.databasePath;
        await writeFile(databasePath, 'temporary database');
        throw new Error('operation failed');
      }),
    ).rejects.toThrow('operation failed');

    await expect(access(databasePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
