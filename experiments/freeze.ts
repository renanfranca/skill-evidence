import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson, sha256 } from './canonical.js';
import { sanitizeForPersistence } from './redaction.js';

export interface InstrumentFreeze {
  campaignId: string;
  conditions: unknown;
  conditionsDigest: string;
  lockfileDigest: string;
  manifestDigest: string;
  instrument: {
    codexCli: string | null;
    codexSdk: string | null;
    promptfoo: string | null;
  };
  repositoryCommit: string;
  schemaVersion: 1;
}

export interface CreateInstrumentFreezeInput {
  artifactRoot: string;
  campaignId: string;
  conditions: unknown;
  lockfilePath: string;
  manifestPath: string;
  repositoryCommit: string;
}

export interface AssertFreezeCurrentInput {
  conditions?: unknown;
  freeze: InstrumentFreeze;
  lockfilePath: string;
  manifestPath: string;
  repositoryCommit: string;
}

async function fingerprintInput(input: Omit<CreateInstrumentFreezeInput, 'artifactRoot'>): Promise<InstrumentFreeze> {
  const [lockfile, manifest] = await Promise.all([readFile(input.lockfilePath, 'utf8'), readFile(input.manifestPath, 'utf8')]);
  const externalCodexHome = findExternalCodexHome(input.conditions);
  const conditions = sanitizeForPersistence(input.conditions, externalCodexHome);
  return {
    campaignId: input.campaignId,
    conditions,
    conditionsDigest: sha256(conditions),
    instrument: extractInstrumentVersions(lockfile),
    lockfileDigest: sha256(lockfile),
    manifestDigest: sha256(manifest),
    repositoryCommit: input.repositoryCommit,
    schemaVersion: 1,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function versionAt(packages: Record<string, unknown>, path: string): string | null {
  const entry = packages[path];
  return isRecord(entry) && typeof entry.version === 'string' ? entry.version : null;
}

function extractInstrumentVersions(lockfile: string): InstrumentFreeze['instrument'] {
  const parsed = JSON.parse(lockfile) as unknown;
  const packages = isRecord(parsed) && isRecord(parsed.packages) ? parsed.packages : {};
  return {
    codexCli: versionAt(packages, 'node_modules/@openai/codex'),
    codexSdk: versionAt(packages, 'node_modules/@openai/codex-sdk'),
    promptfoo: versionAt(packages, 'node_modules/promptfoo'),
  };
}

function findExternalCodexHome(conditions: unknown): string | undefined {
  if (conditions === null || typeof conditions !== 'object') {
    return undefined;
  }
  const candidate = (conditions as Record<string, unknown>).externalCodexHome;
  return typeof candidate === 'string' ? candidate : undefined;
}

export async function createInstrumentFreeze(input: CreateInstrumentFreezeInput): Promise<InstrumentFreeze> {
  const freeze = await fingerprintInput(input);
  if (freeze.instrument.promptfoo !== '0.122.0' || freeze.instrument.codexSdk !== '0.147.0' || freeze.instrument.codexCli !== '0.147.0') {
    throw new Error('instrument versions do not match the explicitly resolved Promptfoo/Codex candidates');
  }
  const directory = join(input.artifactRoot, 'campaigns', input.campaignId);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'freeze.json'), `${canonicalJson(freeze)}\n`);
  return freeze;
}

export async function assertFreezeCurrent(input: AssertFreezeCurrentInput): Promise<void> {
  const current = await fingerprintInput({
    campaignId: input.freeze.campaignId,
    conditions: input.conditions ?? input.freeze.conditions,
    lockfilePath: input.lockfilePath,
    manifestPath: input.manifestPath,
    repositoryCommit: input.repositoryCommit,
  });
  if (canonicalJson(current) !== canonicalJson(input.freeze)) {
    throw new Error('instrument drift detected; start a new campaign and rerun E1/G1');
  }
}
