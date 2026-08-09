import { readFile } from 'node:fs/promises';

import { createExperimentInvocation } from './configuration.js';
import { assertCredentialPolicy } from './invocation.js';

export interface OfflineVerificationOptions {
  loadPromptfoo?: () => Promise<unknown>;
  root?: string;
}

export interface OfflineVerificationResult {
  providerImports: 0;
  status: 'PASS';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

async function verifyPinnedDependencies(root: string): Promise<void> {
  const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8')) as unknown;
  if (!isRecord(manifest) || !isRecord(manifest.dependencies)) {
    throw new Error('package.json dependencies are missing');
  }
  if (manifest.dependencies.promptfoo !== '0.122.0' || manifest.dependencies['@openai/codex-sdk'] !== '0.147.0') {
    throw new Error('experiment dependency pins do not match the resolved instrument candidates');
  }
}

export async function verifyOffline(options: OfflineVerificationOptions = {}): Promise<OfflineVerificationResult> {
  const e1 = createExperimentInvocation({
    externalCodexHome: '<EXTERNAL_CODEX_HOME>',
    kind: 'e1',
    workingDirectory: '<TEMP_WORKSPACE>',
  });
  const deep = createExperimentInvocation({
    externalCodexHome: '<EXTERNAL_CODEX_HOME>',
    kind: 'e2-deep',
    workingDirectory: '<TEMP_WORKSPACE>',
  });
  assertCredentialPolicy(
    {
      cliEnv: e1.providerConfig.cli_env,
      options: e1.options,
      provider: 'openai:codex-sdk',
      providerConfig: e1.providerConfig,
      suite: e1.suite,
    },
    {},
  );
  if (e1.options.cache || e1.options.maxConcurrency !== 1 || deep.suite.tracing?.failOnReceiverStartFailure !== true) {
    throw new Error('offline experiment invariants are not configured');
  }
  if (options.root !== undefined) {
    await verifyPinnedDependencies(options.root);
  }
  return { providerImports: 0, status: 'PASS' };
}
