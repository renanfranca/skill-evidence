#!/usr/bin/env node

'use strict';

const { appendFileSync } = require('node:fs');

const scenario = process.env.SKILL_EVIDENCE_FAKE_CODEX_SCENARIO;
const ledger = process.env.SKILL_EVIDENCE_FAKE_CODEX_LEDGER;
const output = process.env.SKILL_EVIDENCE_FAKE_CODEX_OUTPUT;

if (!ledger || !scenario || process.argv[2] !== 'exec' || process.argv[3] !== '--experimental-json') {
  process.stderr.write('Invalid deterministic Codex fixture configuration.\n');
  process.exitCode = 2;
} else {
  appendFileSync(ledger, `${scenario}\n`, 'utf8');
  process.stdin.resume();
  process.stdin.on('end', () => {
    if (scenario === 'process') {
      process.stderr.write('Codex Exec failed in the deterministic local fixture\n');
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`${JSON.stringify({ thread_id: 'local-diagnostic-thread', type: 'thread.started' })}\n`);
    process.stdout.write(`${JSON.stringify({ type: 'turn.started' })}\n`);
    if (scenario === 'success') {
      process.stdout.write(
        `${JSON.stringify({ item: { id: 'local-diagnostic-message', text: output, type: 'agent_message' }, type: 'item.completed' })}\n`,
      );
      process.stdout.write(
        `${JSON.stringify({
          type: 'turn.completed',
          usage: {
            cached_input_tokens: 0,
            cache_write_input_tokens: 0,
            input_tokens: 1,
            output_tokens: 1,
            reasoning_output_tokens: 0,
          },
        })}\n`,
      );
      return;
    }

    const messages = {
      authentication: 'HTTP 401 authentication failed in the deterministic local fixture',
      'model-access': 'HTTP 404 model gpt-5.6-terra unavailable in the deterministic local fixture',
      'rate-limit': 'HTTP 429 rate limit in the deterministic local fixture',
      timeout: 'request aborted after timeout in the deterministic local fixture',
    };
    const message = messages[scenario] ?? 'unclassified local fixture failure';
    process.stdout.write(`${JSON.stringify({ error: { message }, type: 'turn.failed' })}\n`);
  });
}
