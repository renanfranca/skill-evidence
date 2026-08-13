import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../canonical-json.js';
import { loadAuthorViabilityPreparation, scoreAuthorViability } from './author-viability-workflow.js';

function argumentsFrom(args: string[]): { outputPath: string; preparationPath: string } {
  const preparationIndex = args.indexOf('--preparation');
  const outputIndex = args.indexOf('--out');
  const preparationPath = args[preparationIndex + 1];
  const outputPath = args[outputIndex + 1];
  if (args.length !== 4 || preparationIndex === -1 || outputIndex === -1 || preparationPath === undefined || outputPath === undefined) {
    throw new Error('USAGE: --preparation <campaign-preparation.json> --out <report.json>');
  }
  return { outputPath, preparationPath };
}

export async function runScoreAuthorViability(args: string[], repositoryRoot = process.cwd()): Promise<Record<string, unknown>> {
  const parsed = argumentsFrom(args);
  const preparation = await loadAuthorViabilityPreparation(repositoryRoot, parsed.preparationPath);
  return await scoreAuthorViability({ outputPath: parsed.outputPath, preparation, repositoryRoot });
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${canonicalJson(await runScoreAuthorViability(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'AUTHOR_VIABILITY_SCORING_FAILED'}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
