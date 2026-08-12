import type { AuthorInvocationRequest, AuthorInvocationResponse, AuthorInvoker, AuthorTokenUsage } from './evaluation-author.js';
import { AuthorProviderError, diagnoseProviderFailure } from './provider-diagnostic.js';
import { readCodexObservation, type CodexObservationSession } from './provider-observation.js';

export interface CreateAuthorPromptfooInvocationInput {
  codexHome: string;
  localDiagnostic?: AuthorLocalDiagnosticOverride;
  observation?: CodexObservationSession;
  request: AuthorInvocationRequest;
  timeouts?: { maxEvalTimeMs: number; timeoutMs: number };
  workingDirectory: string;
}

export interface AuthorLocalDiagnosticOverride {
  codexPathOverride: string;
  environment: Record<string, string>;
}

export interface AuthorPromptfooInvocation {
  options: { cache: false; maxConcurrency: 1; maxEvalTimeMs: number; silent: true; timeoutMs: number };
  suite: {
    prompts: [string];
    providers: Array<{
      config: {
        approval_policy: 'never';
        cli_config: { features: { multi_agent: false } };
        cli_env: Record<string, string>;
        codex_path_override?: string;
        deep_tracing: false;
        enable_streaming: boolean;
        inherit_process_env: false;
        maxRetries: 0;
        model: AuthorInvocationRequest['model'];
        model_reasoning_effort: AuthorInvocationRequest['reasoningEffort'];
        network_access_enabled: false;
        persist_threads: false;
        sandbox_mode: 'read-only';
        skip_git_repo_check: true;
        web_search_mode: 'disabled';
        working_dir: string;
      };
      id: 'openai:codex-sdk';
    }>;
    sharing: false;
    tests: [{ vars: Record<string, never> }];
    writeLatestResults: false;
  };
}

interface PromptfooResult {
  error?: string | null;
  latencyMs?: unknown;
  response?: { metadata?: Record<string, unknown>; output?: unknown; tokenUsage?: unknown };
}

interface PromptfooEvaluation {
  toEvaluateSummary: () => Promise<{ results: PromptfooResult[] }>;
}

interface PromptfooModule {
  evaluate: (suite: unknown, options: unknown) => Promise<unknown>;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeTokenUsage(value: unknown): AuthorTokenUsage | null {
  const usage = record(value);
  if (usage === null) return null;
  const details = record(usage.completionDetails);
  const normalized = {
    cachedInputTokens: finiteNumber(usage.cached),
    inputTokens: finiteNumber(usage.prompt),
    outputTokens: finiteNumber(usage.completion),
    reasoningOutputTokens: finiteNumber(details?.reasoning),
    totalTokens: finiteNumber(usage.total),
  };
  return Object.values(normalized).every((entry) => entry === null) ? null : normalized;
}

export function createAuthorPromptfooInvocation(input: CreateAuthorPromptfooInvocationInput): AuthorPromptfooInvocation {
  const localDiagnostic =
    input.observation === undefined
      ? input.localDiagnostic
      : { codexPathOverride: input.observation.codexPathOverride, environment: input.observation.environment };
  const timeouts = input.timeouts ?? { maxEvalTimeMs: 360_000, timeoutMs: 300_000 };
  return {
    options: { cache: false, maxConcurrency: 1, maxEvalTimeMs: timeouts.maxEvalTimeMs, silent: true, timeoutMs: timeouts.timeoutMs },
    suite: {
      prompts: [input.request.prompt],
      providers: [
        {
          config: {
            approval_policy: 'never',
            cli_config: { features: { multi_agent: false } },
            cli_env: { CODEX_HOME: input.codexHome, ...(localDiagnostic?.environment ?? {}) },
            ...(localDiagnostic === undefined ? {} : { codex_path_override: localDiagnostic.codexPathOverride }),
            deep_tracing: false,
            enable_streaming: input.observation !== undefined,
            inherit_process_env: false,
            maxRetries: 0,
            model: input.request.model,
            model_reasoning_effort: input.request.reasoningEffort,
            network_access_enabled: false,
            persist_threads: false,
            sandbox_mode: 'read-only',
            skip_git_repo_check: true,
            web_search_mode: 'disabled',
            working_dir: input.workingDirectory,
          },
          id: 'openai:codex-sdk',
        },
      ],
      sharing: false,
      tests: [{ vars: {} }],
      writeLatestResults: false,
    },
  };
}

export function createPromptfooAuthorInvoker(input: {
  codexHome: string;
  loadPromptfoo?: () => Promise<PromptfooModule>;
  localDiagnostic?: AuthorLocalDiagnosticOverride;
  observation?: CodexObservationSession;
  timeouts?: { maxEvalTimeMs: number; timeoutMs: number };
  workingDirectory: string;
}): AuthorInvoker {
  return async (request): Promise<AuthorInvocationResponse> => {
    const invocation = createAuthorPromptfooInvocation({
      codexHome: input.codexHome,
      ...(input.localDiagnostic === undefined ? {} : { localDiagnostic: input.localDiagnostic }),
      ...(input.observation === undefined ? {} : { observation: input.observation }),
      request,
      ...(input.timeouts === undefined ? {} : { timeouts: input.timeouts }),
      workingDirectory: input.workingDirectory,
    });
    const promptfoo = input.loadPromptfoo === undefined ? ((await import('promptfoo')) as PromptfooModule) : await input.loadPromptfoo();
    let evaluation: PromptfooEvaluation;
    try {
      evaluation = (await promptfoo.evaluate(invocation.suite, invocation.options)) as PromptfooEvaluation;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      throw new AuthorProviderError(
        diagnoseProviderFailure('EVALUATION', message),
        input.observation === undefined ? undefined : await readCodexObservation(input.observation, message),
      );
    }
    let summary: Awaited<ReturnType<PromptfooEvaluation['toEvaluateSummary']>>;
    try {
      summary = await evaluation.toEvaluateSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      throw new AuthorProviderError(
        diagnoseProviderFailure('RESULT', message),
        input.observation === undefined ? undefined : await readCodexObservation(input.observation, message),
      );
    }
    const result = summary.results[0];
    if (result === undefined) {
      throw new AuthorProviderError(
        { category: 'UNKNOWN', code: 'NO_RESULT', stage: 'RESULT' },
        input.observation === undefined ? undefined : await readCodexObservation(input.observation, null),
      );
    }
    if (result.error) {
      throw new AuthorProviderError(
        diagnoseProviderFailure('RESULT', result.error),
        input.observation === undefined ? undefined : await readCodexObservation(input.observation, result.error),
      );
    }
    if (typeof result.response?.output !== 'string') {
      throw new AuthorProviderError(
        { category: 'UNKNOWN', code: 'NO_TEXT', stage: 'OUTPUT' },
        input.observation === undefined ? undefined : await readCodexObservation(input.observation, null),
      );
    }
    const observedModel = result.response.metadata?.model;
    return {
      observedModel: typeof observedModel === 'string' ? observedModel : null,
      output: result.response.output,
      ...(input.observation === undefined ? {} : { providerObservation: await readCodexObservation(input.observation, null) }),
      providerLatencyMs: finiteNumber(result.latencyMs),
      tokenUsage: normalizeTokenUsage(result.response.tokenUsage),
    };
  };
}
