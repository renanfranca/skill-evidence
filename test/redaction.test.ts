import { describe, expect, it } from 'vitest';

import { sanitizeForPersistence } from '../experiments/redaction.js';

describe('persistence redaction', () => {
  it('redacts credentials and external paths without discarding provider token usage', () => {
    expect(
      sanitizeForPersistence(
        { OPENAI_API_KEY: 'secret', accessToken: 'secret', tokenUsage: { total: 7 }, workspace: '/private/dedicated-login/workspace' },
        '/private/dedicated-login',
      ),
    ).toEqual({
      OPENAI_API_KEY: '<REDACTED>',
      accessToken: '<REDACTED>',
      tokenUsage: { total: 7 },
      workspace: '<EXTERNAL_CODEX_HOME>/workspace',
    });
  });

  it('never persists raw reasoning text', () => {
    expect(sanitizeForPersistence({ reasoning: 'private chain', tokenUsage: { completionDetails: { reasoning: 3 } } })).toEqual({
      reasoning: '<REDACTED>',
      tokenUsage: { completionDetails: { reasoning: 3 } },
    });
  });

  it('preserves structured provider-reported reasoning metadata while redacting raw reasoning text', () => {
    expect(sanitizeForPersistence({ model_reasoning_effort: 'max', reasoning: 'private chain' })).toEqual({
      model_reasoning_effort: 'max',
      reasoning: '<REDACTED>',
    });
  });
});
