export type ExperimentKind = 'e1' | 'e2-baseline' | 'e2-deep';

export interface ProviderConfig extends Record<string, unknown> {
  approval_policy: 'never';
  cli_config: Record<string, unknown>;
  cli_env: Record<string, string>;
  deep_tracing: boolean;
  enable_streaming: boolean;
  inherit_process_env: false;
  maxRetries: 0;
  model: 'gpt-5.6-luna';
  model_reasoning_effort: 'max';
  network_access_enabled: false;
  persist_threads: false;
  sandbox_mode: 'read-only' | 'workspace-write';
  web_search_mode: 'disabled';
  working_dir: string;
}

export interface ExperimentSuite {
  prompts: string[];
  providers: Array<{ config: ProviderConfig; id: 'openai:codex-sdk' }>;
  sharing: false;
  tests: Array<{ assert: Array<{ type: 'equals'; value: string }> }>;
  tracing?: Record<string, unknown>;
  writeLatestResults: false;
}

export interface ExperimentInvocation {
  options: { cache: false; maxConcurrency: 1; maxEvalTimeMs: 360000; timeoutMs: 300000 };
  providerConfig: ProviderConfig;
  suite: ExperimentSuite;
}

export interface CreateExperimentInvocationInput {
  externalCodexHome: string;
  kind: ExperimentKind;
  workingDirectory: string;
}

function createProviderConfig(input: CreateExperimentInvocationInput): ProviderConfig {
  const isE1 = input.kind === 'e1';
  const deepTracing = input.kind === 'e2-deep';
  return {
    approval_policy: 'never',
    cli_config: {
      features: { multi_agent: false },
      ...(deepTracing
        ? {
            otel: {
              exporter: 'otlp-http',
              log_user_prompt: false,
              otlp_http: { endpoint: 'http://127.0.0.1:4318/v1/logs', protocol: 'json' },
            },
          }
        : {}),
    },
    cli_env: { CODEX_HOME: input.externalCodexHome },
    deep_tracing: deepTracing,
    enable_streaming: !isE1,
    inherit_process_env: false,
    maxRetries: 0,
    model: 'gpt-5.6-luna',
    model_reasoning_effort: 'max',
    network_access_enabled: false,
    persist_threads: false,
    sandbox_mode: isE1 ? 'read-only' : 'workspace-write',
    web_search_mode: 'disabled',
    working_dir: input.workingDirectory,
  };
}

export function createExperimentInvocation(input: CreateExperimentInvocationInput): ExperimentInvocation {
  const providerConfig = createProviderConfig(input);
  const e1 = input.kind === 'e1';
  const expected = e1 ? 'E1_AUTH_OK' : 'E2_CANARY_OK';
  const suite: ExperimentSuite = {
    prompts: [e1 ? 'Respond with exactly E1_AUTH_OK.' : 'Complete the workspace canary and respond with exactly E2_CANARY_OK.'],
    providers: [{ config: providerConfig, id: 'openai:codex-sdk' }],
    sharing: false,
    tests: [{ assert: [{ type: 'equals', value: expected }] }],
    writeLatestResults: false,
  };
  if (!e1) {
    suite.tracing = {
      enabled: true,
      failOnReceiverStartFailure: true,
      otlp: { http: { acceptFormats: ['json'], enabled: true, host: '127.0.0.1', port: 4318 } },
    };
  }

  return {
    options: { cache: false, maxConcurrency: 1, maxEvalTimeMs: 360000, timeoutMs: 300000 },
    providerConfig,
    suite,
  };
}
