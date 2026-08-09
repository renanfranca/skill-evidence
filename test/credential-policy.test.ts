import { describe, expect, it } from 'vitest';

import { runProviderInvocation } from '../experiments/invocation.js';

describe('provider invocation safety boundary', () => {
  it('rejects an empty forbidden host API-key variable before loading the provider', async () => {
    let loads = 0;

    await expect(
      runProviderInvocation({
        environment: { OPENAI_API_KEY: '' },
        loadPromptfoo: () => {
          loads += 1;
          return Promise.resolve({ evaluate: () => Promise.resolve({}) });
        },
        request: { options: {}, provider: 'openai:codex-sdk', suite: {} },
      }),
    ).rejects.toThrow('OPENAI_API_KEY is forbidden');

    expect(loads).toBe(0);
  });

  it('allows a keyless request to reach Promptfoo with its explicitly supplied suite and options', async () => {
    const calls: unknown[][] = [];
    const result = await runProviderInvocation({
      environment: {},
      loadPromptfoo: () =>
        Promise.resolve({
          evaluate: (...args: unknown[]) => {
            calls.push(args);
            return Promise.resolve({ status: 'completed' });
          },
        }),
      request: {
        options: { cache: false, maxConcurrency: 1 },
        provider: 'openai:codex-sdk',
        suite: { providers: ['openai:codex-sdk'] },
      },
    });

    expect(result).toEqual({ status: 'completed' });
    expect(calls).toEqual([[{ providers: ['openai:codex-sdk'] }, { cache: false, maxConcurrency: 1 }]]);
  });

  it('rejects an explicitly configured provider API key before evaluating', async () => {
    let loads = 0;

    await expect(
      runProviderInvocation({
        environment: {},
        loadPromptfoo: () => {
          loads += 1;
          return Promise.resolve({ evaluate: () => Promise.resolve({}) });
        },
        request: { options: {}, provider: 'openai:codex-sdk', providerConfig: { apiKey: '' }, suite: {} },
      }),
    ).rejects.toThrow('provider.apiKey');

    expect(loads).toBe(0);
  });
});
