import { describe, expect, it } from 'vitest';

import { verifyOffline } from '../experiments/verify.js';

describe('offline experiment checkpoint', () => {
  it('verifies the static safety boundary without loading Promptfoo', async () => {
    let imports = 0;

    const result = await verifyOffline({
      loadPromptfoo: () => {
        imports += 1;
        return Promise.reject(new Error('offline verification must not load Promptfoo'));
      },
    });

    expect(result).toEqual({ providerImports: 0, status: 'PASS' });
    expect(imports).toBe(0);
  });
});
