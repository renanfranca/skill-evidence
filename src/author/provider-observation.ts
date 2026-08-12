import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { AuthorProviderObservation } from './provider-diagnostic.js';

export interface CodexObservationSession {
  codexPathOverride: string;
  environment: Record<string, string>;
  journalPath: string;
}

interface ObservationEvent {
  atMs: number;
  eventType?: string;
  type: string;
}

const proxySource = `#!/usr/bin/env node
'use strict';
const { appendFileSync } = require('node:fs');
const { spawn } = require('node:child_process');
const journal = process.env.SKILL_EVIDENCE_CODEX_OBSERVATION_JOURNAL;
const target = process.env.SKILL_EVIDENCE_CODEX_OBSERVATION_TARGET;
if (!journal || !target) process.exit(2);
const startedAt = Date.now();
const record = (entry) => appendFileSync(journal, JSON.stringify({ atMs: Math.max(0, Date.now() - startedAt), ...entry }) + '\\n', 'utf8');
const eventTypes = new Set(['error', 'item.completed', 'item.started', 'item.updated', 'thread.started', 'turn.completed', 'turn.failed', 'turn.started']);
record({ type: 'PROCESS_STARTED' });
const child = spawn(target, process.argv.slice(2), { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
process.stdin.pipe(child.stdin);
let pending = '';
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  pending += chunk.toString('utf8');
  const lines = pending.split(/\\r?\\n/u);
  pending = lines.pop() || '';
  for (const line of lines) {
    try {
      const value = JSON.parse(line);
      record({ eventType: typeof value.type === 'string' && eventTypes.has(value.type) ? value.type : 'unknown', type: 'CODEX_EVENT' });
    } catch { record({ eventType: 'unparseable', type: 'CODEX_EVENT' }); }
  }
});
child.stderr.pipe(process.stderr);
const forward = (signal) => {
  record({ type: 'CANCELLATION_OBSERVED' });
  if (!child.killed) child.kill(signal);
};
process.on('SIGTERM', () => forward('SIGTERM'));
process.on('SIGINT', () => forward('SIGINT'));
child.on('error', () => { record({ type: 'PROCESS_ERROR' }); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  record({ eventType: signal ? 'signal' : code === 0 ? 'zero' : 'nonzero', type: 'PROCESS_EXIT' });
  process.exitCode = code === null ? 1 : code;
});
`;

export async function createCodexObservationSession(input: {
  codexExecutable: string;
  directory: string;
  environment?: Record<string, string>;
}): Promise<CodexObservationSession> {
  const codexPathOverride = join(input.directory, 'codex-observation-proxy.cjs');
  const journalPath = join(input.directory, 'codex-observation.ndjson');
  await writeFile(codexPathOverride, proxySource, { flag: 'wx' });
  await chmod(codexPathOverride, 0o700);
  return {
    codexPathOverride,
    environment: {
      ...(input.environment ?? {}),
      SKILL_EVIDENCE_CODEX_OBSERVATION_JOURNAL: journalPath,
      SKILL_EVIDENCE_CODEX_OBSERVATION_TARGET: input.codexExecutable,
    },
    journalPath,
  };
}

function parseEvents(text: string): ObservationEvent[] {
  return text
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const value = JSON.parse(line) as unknown;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
        const event = value as Record<string, unknown>;
        return typeof event.type === 'string' && typeof event.atMs === 'number' && Number.isFinite(event.atMs)
          ? [
              {
                atMs: Math.max(0, event.atMs),
                ...(typeof event.eventType === 'string' ? { eventType: event.eventType } : {}),
                type: event.type,
              },
            ]
          : [];
      } catch {
        return [];
      }
    });
}

function observationStage(events: ObservationEvent[]): AuthorProviderObservation['lastObservedStage'] {
  const terminal = events.findLast(
    (event) => event.type === 'CODEX_EVENT' && (event.eventType === 'turn.completed' || event.eventType === 'turn.failed'),
  );
  if (terminal?.eventType === 'turn.completed') return 'TURN_COMPLETED';
  if (terminal?.eventType === 'turn.failed') return 'TURN_FAILED';
  const last = events.at(-1);
  if (last === undefined) return 'NONE';
  if (last.type === 'PROCESS_EXIT') return 'PROCESS_EXIT';
  if (last.type !== 'CODEX_EVENT') return last.type === 'PROCESS_STARTED' ? 'PROCESS' : 'UNKNOWN';
  if (last.eventType === 'thread.started') return 'THREAD';
  if (last.eventType === 'turn.started') return 'TURN';
  if (last.eventType === 'turn.completed') return 'TURN_COMPLETED';
  if (last.eventType === 'turn.failed') return 'TURN_FAILED';
  return last.eventType?.startsWith('item.') === true ? 'ACTIVITY' : 'UNKNOWN';
}

export async function readCodexObservation(
  session: CodexObservationSession,
  terminalMessage: string | null,
): Promise<AuthorProviderObservation> {
  const normalized = terminalMessage?.toLowerCase() ?? '';
  const promptfooStep = normalized.includes('evaluation timed out after');
  const promptfooEvaluation = normalized.includes('evaluation exceeded max duration');
  const codexTurn = normalized.includes('codex turn failed') && /abort|timed?\s*out|timeout/u.test(normalized);
  const cancellationRequested = promptfooStep || promptfooEvaluation;
  let events: ObservationEvent[] | null = null;
  for (let attempt = 0; attempt < (cancellationRequested ? 10 : 1); attempt += 1) {
    try {
      events = parseEvents(await readFile(session.journalPath, 'utf8'));
    } catch {
      events = null;
    }
    if (!cancellationRequested || events?.some((event) => event.type === 'CANCELLATION_OBSERVED') === true) break;
    await delay(25);
  }
  const progress = events?.filter((event) => event.type === 'CODEX_EVENT') ?? null;
  const processSignalObserved = events?.some((event) => event.type === 'CANCELLATION_OBSERVED') ?? null;
  return {
    cancellationObserved: processSignalObserved === null ? null : cancellationRequested && processSignalObserved,
    cancellationRequested,
    firstProgressAtMs: progress === null || progress.length === 0 ? null : progress[0]!.atMs,
    lastObservedStage: events === null ? 'UNKNOWN' : observationStage(events),
    lastProgressAtMs: progress === null || progress.length === 0 ? null : progress.at(-1)!.atMs,
    progressObserved: progress === null ? null : progress.length > 0,
    timeoutOwner: promptfooStep
      ? 'PROMPTFOO_STEP'
      : promptfooEvaluation
        ? 'PROMPTFOO_EVALUATION'
        : codexTurn
          ? 'CODEX_TURN'
          : normalized.includes('timeout') || normalized.includes('abort')
            ? 'UNKNOWN'
            : null,
  };
}
