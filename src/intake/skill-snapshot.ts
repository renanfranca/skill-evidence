import { lstat, readdir, readFile, readlink, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { sha256, sha256Bytes } from '../canonical-json.js';

export interface SnapshotInput {
  limits?: Partial<SnapshotLimits>;
  rootDirectory: string;
}

export interface SnapshotLimits {
  maxFileBytes: number;
  maxFiles: number;
  maxTotalBytes: number;
}

export interface IncludedSkillFile {
  content: string;
  digest: string;
  path: string;
  size: number;
}

export type SnapshotExclusionReason =
  | 'BINARY_FILE'
  | 'CREDENTIAL_SUSPECTED'
  | 'EXTERNAL_SYMLINK'
  | 'INACCESSIBLE_FILE'
  | 'OVERSIZE_FILE'
  | 'POLICY_EXCLUDED'
  | 'SYMLINK_UNSUPPORTED'
  | 'TEMPORARY_FILE';

export interface SnapshotExclusion {
  path: string;
  reason: SnapshotExclusionReason;
}

export interface SkillSnapshot {
  exclusions: SnapshotExclusion[];
  fingerprint: string;
  includedFiles: IncludedSkillFile[];
  policyVersion: 1;
}

const defaultLimits: SnapshotLimits = { maxFileBytes: 1024 * 1024, maxFiles: 256, maxTotalBytes: 8 * 1024 * 1024 };
const excludedDirectories = new Set(['.git', '.skill-evidence', '__pycache__', 'coverage', 'dist', 'evals', 'evaluations', 'node_modules']);
const credentialFileNames = /^(?:\.env(?:\..+)?|id_(?:rsa|dsa|ecdsa|ed25519)|.*\.(?:key|p12|pfx|pem))$/iu;
const credentialContent =
  /(?:-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:OPENAI_API_KEY|CODEX_API_KEY|AWS_SECRET_ACCESS_KEY|PASSWORD|SECRET|TOKEN)\s*=\s*\S+|\bsk-[A-Za-z0-9_-]{8,})/u;
const temporaryFileNames = /(?:~|\.(?:swp|temp|tmp))$/iu;

export type SnapshotErrorCode =
  | 'FILE_COUNT_LIMIT_EXCEEDED'
  | 'SKILL_FILE_INVALID_UTF8'
  | 'SKILL_FILE_REQUIRED'
  | 'SKILL_ROOT_INVALID'
  | 'SNAPSHOT_MUTATED'
  | 'TOTAL_SIZE_LIMIT_EXCEEDED';

export class SnapshotError extends Error {
  readonly code: SnapshotErrorCode;
  readonly path: string | undefined;

  constructor(code: SnapshotErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
    this.path = path;
  }
}

interface DiscoveredTree {
  exclusions: SnapshotExclusion[];
  files: string[];
}

function comparePath(left: { path: string }, right: { path: string }): number {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

function isWithinRoot(rootDirectory: string, candidate: string): boolean {
  const relativePath = relative(rootDirectory, candidate);
  return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !relativePath.startsWith(sep));
}

async function discoverTree(rootDirectory: string, directory = rootDirectory): Promise<DiscoveredTree> {
  const entries = await readdir(directory, { withFileTypes: true });
  const discovered: DiscoveredTree = { exclusions: [], files: [] };
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const path = portableRelativePath(rootDirectory, absolutePath);
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name) || entry.name === '.cache') {
        discovered.exclusions.push({ path, reason: 'POLICY_EXCLUDED' });
      } else {
        const nested = await discoverTree(rootDirectory, absolutePath);
        discovered.files.push(...nested.files);
        discovered.exclusions.push(...nested.exclusions);
      }
    } else if (entry.isFile()) {
      discovered.files.push(absolutePath);
    } else if (entry.isSymbolicLink()) {
      const target = resolve(dirname(absolutePath), await readlink(absolutePath));
      discovered.exclusions.push({ path, reason: isWithinRoot(rootDirectory, target) ? 'SYMLINK_UNSUPPORTED' : 'EXTERNAL_SYMLINK' });
    }
  }
  return discovered;
}

