import { copyFile, mkdir, open, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson, sha256 } from '../canonical-json.js';
import { validateAuthorQualificationReport } from './author-qualification.js';
import {
  scoreAuthorBenchmark,
  type BlindReviewPacket,
  type BlindReviewResolution,
  type BlindReviewerSubmission,
} from './author-benchmark-adjudication.js';
import type { AuthorBenchmarkCampaignPreparation } from './author-benchmark-preflight.js';
import type { AuthorBenchmarkCollection } from './author-benchmark-runner.js';
import { validateAuthorBenchmarkBundle, type AuthorBenchmarkBundleCandidate } from './author-benchmark.js';

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function writeCanonical(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(`${canonicalJson(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function scoreAuthorBenchmarkCommand(args: string[], repositoryRoot = process.cwd()): Promise<unknown> {
  const bundleArgument = valueAfter(args, '--bundle');
  const preparationArgument = valueAfter(args, '--preparation');
  const campaignId = valueAfter(args, '--campaign');
  const judgmentsArgument = valueAfter(args, '--judgments');
  const outArgument = valueAfter(args, '--out');
  if (
    bundleArgument === undefined ||
    preparationArgument === undefined ||
    campaignId === undefined ||
    judgmentsArgument === undefined ||
    outArgument === undefined
  ) {
    throw new Error('scoring requires --bundle, --preparation, --campaign, --judgments, and --out');
  }
  const bundleDirectory = resolve(repositoryRoot, bundleArgument);
  const judgmentsDirectory = resolve(repositoryRoot, judgmentsArgument);
  const outPath = resolve(repositoryRoot, outArgument);
  const preparation = await readJson<AuthorBenchmarkCampaignPreparation>(resolve(repositoryRoot, preparationArgument));
  const bundle = await readJson<AuthorBenchmarkBundleCandidate>(join(bundleDirectory, 'bundle.json'));
  const collection = await readJson<AuthorBenchmarkCollection>(resolve(repositoryRoot, preparation.outputDirectory, 'collection.json'));
  const validation = validateAuthorBenchmarkBundle(bundle);
  if (
    campaignId !== preparation.campaignId ||
    validation.fingerprint === null ||
    validation.fingerprint !== preparation.bundleFingerprint ||
    collection.campaignId !== campaignId ||
    collection.campaignFingerprint !== sha256(preparation)
  ) {
    throw new Error('scoring inputs do not match the frozen campaign');
  }
  const packetDirectory = join(judgmentsDirectory, 'packets');
  const packets = await Promise.all(
    (await readdir(packetDirectory))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => readJson<BlindReviewPacket>(join(packetDirectory, name))),
  );
  const submissions = await Promise.all(
    ['reviewer-a.json', 'reviewer-b.json'].map((name) => readJson<BlindReviewerSubmission>(join(judgmentsDirectory, name))),
  );
  const resolutionArtifact = await readJson<{ resolutions: BlindReviewResolution[] }>(join(judgmentsDirectory, 'resolution.json'));
  const report = scoreAuthorBenchmark({
    bundle,
    collection,
    conditionFingerprints: Object.fromEntries(
      preparation.conditions.map((condition) => [condition.id, condition.conditionFingerprint]),
    ) as Record<'LUNA_MAX' | 'TERRA_XHIGH', string>,
    packets,
    resolutions: resolutionArtifact.resolutions,
    submissions,
  });
  const reportValidation = validateAuthorQualificationReport(report);
  if (!reportValidation.valid) throw new Error(`qualification report is invalid: ${canonicalJson(reportValidation.diagnostics)}`);
  const serialized = canonicalJson(report);
  if (/rawReasoning|rawResponse|expectedLifecycle|\/home\/|\/tmp\//u.test(serialized)) {
    throw new Error('qualification report failed sanitization');
  }
  const archiveDirectory = outPath.replace(/\.json$/u, '');
  await mkdir(archiveDirectory);
  await mkdir(join(archiveDirectory, 'packets'));
  const componentNames = [
    'manifest.json',
    'qualification-packet.json',
    'reviewer-a-qualification.json',
    'reviewer-b-qualification.json',
    'reviewer-qualification-result.json',
    'reviewer-a.json',
    'reviewer-b.json',
    'resolution-packet.json',
    'resolution.json',
    'reviewer-instructions.md',
    'resolution-policy.md',
  ];
  await Promise.all([
    ...componentNames.map((name) => copyFile(join(judgmentsDirectory, name), join(archiveDirectory, name))),
    ...packets.map((packet) =>
      copyFile(join(packetDirectory, `${packet.sampleId}.json`), join(archiveDirectory, 'packets', `${packet.sampleId}.json`)),
    ),
  ]);
  await writeCanonical(join(archiveDirectory, 'scoring.json'), report);
  const copiedComponentDigests = await Promise.all(
    componentNames.map(async (name) => {
      const text = await readFile(join(judgmentsDirectory, name), 'utf8');
      return [name, sha256(name.endsWith('.json') ? (JSON.parse(text) as unknown) : text)] as const;
    }),
  );
  await writeCanonical(join(archiveDirectory, 'archive-manifest.json'), {
    campaignId,
    collectionFingerprint: sha256(collection),
    componentDigests: Object.fromEntries(
      [
        ...copiedComponentDigests,
        ...packets.map((packet) => [`packets/${packet.sampleId}.json`, packet.fingerprint] as const),
        ['scoring.json', sha256(report)] as const,
      ].sort(([left], [right]) => left.localeCompare(right)),
    ),
    schemaVersion: 1,
  });
  await writeCanonical(outPath, report);
  return report;
}

async function main(): Promise<void> {
  const report = await scoreAuthorBenchmarkCommand(process.argv.slice(2));
  process.stdout.write(`${canonicalJson(report)}\n`);
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
