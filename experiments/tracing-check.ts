import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { withPromptfooIsolation } from './isolation.js';

interface TraceContext {
  evaluationId?: string;
  testCaseId?: string;
  traceparent?: string;
}

interface TraceSpan {
  attributes?: Record<string, unknown>;
  name?: string;
}

interface TraceRecord {
  spans?: TraceSpan[];
  traceId?: string;
}

interface TraceResult {
  getTraces?: () => Promise<TraceRecord[]>;
  toEvaluateSummary?: () => Promise<unknown>;
}

export interface TraceLifecycleQualification {
  documentationStable: false;
  integrationOperational: boolean;
  limitation: string;
  pinnedTypeDeclared: boolean;
  runtimeMethodPresent: boolean;
}

export const tracingGateWriteLatestResults = false;

function tracePayload(context: TraceContext): Record<string, unknown> {
  if (context.traceparent === undefined || context.evaluationId === undefined || context.testCaseId === undefined) {
    throw new Error('Promptfoo did not provide a correlated trace context to the local provider');
  }
  const [, traceId, parentSpanId] = context.traceparent.split('-');
  if (traceId === undefined || parentSpanId === undefined) {
    throw new Error('Promptfoo supplied an invalid traceparent');
  }
  const now = String(BigInt(Date.now()) * 1_000_000n);
  return {
    resourceSpans: [
      {
        resource: { attributes: [] },
        scopeSpans: [
          {
            scope: { name: 'skill-evidence-trace-check' },
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

async function pinnedTypeDeclaresGetTraces(root: string): Promise<boolean> {
  const declarations = await readFile(join(root, 'node_modules/promptfoo/dist/src/index.d.ts'), 'utf8');
  return declarations.includes('getTraces(): Promise<TraceData[]>');
}

export async function verifyTracingLifecycle(root: string): Promise<TraceLifecycleQualification> {
  const pinnedTypeDeclared = await pinnedTypeDeclaresGetTraces(root);
  let runtimeMethodPresent = false;
  let integrationOperational = false;
  await withPromptfooIsolation(async () => {
    const { evaluate } = await import('promptfoo');
    const provider = {
      callApi: async (_prompt: string, context?: TraceContext) => {
        const response = await fetch('http://127.0.0.1:4318/v1/traces', {
          body: JSON.stringify(tracePayload(context ?? {})),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('local Promptfoo receiver rejected the deterministic trace: ' + response.status);
        }
        return { output: 'TRACE_OK' };
      },
      id: () => 'local:skill-evidence-trace-check',
    };
    const result = (await evaluate(
      {
        prompts: ['Produce the deterministic local trace.'],
        providers: [provider],
        tests: [{ assert: [{ type: 'equals', value: 'TRACE_OK' }] }],
        tracing: {
          enabled: true,
          failOnReceiverStartFailure: true,
          otlp: { http: { acceptFormats: ['json'], enabled: true, host: '127.0.0.1', port: 4318 } },
        },
        writeLatestResults: tracingGateWriteLatestResults,
      },
      { cache: false, maxConcurrency: 1 },
    )) as TraceResult;
    if (typeof result.getTraces !== 'function' || typeof result.toEvaluateSummary !== 'function') {
      throw new Error('Promptfoo evaluate() did not return the documented evaluation lifecycle methods');
    }
    runtimeMethodPresent = true;
    await result.toEvaluateSummary();
    const traces = await result.getTraces();
    integrationOperational = traces.some(
      (trace) => typeof trace.traceId === 'string' && trace.spans?.some((span) => span.name === 'deterministic.command') === true,
    );
  });
  if (!integrationOperational) {
    throw new Error('Promptfoo getTraces() did not retrieve the deterministic correlated loopback span');
  }
  return {
    documentationStable: false,
    integrationOperational,
    limitation:
      'The pinned types and runtime expose getTraces(), but this Foundation has not established a stable public documentation reference.',
    pinnedTypeDeclared,
    runtimeMethodPresent,
  };
}
