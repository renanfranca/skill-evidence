import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalDigest } from './canonical.js';
import { readJson, writeCanonicalJson } from './files.js';
import { renderEvidence } from './report.js';
import { validateSchema } from './schema.js';
import { assertArchiveSafe } from './security.js';
import type { Evidence } from './types.js';

export async function writeReport(evidenceFile: string): Promise<string> {
  const evidence = await readJson<Evidence>(evidenceFile);
  await validateSchema('evidence', evidence, evidenceFile);
  const report = renderEvidence(evidence);
  await writeFile(path.join(path.dirname(evidenceFile), 'report.md'), report, 'utf8');
  return report;
}

export async function reviewRun(
  runDirectory: string,
  decision: 'confirm' | 'reject' | 'inconclusive',
  rationaleFile: string,
): Promise<void> {
  const evidenceFile = path.resolve(runDirectory, 'evidence.json');
  const evidence = await readJson<Evidence>(evidenceFile);
  await validateSchema('evidence', evidence, evidenceFile);
  if (decision === 'confirm' && !evidence.eligibility.confirm) throw new Error('Cannot confirm an ineligible run');
  const rationale = await readFile(rationaleFile, 'utf8');
  assertArchiveSafe(rationale, 100_000);
  const review = {
    schemaVersion: 1,
    decision,
    author: process.env.SKILL_EVIDENCE_REVIEWER ?? process.env.USER ?? os.userInfo().username,
    createdAt: new Date().toISOString(),
    rationale,
    evidenceDigest: canonicalDigest(evidence),
  };
  await validateSchema('review', review, 'review.json');
  await writeCanonicalJson(path.join(runDirectory, 'review.json'), review);
}

export async function archiveRun(runDirectory: string): Promise<string> {
  const root = path.resolve(runDirectory);
  const evidenceFile = path.join(root, 'evidence.json');
  const reviewFile = path.join(root, 'review.json');
  const evidence = await readJson<Evidence>(evidenceFile);
  const review = await readJson<Record<string, unknown>>(reviewFile);
  await validateSchema('evidence', evidence, evidenceFile);
  await validateSchema('review', review, reviewFile);
  if (review.evidenceDigest !== canonicalDigest(evidence)) throw new Error('Review does not match canonical evidence');
  const report = renderEvidence(evidence);
  const artifacts = [await readFile(evidenceFile, 'utf8'), await readFile(reviewFile, 'utf8'), report];
  for (const artifact of artifacts) assertArchiveSafe(artifact);
  const destination = path.resolve('archive', evidence.runId);
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(destination, { recursive: false });
  await cp(evidenceFile, path.join(destination, 'evidence.json'));
  await cp(reviewFile, path.join(destination, 'review.json'));
  await writeFile(path.join(destination, 'report.md'), report, 'utf8');
  await cp(path.join(root, 'snapshot'), path.join(destination, 'snapshot'), { recursive: true });
  return destination;
}
