import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import type { AuthorViabilityResolutionPacket } from './author-viability-review.js';
import { prepareAuthorViabilityResolution } from './author-viability-workflow.js';

function reviewDirectory(args: string[]): string {
  const index = args.indexOf('--review-directory');
  if (args.length !== 2 || index === -1 || args[index + 1] === undefined) throw new Error('USAGE: --review-directory <directory>');
  return args[index + 1]!;
}

export async function runPrepareAuthorViabilityResolution(
  args: string[],
  repositoryRoot = process.cwd(),
): Promise<AuthorViabilityResolutionPacket> {
  return await prepareAuthorViabilityResolution({ repositoryRoot, reviewDirectory: reviewDirectory(args) });
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
