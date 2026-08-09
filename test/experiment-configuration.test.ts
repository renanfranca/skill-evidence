import { describe, expect, it } from 'vitest';

import { createE2PromptfooRuntimeCondition, createExperimentInvocation } from '../experiments/configuration.js';

describe('experiment condition configuration', () => {
  it('builds the bounded E1 condition without inheriting host credentials or enabling retries', () => {
    const invocation = createExperimentInvocation({
      kind: 'e1',
      workingDirectory: '/tmp/e1-workspace',
      externalCodexHome: '/private/dedicated-login',
    });

    expect(invocation.options).toMatchObject({ cache: false, maxConcurrency: 1, maxEvalTimeMs: 360000, timeoutMs: 300000 });
    expect(invocation.suite).toMatchObject({ sharing: false, writeLatestResults: false });
    expect(invocation.providerConfig).toMatchObject({
      approval_policy: 'never',
      cli_config: { features: { multi_agent: false } },
      cli_env: { CODEX_HOME: '/private/dedicated-login' },
      deep_tracing: false,
      enable_streaming: false,
      inherit_process_env: false,
      maxRetries: 0,
      model: 'gpt-5.6-luna',
      model_reasoning_effort: 'max',
      network_access_enabled: false,
      persist_threads: false,
      sandbox_mode: 'read-only',
      web_search_mode: 'disabled',
      working_dir: '/tmp/e1-workspace',
    });
    expect(invocation.suite).toMatchObject({ prompts: ['Respond with exactly E1_AUTH_OK.'] });
  });

  it('keeps baseline and deep canaries comparable while making deep OTEL logging opt-in and local', () => {
    const baseline = createExperimentInvocation({
      kind: 'e2-baseline',
      workingDirectory: '/tmp/baseline',
      externalCodexHome: '/private/dedicated-login',
    });
    const deep = createExperimentInvocation({
      kind: 'e2-deep',
      workingDirectory: '/tmp/deep',
      externalCodexHome: '/private/dedicated-login',
    });

    expect(baseline.providerConfig).toMatchObject({ deep_tracing: false, enable_streaming: true, sandbox_mode: 'workspace-write' });
    expect(deep.providerConfig).toMatchObject({
      cli_config: {
        otel: {
          exporter: 'otlp-http',
          log_user_prompt: false,
          otlp_http: { endpoint: 'http://127.0.0.1:4318/v1/logs', protocol: 'json' },
        },
      },
      deep_tracing: true,
      enable_streaming: true,
      sandbox_mode: 'workspace-write',
    });
    expect(baseline.suite.tracing).toEqual({
      enabled: true,
      failOnReceiverStartFailure: true,
      otlp: { http: { acceptFormats: ['json'], enabled: true, host: '127.0.0.1', port: 4318 } },
    });
    expect(deep.suite.tracing).toEqual(baseline.suite.tracing);
    expect(baseline.suite).toMatchObject({ sharing: false, writeLatestResults: true });
    expect(deep.suite).toMatchObject({ sharing: false, writeLatestResults: true });
    expect(createE2PromptfooRuntimeCondition()).toEqual({
      cache: baseline.options.cache,
      sharing: baseline.suite.sharing,
      tracing: baseline.suite.tracing,
      writeLatestResults: baseline.suite.writeLatestResults,
    });
  });
});
