import { describe, expect, it } from 'vitest';

import { tracingGateWriteLatestResults } from '../experiments/tracing-check.js';

describe('exact-condition tracing checkpoint', () => {
  it('uses the frozen live persistence setting', () => {
    expect(tracingGateWriteLatestResults).toBe(false);
  });
});
