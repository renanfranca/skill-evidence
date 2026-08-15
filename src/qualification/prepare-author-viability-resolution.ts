import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import type { AuthorViabilityResolutionPacket } from './author-viability-review.js';
import { loadAuthorViabilityPreparation, prepareAuthorViabilityResolution } from './author-viability-workflow.js';

function preparationPath(args: string[]): string {
  const index = args.indexOf('--preparation');
  if (args.length !== 2 || index === -1 || args[index + 1] === undefined)
    throw new Error('USAGE: --preparation <campaign-preparation.json>');
  return args[index + 1]!;
}

export async function runPrepareAuthorViabilityResolution(
  args: string[],
  repositoryRoot = process.cwd(),
): Promise<AuthorViabilityResolutionPacket> {
  const preparation = await loadAuthorViabilityPreparation(repositoryRoot, preparationPath(args));
  return await prepareAuthorViabilityResolution({ preparation, repositoryRoot });
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${canonicalJson(await runPrepareAuthorViabilityResolution(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'AUTHOR_VIABILITY_RESOLUTION_PREPARATION_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