function portableRelativePath(rootDirectory: string, absolutePath: string): string {
  return relative(rootDirectory, absolutePath).split(sep).join('/');
}

export async function createSkillSnapshot(input: SnapshotInput): Promise<SkillSnapshot> {
  let rootMetadata;
  try {
    rootMetadata = await stat(input.rootDirectory);
  } catch {
    throw new SnapshotError('SKILL_ROOT_INVALID', 'skill root does not exist or is inaccessible');
  }
  if (!rootMetadata.isDirectory()) {
    throw new SnapshotError('SKILL_ROOT_INVALID', 'skill root is not a directory');
  }
  const skillPath = join(input.rootDirectory, 'SKILL.md');
  let skillMetadata;
  try {
    skillMetadata = await lstat(skillPath);
  } catch {
    throw new SnapshotError('SKILL_FILE_REQUIRED', 'SKILL.md must be a regular non-empty UTF-8 file', 'SKILL.md');
  }
  if (!skillMetadata.isFile() || skillMetadata.size === 0) {
    throw new SnapshotError('SKILL_FILE_REQUIRED', 'SKILL.md must be a regular non-empty UTF-8 file', 'SKILL.md');
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(await readFile(skillPath));
  } catch {
    throw new SnapshotError('SKILL_FILE_INVALID_UTF8', 'SKILL.md must contain valid UTF-8', 'SKILL.md');
  }
  const limits = { ...defaultLimits, ...input.limits };
  const discovered = await discoverTree(input.rootDirectory);
  if (discovered.files.length > limits.maxFiles) {
    throw new SnapshotError('FILE_COUNT_LIMIT_EXCEEDED', 'skill tree exceeds the file-count limit');
  }
  const includedFiles: IncludedSkillFile[] = [];
  const exclusions = [...discovered.exclusions];
  for (const absolutePath of discovered.files) {
    const path = portableRelativePath(input.rootDirectory, absolutePath);
    if (temporaryFileNames.test(path)) {
      exclusions.push({ path, reason: 'TEMPORARY_FILE' });
      continue;
    }
    if (credentialFileNames.test(path.split('/').at(-1) ?? path)) {
      exclusions.push({ path, reason: 'CREDENTIAL_SUSPECTED' });
      continue;
    }
    let before;
    let bytes;
    let after;
    try {
      before = await stat(absolutePath, { bigint: true });
      if (before.size > BigInt(limits.maxFileBytes)) {
        exclusions.push({ path, reason: 'OVERSIZE_FILE' });
        continue;
      }
      bytes = await readFile(absolutePath);
      await new Promise<void>((resolveReadWindow) => setImmediate(resolveReadWindow));
      after = await stat(absolutePath, { bigint: true });
    } catch {
      exclusions.push({ path, reason: 'INACCESSIBLE_FILE' });
      continue;
    }
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.size !== BigInt(bytes.byteLength)
    ) {
      throw new SnapshotError('SNAPSHOT_MUTATED', 'skill file changed while the snapshot was being read', path);
    }
    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      exclusions.push({ path, reason: 'BINARY_FILE' });
      continue;
    }
    if (content.includes('\0')) {
      exclusions.push({ path, reason: 'BINARY_FILE' });
      continue;
    }
    if (credentialContent.test(content)) {
      exclusions.push({ path, reason: 'CREDENTIAL_SUSPECTED' });
      continue;
    }
    includedFiles.push({ content, digest: sha256Bytes(bytes), path, size: bytes.byteLength });
    if (includedFiles.reduce((total, file) => total + file.size, 0) > limits.maxTotalBytes) {
      throw new SnapshotError('TOTAL_SIZE_LIMIT_EXCEEDED', 'authorized skill content exceeds the total snapshot limit');
    }
  }
  includedFiles.sort(comparePath);
  exclusions.sort(comparePath);
  const snapshotBody = { exclusions, includedFiles, policyVersion: 1 as const };
  return { ...snapshotBody, fingerprint: sha256(snapshotBody) };
}
