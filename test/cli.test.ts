import { describe, expect, it } from 'vitest';

import { runCli } from '../experiments/cli.js';

describe('experimental command interface', () => {
  it('exposes an offline verification command that does not need an experiment login', async () => {
    const result = await runCli(['verify'], { environment: {}, root: process.cwd() });

    expect(result).toEqual({ output: 'offline verification passed; provider imports: 0', status: 0 });
  });
});
