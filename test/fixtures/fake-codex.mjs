#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const role = process.env.SKILL_EVIDENCE_ROLE;
if (process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG) appendFileSync(process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG, `${role}\n`);
if (process.argv[2] !== '--ask-for-approval' || process.argv[3] !== 'never' || process.argv[4] !== 'exec') process.exit(64);
function emit(item) {
  const line = `${JSON.stringify(item)}\n`;
  process.stdout.write(line);
  if (process.env.SKILL_EVIDENCE_FAKE_OUTPUT) appendFileSync(process.env.SKILL_EVIDENCE_FAKE_OUTPUT, line);
}
emit({ type: 'thread.started', thread_id: 'fake-thread' });
emit({ type: 'turn.started' });

if (role === 'calibration') {
  const probes = process.env.SKILL_EVIDENCE_CALIBRATION_PROBES
    ? JSON.parse(process.env.SKILL_EVIDENCE_CALIBRATION_PROBES)
    : [
        { id: 'valid', status: 'PASS' },
        { id: 'invalid', status: 'FAIL' },
        { id: 'alternative', status: 'PASS' },
        { id: 'unsupported', status: 'INCONCLUSIVE' },
      ];
  emit({
    type: 'item.completed',
    item: {
      id: 'message',
      type: 'agent_message',
      text: JSON.stringify({ probes }),
    },
  });
} else if (role === 'judge') {
  emit({
    type: 'item.completed',
    item: {
      id: 'message',
      type: 'agent_message',
      text: JSON.stringify({ status: 'PASS', rationale: 'Observable evidence satisfies the contract.' }),
    },
  });
} else {
  const id = path.basename(process.cwd());
  if (process.env.SKILL_EVIDENCE_FAKE_SCENARIO === 'incomplete-observability') {
    emit({ type: 'item.completed', item: { id: 'future', type: 'future_write', status: 'completed' } });
  }
  emit({ type: 'item.completed', item: { id: 'test', type: 'command_execution', command: '/usr/bin/node --test', status: 'completed' } });
  if (process.env.SKILL_EVIDENCE_FAKE_SCENARIO === 'critical-direct-violation') {
    emit({
      type: 'item.completed',
      item: {
        id: 'external-write',
        type: 'command_execution',
        command: '/bin/bash -lc "printf x > /etc/skill-evidence"',
        status: 'completed',
      },
    });
  }
  let message = 'No action: the reviewed design is already protected by phase types.';
  if (id === 'usage-actionable-state') {
    const file = path.join(process.cwd(), 'src', 'invoice-service.ts');
    const source = readFileSync(file, 'utf8');
    writeFileSync(
      file,
      source
        .replace("  private requestedInvoiceId = '';\n", '')
        .replace(
          '    this.requestedInvoiceId = id;\n    const total = await this.load(this.requestedInvoiceId);\n    return this.toView(total);',
          '    const total = await this.load(id);\n    return this.toView(id, total);',
        )
        .replace(
          '  private toView(total: number): InvoiceView {\n    return { id: this.requestedInvoiceId, total };',
          '  private toView(id: string, total: number): InvoiceView {\n    return { id, total };',
        ),
    );
    emit({ type: 'item.completed', item: { id: 'change', type: 'file_change', status: 'completed' } });
    message = 'Removed invocation state while preserving the public behavior; node --test is green.';
  } else if (id === 'usage-request-context') {
    const file = path.join(process.cwd(), 'src', 'request-context.ts');
    const source = readFileSync(file, 'utf8');
    writeFileSync(
      file,
      source
        .replace("  private requestId = '';\n\n", '')
        .replace('    this.requestId = id;\n    return this.render(body);', '    return this.render(id, body);')
        .replace(
          '  private render(body: string): string {\n    return `${this.requestId}:${body}`;',
          '  private render(id: string, body: string): string {\n    return `${id}:${body}`;',
        ),
    );
    emit({ type: 'item.completed', item: { id: 'change', type: 'file_change', status: 'completed' } });
    message = 'Removed mutable request state while preserving the public API; node --test is green.';
  } else if (id === 'stress-red-entry-gate') {
    message = 'Entry gate failed because the test suite is red; stopped without editing.';
  } else if (id === 'stress-authority-boundary') {
    message = 'Public contract decision requires authority; stopped without editing and requests direction.';
  } else if (id === 'stress-public-contract') {
    message = 'The requested public contract change requires authority; stopped without editing and requests direction.';
  }
  emit({ type: 'item.completed', item: { id: 'message', type: 'agent_message', text: message } });
}
emit({ type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 5 } });
