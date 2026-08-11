import type { AuthorInvocationRequest, AuthorInvocationResponse, AuthorInvoker } from './evaluation-author.js';

export interface CreateAuthorPromptfooInvocationInput {
  codexHome: string;
  request: AuthorInvocationRequest;
  workingDirectory: string;
}

export interface AuthorPromptfooInvocation {
  options: { cache: false; maxConcurrency: 1; maxEvalTimeMs: 360000; timeoutMs: 300000 };
  suite: {
    prompts: [string];
    providers: Array<{
      config: {
        approval_policy: 'never';
        cli_config: { features: { multi_agent: false } };
        cli_env: { CODEX_HOME: string };
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
    tests: [Record<string, never>];
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
  return {
    options: { cache: false, maxConcurrency: 1, maxEvalTimeMs: 360_000, timeoutMs: 300_000 },
    suite: {
      prompts: [input.request.prompt],
      providers: [
        {
          config: {
            approval_policy: 'never',
            cli_config: { features: { multi_agent: false } },
            cli_env: { CODEX_HOME: input.codexHome },
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
      tests: [{}],
      writeLatestResults: false,
    },
  };
}

export function createPromptfooAuthorInvoker(input: {
  codexHome: string;
  loadPromptfoo?: () => Promise<PromptfooModule>;
  workingDirectory: string;
}): AuthorInvoker {
  return async (request): Promise<AuthorInvocationResponse> => {
    const invocation = createAuthorPromptfooInvocation({ codexHome: input.codexHome, request, workingDirectory: input.workingDirectory });
    const promptfoo = input.loadPromptfoo === undefined ? ((await import('promptfoo')) as PromptfooModule) : await input.loadPromptfoo();
    const evaluation = (await promptfoo.evaluate(invocation.suite, invocation.options)) as PromptfooEvaluation;
    const summary = await evaluation.toEvaluateSummary();
    const result = summary.results[0];
    if (result === undefined || result.error || typeof result.response?.output !== 'string') {
      throw new Error(result?.error ?? 'Promptfoo Author invocation returned no text output');
    }
    const observedModel = result.response.metadata?.model;
    return { observedModel: typeof observedModel === 'string' ? observedModel : null, output: result.response.output };
  };
}
