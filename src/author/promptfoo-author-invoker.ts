import type { AuthorInvocationRequest, AuthorInvocationResponse, AuthorInvoker } from './evaluation-author.js';
import { AuthorProviderError, diagnoseProviderFailure } from './provider-diagnostic.js';

export interface CreateAuthorPromptfooInvocationInput {
  codexHome: string;
  localDiagnostic?: AuthorLocalDiagnosticOverride;
  request: AuthorInvocationRequest;
  workingDirectory: string;
}

export interface AuthorLocalDiagnosticOverride {
  codexPathOverride: string;
  environment: Record<string, string>;
}

export interface AuthorPromptfooInvocation {
  options: { cache: false; maxConcurrency: 1; maxEvalTimeMs: 360000; silent: true; timeoutMs: 300000 };
  suite: {
    prompts: [string];
    providers: Array<{
      config: {
        approval_policy: 'never';
        cli_config: { features: { multi_agent: false } };
        cli_env: Record<string, string>;
        codex_path_override?: string;
        deep_tracing: false;
        enable_streaming: false;
        inherit_process_env: false;
        maxRetries: 0;
        model: 'gpt-5.6-terra';
        model_reasoning_effort: 'xhigh';
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
  response?: { metadata?: Record<string, unknown>; output?: unknown };
}

interface PromptfooEvaluation {
  toEvaluateSummary: () => Promise<{ results: PromptfooResult[] }>;
}

interface PromptfooModule {
  evaluate: (suite: unknown, options: unknown) => Promise<unknown>;
}

export function createAuthorPromptfooInvocation(input: CreateAuthorPromptfooInvocationInput): AuthorPromptfooInvocation {
  const localDiagnostic = input.localDiagnostic;
  return {
    options: { cache: false, maxConcurrency: 1, maxEvalTimeMs: 360_000, silent: true, timeoutMs: 300_000 },
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
            enable_streaming: false,
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
  workingDirectory: string;
}): AuthorInvoker {
  return async (request): Promise<AuthorInvocationResponse> => {
    const invocation = createAuthorPromptfooInvocation({
      codexHome: input.codexHome,
      ...(input.localDiagnostic === undefined ? {} : { localDiagnostic: input.localDiagnostic }),
      request,
      workingDirectory: input.workingDirectory,
    });
    const promptfoo = input.loadPromptfoo === undefined ? ((await import('promptfoo')) as PromptfooModule) : await input.loadPromptfoo();
    let evaluation: PromptfooEvaluation;
    try {
      evaluation = (await promptfoo.evaluate(invocation.suite, invocation.options)) as PromptfooEvaluation;
    } catch (error) {
      throw new AuthorProviderError(diagnoseProviderFailure('EVALUATION', error instanceof Error ? error.message : ''));
    }
    let summary: Awaited<ReturnType<PromptfooEvaluation['toEvaluateSummary']>>;
    try {
      summary = await evaluation.toEvaluateSummary();
    } catch (error) {
      throw new AuthorProviderError(diagnoseProviderFailure('RESULT', error instanceof Error ? error.message : ''));
    }
    const result = summary.results[0];
    if (result === undefined) {
      throw new AuthorProviderError({ category: 'UNKNOWN', code: 'NO_RESULT', stage: 'RESULT' });
    }
    if (result.error) {
      throw new AuthorProviderError(diagnoseProviderFailure('RESULT', result.error));
    }
    if (typeof result.response?.output !== 'string') {
      throw new AuthorProviderError({ category: 'UNKNOWN', code: 'NO_TEXT', stage: 'OUTPUT' });
    }
    const observedModel = result.response.metadata?.model;
    return { observedModel: typeof observedModel === 'string' ? observedModel : null, output: result.response.output };
  };
}
