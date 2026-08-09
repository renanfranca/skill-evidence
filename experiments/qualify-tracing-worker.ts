import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson } from './canonical.js';
import { createE2PromptfooRuntimeCondition } from './configuration.js';
import { withPromptfooIsolation } from './isolation.js';
import { tracingQualificationConditions } from './qualify-tracing.js';
import type { TracingQualificationAttempt, TracingQualificationCondition } from './qualify-tracing.js';

interface TraceContext {
  evaluationId?: string;
  testCaseId?: string;
  traceparent?: string;
}

interface TraceSpan {
  name?: string;
}

interface TraceRecord {
  spans?: TraceSpan[];
}

interface TraceResult {
  getTraces?: () => Promise<TraceRecord[]>;
  toEvaluateSummary?: () => Promise<unknown>;
}

const e2RuntimeCondition = createE2PromptfooRuntimeCondition();

function tracePayload(context: TraceContext): Record<string, unknown> {
  if (context.traceparent === undefined || context.evaluationId === undefined || context.testCaseId === undefined) {
    throw new Error('missing correlated trace context');
  }
  const [, traceId, parentSpanId] = context.traceparent.split('-');
  if (traceId === undefined || parentSpanId === undefined) {
    throw new Error('invalid trace context');
  }
  const now = String(BigInt(Date.now()) * 1_000_000n);
  return {
    resourceSpans: [
      {
        resource: { attributes: [] },
        scopeSpans: [
          {
            scope: { name: 'skill-evidence-tracing-qualification' },
            spans: [
              {
                attributes: [
                  { key: 'evaluation.id', value: { stringValue: context.evaluationId } },
                  { key: 'test.case.id', value: { stringValue: context.testCaseId } },
                  { key: 'command', value: { stringValue: 'echo trace-check' } },
                ],
                endTimeUnixNano: now,
                kind: 1,
                name: 'deterministic.command',
                parentSpanId,
                spanId: '0123456789abcdef',
                startTimeUnixNano: now,
                status: { code: 1 },
                traceId,
              },
            ],
          },
        ],
      },
    ],
  };
}

async function promptfooVersion(root: string): Promise<string> {
  const packageJson: unknown = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8'));
  if (packageJson === null || typeof packageJson !== 'object' || typeof (packageJson as Record<string, unknown>).version !== 'string') {
    throw new Error('Promptfoo package version is unavailable');
  }
  return (packageJson as { version: string }).version;
}

async function pinnedTypeDeclaresGetTraces(root: string): Promise<boolean> {
  const declarations = await readFile(join(root, 'node_modules', 'promptfoo', 'dist', 'src', 'index.d.ts'), 'utf8');
  return declarations.includes('getTraces(): Promise<TraceData[]>');
}

function blockedAttempt(
  condition: TracingQualificationCondition,
  repetition: 1 | 2,
  version: string,
  typedGetTracesPresent: boolean,
): TracingQualificationAttempt {
  return {
    condition,
    correlatedSpanRecovered: false,
    promptfooVersion: version,
    providerCompleted: false,
    receiverAcceptedSpan: false,
    repetition,
    runtimeGetTracesPresent: false,
    status: 'BLOCKED',
    summaryAvailable: false,
    typedGetTracesPresent,
  };
}

async function qualifyAttempt(condition: TracingQualificationCondition, repetition: 1 | 2): Promise<TracingQualificationAttempt> {
  const root = process.cwd();
  let version = 'UNAVAILABLE';
  let typedGetTracesPresent = false;
  try {
    version = await promptfooVersion(root);
    typedGetTracesPresent = await pinnedTypeDeclaresGetTraces(root);
  } catch {
    return blockedAttempt(condition, repetition, version, typedGetTracesPresent);
  }

  let providerCompleted = false;
  let receiverAcceptedSpan = false;
  let runtimeGetTracesPresent = false;
  let summaryAvailable = false;
  let correlatedSpanRecovered = false;
  let infrastructureBlocked = false;
  try {
    await withPromptfooIsolation(async () => {
      const { evaluate } = await import('promptfoo');
      const provider = {
        callApi: async (_prompt: string, context?: TraceContext) => {
          try {
            const response = await fetch('http://127.0.0.1:4318/v1/traces', {
              body: JSON.stringify(tracePayload(context ?? {})),
              headers: { 'content-type': 'application/json' },
              method: 'POST',
            });
            receiverAcceptedSpan = response.ok;
            providerCompleted = true;
            return { output: response.ok ? 'TRACE_OK' : 'TRACE_REJECTED' };
          } catch (error) {
            infrastructureBlocked = true;
            throw error;
          }
        },
        id: () => 'local:skill-evidence-tracing-qualification',
      };
      const result = (await evaluate(
        {
          prompts: ['Produce the deterministic local trace.'],
          providers: [provider],
          tests: [{ assert: [{ type: 'equals', value: 'TRACE_OK' }] }],
          tracing: e2RuntimeCondition.tracing,
          sharing: condition.sharing,
          writeLatestResults: condition.writeLatestResults,
        },
        { cache: condition.cache, maxConcurrency: 1 },
      )) as TraceResult;
      runtimeGetTracesPresent = typeof result.getTraces === 'function';
      if (typeof result.toEvaluateSummary === 'function') {
        await result.toEvaluateSummary();
        summaryAvailable = true;
      }
      if (result.getTraces !== undefined) {
        const traces = await result.getTraces();
        correlatedSpanRecovered = traces.some((trace) => trace.spans?.some((span) => span.name === 'deterministic.command') === true);
      }
    });
  } catch {
    infrastructureBlocked = true;
  }

  const blocked = infrastructureBlocked || version !== '0.122.0' || !typedGetTracesPresent || !runtimeGetTracesPresent;
  return {
    condition,
    correlatedSpanRecovered,
    promptfooVersion: version,
    providerCompleted,
    receiverAcceptedSpan,
    repetition,
    runtimeGetTracesPresent,
    status: blocked ? 'BLOCKED' : correlatedSpanRecovered ? 'SUPPORTED' : 'UNSUPPORTED',
    summaryAvailable,
    typedGetTracesPresent,
  };
}

function parseArguments(): { condition: TracingQualificationCondition; repetition: 1 | 2 } {
  const conditionId = process.argv[2];
  const condition =
    conditionId === 'e2-exact' || conditionId === 'non-persisted-comparison' ? tracingQualificationConditions[conditionId] : undefined;
  const repetition = process.argv[3] === '1' ? 1 : process.argv[3] === '2' ? 2 : undefined;
  if (condition === undefined || repetition === undefined) {
    throw new Error('invalid tracing qualification worker arguments');
  }
  return { condition, repetition };
}

const request = parseArguments();
const result = await qualifyAttempt(request.condition, request.repetition);
if (process.send !== undefined) {
  process.send(result);
}
process.stdout.write(canonicalJson(result) + '\n');
