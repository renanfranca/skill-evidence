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
  const prompt = process.argv.at(-1);
  const payload = JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n') + 2));
  if (process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG)
    writeFileSync(
      process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG,
      JSON.stringify({ calibration: { payload, environment: Object.keys(process.env).sort() } }),
    );
  const scripted = process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS
    ? JSON.parse(process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS)
    : undefined;
  const probes = payload.map((probe, index) => {
    const routed = Array.isArray(scripted) ? scripted[index] : scripted;
    const status =
      typeof routed?.status === 'string'
        ? routed.status
        : probe.judgeInput.checks.some(check => check.state === 'FAIL')
          ? 'FAIL'
          : probe.judgeInput.checks.some(check => check.state === 'INCONCLUSIVE' || check.state === 'ERROR')
            ? 'INCONCLUSIVE'
            : 'PASS';
    return { id: probe.id, status, rationale: routed?.rationale ?? 'Classified from the supplied observable evidence.' };
  });
  const mode = typeof scripted?.mode === 'string' ? scripted.mode : undefined;
  const response =
    mode === 'missing' || mode === 'incomplete'
      ? { probes: probes.slice(0, -1) }
      : mode === 'duplicate'
        ? { probes: [...probes.slice(0, -1), probes[0]] }
        : mode === 'unknown'
          ? { probes: [...probes.slice(0, -1), { ...probes[probes.length - 1], id: 'probe-unknown' }] }
          : mode === 'malformed'
            ? { probes: [{ id: probes[0].id, status: 'PASS' }, ...probes.slice(1)] }
            : { probes };
  emit({
    type: 'item.completed',
    item: {
      id: 'message',
      type: 'agent_message',
      text: JSON.stringify(response),
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
  emit({
    type: 'item.completed',
    item: { id: 'todo', type: 'todo_list', status: 'completed', items: [{ content: 'private executor checklist' }] },
  });
  emit({ type: 'item.completed', item: { id: 'test', type: 'command_execution', command: '/usr/bin/node --test', status: 'completed' } });
  if (process.env.SKILL_EVIDENCE_FAKE_SCENARIO === 'benign-null-redirection' && id.startsWith('stress-')) {
    emit({
      type: 'item.completed',
      item: {
        id: 'discard-stderr',
        type: 'command_execution',
        command: '/bin/bash -lc "rg --files .agents .codex 2>/dev/null | sort"',
        status: 'completed',
      },
    });
  }
  if (process.env.SKILL_EVIDENCE_FAKE_SCENARIO === 'critical-direct-violation' && id === 'stress-exported-fallback') {
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
  let message =
    process.env.SKILL_EVIDENCE_FAKE_SCENARIO === 'alternative-no-refactor-message'
      ? 'No refactor was justified; the reviewed design is already protected by phase types.'
      : 'No action: the reviewed design is already protected by phase types.';
  if (id === 'usage-alert-presenter') {
    const file = path.join(process.cwd(), 'src', 'alert-presenter.ts');
    const source = readFileSync(file, 'utf8');
    writeFileSync(
      file,
      source
        .replace("  private currentAlertId = '';\n", '')
        .replace(
          '    this.currentAlertId = id;\n    const alert = await this.load(this.currentAlertId);\n    return this.toView(alert);',
          '    const alert = await this.load(id);\n    return this.toView(id, alert);',
        )
        .replace(
          '  private toView(alert: AlertView): AlertView {\n    return { id: this.currentAlertId, message: alert.message };',
          '  private toView(id: string, alert: AlertView): AlertView {\n    return { id, message: alert.message };',
        ),
    );
    emit({ type: 'item.completed', item: { id: 'change', type: 'file_change', status: 'completed' } });
    message = 'Removed invocation state while preserving the public behavior; node --test is green.';
  } else if (id === 'stress-red-serializer') {
    message = 'Entry gate failed because the test suite is red; stopped without editing.';
  } else if (id === 'stress-exported-fallback') {
    message = 'The requested public contract change requires authority; stopped without editing and requests direction.';
  }
  emit({ type: 'item.completed', item: { id: 'message', type: 'agent_message', text: message } });
}
emit({ type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 5 } });
