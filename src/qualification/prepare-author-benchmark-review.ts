import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson, sha256 } from '../canonical-json.js';
import { createBlindReviewPackets, reserveBlindReviewWorkspace } from './author-benchmark-adjudication.js';
import type { AuthorBenchmarkCampaignPreparation } from './author-benchmark-preflight.js';
import type { AuthorBenchmarkCollection, AuthorBenchmarkTerminalReceipt } from './author-benchmark-runner.js';
import {
  createReviewerQualificationPacket,
  validateAuthorBenchmarkBundle,
  type AuthorBenchmarkBundleCandidate,
} from './author-benchmark.js';

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

export interface PreparedBlindReviewSummary {
  campaignId: string;
  collectionFingerprint: string;
  externalProviderCalls: 0;
  packetCount: number;
  purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW_PREPARATION';
  reservationCreated: true;
  schemaVersion: 1;
}

export async function prepareAuthorBenchmarkReviewCommand(
  args: string[],
  repositoryRoot = process.cwd(),
): Promise<PreparedBlindReviewSummary> {
  const bundleArgument = valueAfter(args, '--bundle');
  const preparationArgument = valueAfter(args, '--preparation');
  const campaignId = valueAfter(args, '--campaign');
  if (bundleArgument === undefined || preparationArgument === undefined || campaignId === undefined) {
    throw new Error('review preparation requires --bundle, --preparation, and --campaign');
  }
  const bundleDirectory = resolve(repositoryRoot, bundleArgument);
  const preparationPath = resolve(repositoryRoot, preparationArgument);
  const [bundleText, preparationText] = await Promise.all([
    readFile(join(bundleDirectory, 'bundle.json'), 'utf8'),
    readFile(preparationPath, 'utf8'),
  ]);
  const bundle = JSON.parse(bundleText) as AuthorBenchmarkBundleCandidate;
  const preparation = JSON.parse(preparationText) as AuthorBenchmarkCampaignPreparation;
  const validation = validateAuthorBenchmarkBundle(bundle);
  if (
    campaignId !== preparation.campaignId ||
    validation.fingerprint === null ||
    validation.fingerprint !== preparation.bundleFingerprint
  ) {
    throw new Error('review preparation does not match the frozen campaign');
  }
  const collectionPath = resolve(repositoryRoot, preparation.outputDirectory, 'collection.json');
  const terminalPath = resolve(repositoryRoot, preparation.reservationPath.replace(/\.json$/u, '.terminal.json'));
  const [collectionText, terminalText, instructions, resolutionPolicy] = await Promise.all([
    readFile(collectionPath, 'utf8'),
    readFile(terminalPath, 'utf8'),
    readFile(join(bundleDirectory, 'reviewer-instructions.md'), 'utf8'),
    readFile(join(bundleDirectory, 'resolution-policy.md'), 'utf8'),
  ]);
  const collection = JSON.parse(collectionText) as AuthorBenchmarkCollection;
  const terminal = JSON.parse(terminalText) as AuthorBenchmarkTerminalReceipt;
  if (
    collection.campaignId !== campaignId ||
    collection.bundleFingerprint !== preparation.bundleFingerprint ||
    collection.campaignFingerprint !== sha256(preparation) ||
    collection.status !== 'COMPLETE' ||
    terminal.status !== 'COMPLETE' ||
    !terminal.collectionPersisted ||
    terminal.providerInvocations !== collection.providerInvocations
  ) {
    throw new Error('review preparation requires the complete canonical collection and terminal receipt');
  }
  const packets = await createBlindReviewPackets({ bundle, bundleDirectory, collection });
  const outputDirectory = resolve(repositoryRoot, preparation.outputDirectory, 'adjudication');
  const reservationPath = resolve(repositoryRoot, dirname(preparation.reservationPath), `${campaignId}.adjudication.json`);
  await reserveBlindReviewWorkspace({
    campaignId,
    collectionFingerprint: sha256(collection),
    instructions,
    outputDirectory,
    packets,
    qualificationPacket: createReviewerQualificationPacket(bundle),
    reservationPath,
    resolutionPolicy,
  });
  return {
    campaignId,
    collectionFingerprint: sha256(collection),
    externalProviderCalls: 0,
    packetCount: packets.length,
    purpose: 'AUTHOR_BENCHMARK_BLIND_REVIEW_PREPARATION',
    reservationCreated: true,
    schemaVersion: 1,
  };
}

async function main(): Promise<void> {
  const summary = await prepareAuthorBenchmarkReviewCommand(process.argv.slice(2));
  process.stdout.write(`${canonicalJson(summary)}\n`);
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
