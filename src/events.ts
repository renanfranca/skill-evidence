import type { NormalizedEvent } from './types.js';

const knownTopLevel = new Set([
  'thread.started',
  'turn.started',
  'turn.completed',
  'turn.failed',
  'item.started',
  'item.updated',
  'item.completed',
  'error',
]);
const knownItems = new Set([
  'agent_message',
  'reasoning',
  'command_execution',
  'file_change',
  'mcp_tool_call',
  'web_search',
  'plan_update',
]);

export function normalizeJsonl(jsonl: string): {
  events: NormalizedEvent[];
  complete: boolean;
  finalMessage: string;
  usage: { input: number; output: number };
} {
  const events: NormalizedEvent[] = [];
  let complete = true;
  let finalMessage = '';
  let input = 0;
  let output = 0;
  for (const [index, line] of jsonl.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(line) as Record<string, unknown>;
    } catch {
      complete = false;
      continue;
    }
    const type = typeof raw.type === 'string' ? raw.type : 'unknown';
    if (!knownTopLevel.has(type)) complete = false;
    const item = raw.item && typeof raw.item === 'object' ? (raw.item as Record<string, unknown>) : undefined;
    const itemType = item ? (typeof item.type === 'string' ? item.type : 'unknown') : undefined;
    if (itemType === 'reasoning') continue;
    if (itemType && !knownItems.has(itemType)) complete = false;
    const event: NormalizedEvent = { sequence: index, type };
    if (itemType) event.itemType = itemType;
    if (typeof item?.command === 'string') event.command = item.command;
    if (typeof item?.status === 'string') event.status = item.status;
    if (itemType === 'agent_message' && typeof item?.text === 'string') {
      event.message = item.text;
      finalMessage = item.text;
    }
    events.push(event);
    if (raw.usage && typeof raw.usage === 'object') {
      const usage = raw.usage as Record<string, unknown>;
      input += Number(usage.input_tokens ?? 0);
      output += Number(usage.output_tokens ?? 0);
    }
  }
  return { events, complete, finalMessage, usage: { input, output } };
}
