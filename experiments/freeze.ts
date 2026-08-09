import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { campaignArtifactPath, campaignDirectory, codexHomeDirectoryIdentity } from './campaign.js';
import type { CodexHomeDirectoryIdentity } from './campaign.js';
import { canonicalJson, sha256 } from './canonical.js';
import type { ScientificConfiguration } from './configuration.js';

export interface InstrumentFreeze {
  campaignId: string;
  codexHomeDirectoryIdentity: CodexHomeDirectoryIdentity;
  instrument: { codexCli: string | null; codexSdk: string | null; promptfoo: string | null };
  lockfileDigest: string;
  manifestDigest: string;
  repositoryCommit: string;
  scientificConfiguration: ScientificConfiguration;
  scientificConfigurationDigest: string;
  schemaVersion: 3;
}

export interface CreateInstrumentFreezeInput {
  artifactRoot: string;
  campaignId: string;
  externalCodexHome: string;
  lockfilePath: string;
  manifestPath: string;
  repositoryCommit: string;
  scientificConfiguration: ScientificConfiguration;
}

export interface AssertFreezeCurrentInput {
  externalCodexHome: string;
  freeze: InstrumentFreeze;
  lockfilePath: string;
  manifestPath: string;
  repositoryCommit: string;
  scientificConfiguration: ScientificConfiguration;
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

async function fingerprintInput(input: Omit<CreateInstrumentFreezeInput, 'artifactRoot'>): Promise<InstrumentFreeze> {
  const [lockfile, manifest, home] = await Promise.all([
    readFile(input.lockfilePath, 'utf8'),
    readFile(input.manifestPath, 'utf8'),
    codexHomeDirectoryIdentity(input.externalCodexHome),
  ]);
  return {
    campaignId: input.campaignId,
    codexHomeDirectoryIdentity: home.identity,
    instrument: extractInstrumentVersions(lockfile),
    lockfileDigest: sha256(lockfile),
    manifestDigest: sha256(manifest),
    repositoryCommit: input.repositoryCommit,
    scientificConfiguration: input.scientificConfiguration,
    scientificConfigurationDigest: sha256(input.scientificConfiguration),
    schemaVersion: 3,
  };
}

export async function createInstrumentFreeze(input: CreateInstrumentFreezeInput): Promise<InstrumentFreeze> {
  const freeze = await fingerprintInput(input);
  if (freeze.instrument.promptfoo !== '0.122.0' || freeze.instrument.codexSdk !== '0.147.0' || freeze.instrument.codexCli !== '0.147.0') {
    throw new Error('instrument versions do not match the explicitly resolved Promptfoo/Codex candidates');
  }
  await mkdir(campaignDirectory(input.artifactRoot, input.campaignId), { mode: 0o700, recursive: true });
  try {
    await writeFile(campaignArtifactPath(input.artifactRoot, input.campaignId, 'freeze.json'), canonicalJson(freeze) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('instrument freeze already exists; start a new campaign');
    }
    throw error;
  }
  return freeze;
}

export async function assertFreezeCurrent(input: AssertFreezeCurrentInput): Promise<void> {
  const current = await fingerprintInput({
    campaignId: input.freeze.campaignId,
    externalCodexHome: input.externalCodexHome,
    lockfilePath: input.lockfilePath,
    manifestPath: input.manifestPath,
    repositoryCommit: input.repositoryCommit,
    scientificConfiguration: input.scientificConfiguration,
  });
  if (canonicalJson(current) !== canonicalJson(input.freeze)) {
    throw new Error('instrument drift detected; start a new campaign and rerun E1/G1');
  }
}
