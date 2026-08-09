import { verifyTracingLifecycle } from './tracing-check.js';

async function main(): Promise<void> {
  const result = await verifyTracingLifecycle(process.cwd());
  process.stdout.write(
    'tracing verification passed; runtime=' +
      result.runtimeMethodPresent +
      '; typed=' +
      result.pinnedTypeDeclared +
      '; integration=' +
      result.integrationOperational +
      '\n',
  );
}

await main();
