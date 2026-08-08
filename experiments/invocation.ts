export interface PromptfooModule {
  evaluate: (suite: unknown, options: unknown) => Promise<unknown>;
}

export interface ProviderInvocationRequest {
  options: unknown;
  provider: string;
  providerConfig?: Record<string, unknown>;
  suite: unknown;
  suiteEnvironment?: Record<string, string | undefined>;
  cliEnv?: Record<string, string | undefined>;
}

export interface ProviderInvocationOptions {
  environment: NodeJS.ProcessEnv;
  loadPromptfoo: () => Promise<PromptfooModule>;
  request: ProviderInvocationRequest;
}

const forbiddenKeys = ['OPENAI_API_KEY', 'CODEX_API_KEY'] as const;

function assertNoForbiddenKeys(source: Record<string, unknown>, location: string): void {
  for (const key of forbiddenKeys) {
    if (Object.hasOwn(source, key)) {
      throw new Error(`${key} is forbidden in ${location}`);
    }
  }
}

export function assertCredentialPolicy(request: ProviderInvocationRequest, environment: NodeJS.ProcessEnv): void {
  assertNoForbiddenKeys(environment, 'host environment');
  const providerConfig = request.providerConfig ?? {};
  if (Object.hasOwn(providerConfig, 'apiKey')) {
    throw new Error('provider.apiKey is forbidden');
  }
  assertNoForbiddenKeys(providerConfig, 'provider configuration');
  assertNoForbiddenKeys(request.suiteEnvironment ?? {}, 'suite environment override');
  assertNoForbiddenKeys(request.cliEnv ?? {}, 'cli_env');
}

export async function runProviderInvocation(options: ProviderInvocationOptions): Promise<unknown> {
  assertCredentialPolicy(options.request, options.environment);
  const promptfoo = await options.loadPromptfoo();
  return promptfoo.evaluate(options.request.suite, options.request.options);
}
