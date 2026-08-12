import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { qualifyAuthorBenchmarkDirectory, renderAuthorBenchmarkOfflineQualification } from './author-benchmark.js';

function bundleDirectory(args: string[]): string {
  if (args.length !== 2 || args[0] !== '--bundle' || args[1] === undefined || args[1].length === 0) {
    throw new Error('USAGE: --bundle <directory>');
  }
  return resolve(args[1]);
}

async function main(): Promise<void> {
  try {
    const report = await qualifyAuthorBenchmarkDirectory(bundleDirectory(process.argv.slice(2)));
    process.stdout.write(renderAuthorBenchmarkOfflineQualification(report));
    process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'OFFLINE_QUALIFICATION_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
