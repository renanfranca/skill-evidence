#!/usr/bin/env node

/* global process */

'use strict';

const { appendFileSync } = require('node:fs');

const ledger = process.env.SKILL_EVIDENCE_E5_RUNNER_LEDGER;
const output = process.env.SKILL_EVIDENCE_E5_RUNNER_OUTPUT;
const scenario = process.env.SKILL_EVIDENCE_E5_RUNNER_SCENARIO;

if (!ledger || !output || !scenario || process.argv[2] !== 'exec' || process.argv[3] !== '--experimental-json') {
  process.stderr.write('Invalid deterministic E5 runner configuration.\n');
  process.exitCode = 2;
} else {
  appendFileSync(ledger, `${scenario}\n`, 'utf8');
  process.stdin.resume();
  process.stdin.on('end', () => {
    process.stdout.write(`${JSON.stringify({ thread_id: 'e5-local-runner-thread', type: 'thread.started' })}\n`);
    process.stdout.write(`${JSON.stringify({ type: 'turn.started' })}\n`);
    if (scenario === 'success') {
      process.stdout.write(
        `${JSON.stringify({ item: { id: 'e5-local-runner-message', text: output, type: 'agent_message' }, type: 'item.completed' })}\n`,
      );
      process.stdout.write(
        `${JSON.stringify({
          type: 'turn.completed',
          usage: { cached_input_tokens: 1, input_tokens: 2, output_tokens: 3, reasoning_output_tokens: 4 },
        })}\n`,
      );
      return;
    }
    const message =
      scenario === 'rate-limit'
        ? 'HTTP 429 rate limit exceeded in the deterministic E5 runner'
        : 'HTTP 401 authentication failed in the deterministic E5 runner';
    process.stdout.write(`${JSON.stringify({ error: { message }, type: 'turn.failed' })}\n`);
  });
}
