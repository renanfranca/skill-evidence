import { access } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { withPromptfooIsolation } from '../experiments/isolation.js';

describe('Promptfoo process isolation', () => {
  it('sets dedicated storage and disables telemetry before the provider can be imported', async () => {
    const originalConfig = process.env.PROMPTFOO_CONFIG_DIR;

    await withPromptfooIsolation(async (environment) => {
      expect(environment.PROMPTFOO_DISABLE_TELEMETRY).toBe('true');
      expect(environment.PROMPTFOO_DISABLE_UPDATE).toBe('true');
      expect(environment.PROMPTFOO_CACHE_ENABLED).toBe('false');
      expect(environment.PROMPTFOO_CONFIG_DIR).toContain('skill-evidence-promptfoo-');
      await expect(access(environment.PROMPTFOO_CONFIG_DIR)).resolves.toBeUndefined();
    });

    expect(process.env.PROMPTFOO_CONFIG_DIR).toBe(originalConfig);
  });
});
