export function foundationConditions(externalCodexHome: string): Record<string, unknown> {
  return {
    externalCodexHome,
    provider: 'openai:codex-sdk',
    shared: {
      approval_policy: 'never',
      cache: false,
      cli_config: { features: { multi_agent: false } },
      collaboration_mode: 'omitted',
      inherit_process_env: false,
      maxConcurrency: 1,
      maxRetries: 0,
      model: 'gpt-5.6-luna',
      model_reasoning_effort: 'max',
      network_access_enabled: false,
      persist_threads: false,
      thread_id: 'omitted',
      web_search_mode: 'disabled',
    },
    variants: {
      e1: { deep_tracing: false, enable_streaming: false, sandbox_mode: 'read-only' },
      e2Baseline: { deep_tracing: false, enable_streaming: true, sandbox_mode: 'workspace-write' },
      e2Deep: {
        cli_config: { otel: { endpoint: 'http://127.0.0.1:4318/v1/logs', log_user_prompt: false } },
        deep_tracing: true,
        enable_streaming: true,
        sandbox_mode: 'workspace-write',
      },
    },
  };
}
