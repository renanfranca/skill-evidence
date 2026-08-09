import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface PromptfooIsolationEnvironment {
  PROMPTFOO_CACHE_ENABLED: 'false';
  PROMPTFOO_CACHE_PATH: string;
  PROMPTFOO_CONFIG_DIR: string;
  PROMPTFOO_DISABLE_TELEMETRY: 'true';
  PROMPTFOO_DISABLE_UPDATE: 'true';
  PROMPTFOO_LOG_DIR: string;
}

export interface PromptfooIsolationStorage {
  databasePath: string;
  root: string;
}

const isolatedKeys = [
  'PROMPTFOO_CACHE_ENABLED',
  'PROMPTFOO_CACHE_PATH',
  'PROMPTFOO_CONFIG_DIR',
  'PROMPTFOO_DISABLE_TELEMETRY',
  'PROMPTFOO_DISABLE_UPDATE',
  'PROMPTFOO_LOG_DIR',
] as const;

export async function withPromptfooIsolation<T>(
  operation: (environment: PromptfooIsolationEnvironment, storage: PromptfooIsolationStorage) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'skill-evidence-promptfoo-'));
  const environment: PromptfooIsolationEnvironment = {
    PROMPTFOO_CACHE_ENABLED: 'false',
    PROMPTFOO_CACHE_PATH: join(root, 'cache'),
    PROMPTFOO_CONFIG_DIR: join(root, 'config'),
    PROMPTFOO_DISABLE_TELEMETRY: 'true',
    PROMPTFOO_DISABLE_UPDATE: 'true',
    PROMPTFOO_LOG_DIR: join(root, 'logs'),
  };
  await Promise.all([
    mkdir(environment.PROMPTFOO_CACHE_PATH),
    mkdir(environment.PROMPTFOO_CONFIG_DIR),
    mkdir(environment.PROMPTFOO_LOG_DIR),
  ]);
  const previous = new Map<string, string | undefined>(isolatedKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  try {
    return await operation(environment, { databasePath: join(environment.PROMPTFOO_CONFIG_DIR, 'promptfoo.db'), root });
  } finally {
    for (const key of isolatedKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await rm(root, { force: true, recursive: true });
  }
}
