import { execFile as execFileCallback } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { canonicalJson, sha256 } from './canonical.js';

const execFile = promisify(execFileCallback);
const campaignIdPattern = /^(?:[a-z0-9]|[a-z0-9][a-z0-9._-]{0,62}[a-z0-9])$/;

export interface CodexHomeDirectoryIdentity {
  algorithm: 'sha256:device-inode';
  digest: string;
  limitation: 'Detects directory replacement or switching; does not establish credential contents or authenticated-principal continuity.';
}

export function assertCampaignId(campaignId: string): void {
  if (!campaignIdPattern.test(campaignId)) {
    throw new Error('campaign ID must be 1–64 lowercase alphanumeric characters with only internal . _ or - characters');
  }
}

export function campaignDirectory(artifactRoot: string, campaignId: string): string {
  assertCampaignId(campaignId);
  const root = resolve(artifactRoot);
  const directory = resolve(root, 'campaigns', campaignId);
  const relation = relative(root, directory);
  if (relation === '' || relation.startsWith('..') || relation.includes('../')) {
    throw new Error('campaign artifact path escapes its declared root');
  }
  return directory;
}

export function campaignArtifactPath(artifactRoot: string, campaignId: string, ...segments: string[]): string {
  const directory = campaignDirectory(artifactRoot, campaignId);
  const path = resolve(directory, ...segments);
  const relation = relative(directory, path);
  if (relation === '' || relation.startsWith('..') || relation.includes('../')) {
    throw new Error('campaign artifact path escapes its declared root');
  }
  return path;
}

export async function codexHomeDirectoryIdentity(path: string): Promise<{ canonicalPath: string; identity: CodexHomeDirectoryIdentity }> {
  const canonicalPath = await realpath(path);
  const first = await stat(canonicalPath, { bigint: true });
  const second = await stat(canonicalPath, { bigint: true });
  if (!first.isDirectory() || !second.isDirectory() || first.dev !== second.dev || first.ino !== second.ino || first.ino === 0n) {
    throw new Error('CODEX_HOME directory identity is unavailable or unstable');
  }
  return {
    canonicalPath,
    identity: {
      algorithm: 'sha256:device-inode',
      digest: sha256(canonicalJson({ device: first.dev.toString(), inode: first.ino.toString() })),
      limitation:
        'Detects directory replacement or switching; does not establish credential contents or authenticated-principal continuity.',
    },
  };
}

export async function assertCleanWorktree(repositoryRoot: string): Promise<void> {
  const result = await execFile('git', ['status', '--porcelain'], { cwd: repositoryRoot });
  if (result.stdout.trim().length > 0) {
    throw new Error('a clean Git worktree is required before creating a freeze or starting a live invocation');
  }
}
