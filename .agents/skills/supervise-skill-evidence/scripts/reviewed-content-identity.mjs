#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { TextDecoder } from 'node:util';

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const SUPPORTED_MODES = new Set(['100644', '100755', '120000']);
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if ((option !== '--repo' && option !== '--base') || value === undefined) fail('usage: --repo <repository> --base <exact-commit>');
    result[option.slice(2)] = value;
  }
  if (typeof result.repo !== 'string' || typeof result.base !== 'string') fail('usage: --repo <repository> --base <exact-commit>');

  return result;
}

function decodeUtf8(bytes, label) {
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    return fail(`${label} is not valid UTF-8`);
  }
}

function splitNul(bytes, label) {
  if (bytes.length === 0) return [];
  if (bytes.at(-1) !== 0) fail(`${label} is missing its terminal NUL`);

  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0) continue;
    records.push(decodeUtf8(bytes.subarray(start, index), label));
    start = index + 1;
  }

  return records;
}

function git(repositoryRoot, args) {
  return execFileSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'buffer',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function safePath(repositoryRoot, path) {
  if (path.length === 0 || isAbsolute(path) || path.split('/').includes('..') || path.includes('\0')) fail(`unsafe Git path: ${path}`);
  const absolutePath = resolve(repositoryRoot, path);
  const repositoryRelative = relative(repositoryRoot, absolutePath);
  if (repositoryRelative.startsWith('..') || isAbsolute(repositoryRelative)) fail(`Git path escapes repository: ${path}`);

  return absolutePath;
}

function assertNoAncestorSymlink(repositoryRoot, path) {
  const components = path.split('/');
  let ancestor = repositoryRoot;

  for (const component of components.slice(0, -1)) {
    ancestor = join(ancestor, component);
    let stat;
    try {
      stat = lstatSync(ancestor);
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink()) fail(`ancestor symlink is unsupported at ${relative(repositoryRoot, ancestor)}`);
    if (!stat.isDirectory()) fail(`non-directory ancestor is unsupported at ${relative(repositoryRoot, ancestor)}`);
  }
}

function assertNoPathPrefixCollisions(paths) {
  const pathSet = new Set(paths);

  for (const path of paths) {
    const components = path.split('/');
    for (let length = 1; length < components.length; length += 1) {
      const prefix = components.slice(0, length).join('/');
      if (pathSet.has(prefix)) fail(`path-prefix collision between ${prefix} and ${path}`);
    }
  }
}

function parseBaseTree(repositoryRoot, baseCommit) {
  const entries = new Map();
  for (const record of splitNul(git(repositoryRoot, ['ls-tree', '-r', '-z', '--full-tree', baseCommit]), 'git ls-tree')) {
    const match = /^([0-7]{6}) ([^ ]+) ([0-9a-f]+)\t([\s\S]+)$/u.exec(record);
    if (match === null) fail('malformed git ls-tree record');
    const [, mode, type, objectId, path] = match;
    if (mode === undefined || type === undefined || objectId === undefined || path === undefined) fail('incomplete git ls-tree record');
    if (type !== 'blob' || !SUPPORTED_MODES.has(mode)) fail(`unsupported base-tree entry at ${path}`);
    safePath(repositoryRoot, path);
    entries.set(path, { mode, objectId });
  }

  return entries;
}

function parseIndex(repositoryRoot) {
  const entries = new Map();
  for (const record of splitNul(git(repositoryRoot, ['ls-files', '--stage', '-z']), 'git ls-files --stage')) {
    const match = /^([0-7]{6}) ([0-9a-f]+) ([0-3])\t([\s\S]+)$/u.exec(record);
    if (match === null) fail('malformed git ls-files record');
    const [, mode, objectId, stage, path] = match;
    if (mode === undefined || objectId === undefined || stage === undefined || path === undefined) fail('incomplete git ls-files record');
    if (stage !== '0') fail(`unmerged index entry at ${path}`);
    if (!SUPPORTED_MODES.has(mode)) fail(`unsupported index entry at ${path}`);
    if (entries.has(path)) fail(`duplicate index entry at ${path}`);
    safePath(repositoryRoot, path);
    entries.set(path, { mode, objectId });
  }

  return entries;
}

function candidateEntry(repositoryRoot, path) {
  const absolutePath = safePath(repositoryRoot, path);
  assertNoAncestorSymlink(repositoryRoot, path);
  let stat;
  try {
    stat = lstatSync(absolutePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }

  if (stat.isSymbolicLink()) return { bytes: readlinkSync(absolutePath, { encoding: 'buffer' }), mode: '120000' };
  if (stat.isFile()) return { bytes: readFileSync(absolutePath), mode: (stat.mode & 0o111) === 0 ? '100644' : '100755' };
  return fail(`unsupported working-tree entry at ${path}`);
}

function gitObjectId(algorithm, bytes) {
  return createHash(algorithm)
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

function normalizeExecPlan(bytes, path, normalization) {
  let text = decodeUtf8(bytes, path);
  const replacements = [];

  for (const { heading, marker } of normalization.sections) {
    const headingPattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\r?$`, 'gmu');
    const matches = [...text.matchAll(headingPattern)];
    if (matches.length !== 1 || matches[0]?.index === undefined) fail(`${path} must contain exactly one ## ${heading} section`);
    const start = matches[0].index;
    const remainder = text.slice(start + matches[0][0].length);
    const nextHeading = /^## .+\r?$/gmu.exec(remainder);
    const end = nextHeading?.index === undefined ? text.length : start + matches[0][0].length + nextHeading.index;
    replacements.push({ end, replacement: `## ${heading}\n\n${marker}\n\n`, start });
  }
  replacements.sort((left, right) => right.start - left.start);
  for (const { end, replacement, start } of replacements) text = `${text.slice(0, start)}${replacement}${text.slice(end)}`;

  return Buffer.from(text, 'utf8');
}

function discoverActiveExecPlan(repositoryRoot, discovery) {
  const indexEntry = candidateEntry(repositoryRoot, discovery.indexPath);
  if (indexEntry === null || indexEntry.mode === '120000') fail(`missing regular ${discovery.indexPath}`);
  const index = decodeUtf8(indexEntry.bytes, discovery.indexPath);
  const statusPrefix = discovery.statusPrefix.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const matches = [...index.matchAll(new RegExp(`^\\|\\s*\\[[^\\]]+\\]\\(([^)]+\\.md)\\)\\s*\\|\\s*${statusPrefix}`, 'gmu'))]
    .map((match) => match[1])
    .filter((path) => path !== undefined);
  if (matches.length !== discovery.requiredMatches) fail(`expected exactly ${discovery.requiredMatches} active ExecPlan`);
  const path = join(dirname(discovery.indexPath), matches[0]).replaceAll('\\', '/');
  safePath(repositoryRoot, path);

  return path;
}

function validateIdentityContract(contract) {
  const identity = contract.reviewedContentIdentity;
  const expectedGitSources = {
    base: ['git', 'ls-tree', '-r', '-z', '--full-tree', '<base-commit>'],
    trackedAndStaged: ['git', 'ls-files', '--stage', '-z'],
    untracked: ['git', 'ls-files', '--others', '--exclude-standard', '-z'],
    status: ['git', 'status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames'],
  };
  const expectedNormalization = {
    version: 'skill-evidence-execplan-evidence-normalization/v1',
    sections: [
      { heading: 'Supervisor Record', marker: '<!-- skill-evidence-normalized:supervisor-record:v1 -->' },
      { heading: 'Progress', marker: '<!-- skill-evidence-normalized:progress:v1 -->' },
      { heading: 'Lessons Learned', marker: '<!-- skill-evidence-normalized:lessons-learned:v1 -->' },
    ],
  };
  if (
    contract.schemaVersion !== 1 ||
    contract.conflictRule !== 'DENY_ON_CONFLICT' ||
    identity?.format !== 'skill-evidence-reviewed-material/v1' ||
    identity.digestAlgorithm !== 'sha256' ||
    identity.canonicalEncoding !== 'UTF-8' ||
    identity.pathEncoding !== 'UTF-8' ||
    identity.pathOrder !== 'UTF8_BYTEWISE_ASCENDING' ||
    identity.lineSeparator !== 'LF' ||
    JSON.stringify(identity.gitSources) !== JSON.stringify(expectedGitSources) ||
    identity.untrackedPolicy !== 'INCLUDE_NON_IGNORED' ||
    JSON.stringify(identity.supportedModes) !== JSON.stringify(['100644', '100755', '120000']) ||
    identity.regularFileBytes !== 'RAW_BYTES' ||
    identity.symlinkBytes !== 'RAW_LINK_TARGET_BYTES' ||
    JSON.stringify(identity.pathSafety) !==
      JSON.stringify({
        ancestorSymlinks: 'REJECT_BEFORE_CONTENT_READ',
        prefixCollisions: 'REJECT_BEFORE_CONTENT_READ',
        leafSymlinks: 'HASH_RAW_LINK_TARGET_BYTES',
      }) ||
    JSON.stringify(identity.deletionRepresentation) !== JSON.stringify({ mode: null, contentSha256: null }) ||
    JSON.stringify(identity.activeExecPlanDiscovery) !==
      JSON.stringify({ indexPath: 'docs/execplans/README.md', statusPrefix: 'Active:', requiredMatches: 1 }) ||
    JSON.stringify(identity.normalization) !== JSON.stringify(expectedNormalization) ||
    identity.failureSemantics !== 'FAIL_CLOSED_WITH_NONZERO_EXIT_AND_NO_MANIFEST'
  ) {
    fail('unsupported or incomplete reviewed-content identity contract');
  }

  return identity;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const repositoryRoot = realpathSync(args.repo);
  const discoveredRoot = decodeUtf8(git(repositoryRoot, ['rev-parse', '--show-toplevel']), 'repository root').trimEnd();
  if (realpathSync(discoveredRoot) !== repositoryRoot) fail('--repo must name the Git worktree root');
  if (!SHA_PATTERN.test(args.base)) fail('--base must be an exact lowercase commit object ID');
  const resolvedBase = decodeUtf8(git(repositoryRoot, ['rev-parse', '--verify', `${args.base}^{commit}`]), 'base commit').trimEnd();
  if (resolvedBase !== args.base) fail('--base must resolve to the exact supplied commit');

  const baseEntries = parseBaseTree(repositoryRoot, args.base);
  const indexEntries = parseIndex(repositoryRoot);
  const untrackedPaths = splitNul(git(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z']), 'git ls-files --others');
  splitNul(
    git(repositoryRoot, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames']),
    'git status',
  ).forEach((record) => {
    if (record.startsWith('u ')) fail('unmerged Git status is unsupported');
  });

  const objectFormat = decodeUtf8(git(repositoryRoot, ['rev-parse', '--show-object-format']), 'Git object format').trimEnd();
  if (objectFormat !== 'sha1' && objectFormat !== 'sha256') fail(`unsupported Git object format: ${objectFormat}`);
  const paths = new Set([...baseEntries.keys(), ...indexEntries.keys(), ...untrackedPaths]);
  assertNoPathPrefixCollisions(paths);
  const orderedPaths = [...paths].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
  for (const path of orderedPaths) {
    safePath(repositoryRoot, path);
    assertNoAncestorSymlink(repositoryRoot, path);
  }

  const contractPath = fileURLToPath(new URL('../references/supervisor-contract.json', import.meta.url));
  const identityContract = validateIdentityContract(JSON.parse(readFileSync(contractPath, 'utf8')));
  if (!paths.has(identityContract.activeExecPlanDiscovery.indexPath)) fail('active ExecPlan index is absent from candidate paths');
  const activeExecPlan = discoverActiveExecPlan(repositoryRoot, identityContract.activeExecPlanDiscovery);
  if (!paths.has(activeExecPlan)) fail('active ExecPlan is absent from candidate paths');
  const activePlanCandidate = candidateEntry(repositoryRoot, activeExecPlan);
  if (activePlanCandidate === null || activePlanCandidate.mode === '120000') fail('active ExecPlan must be a regular UTF-8 file');
  const normalizedActivePlanCandidate = {
    ...activePlanCandidate,
    bytes: normalizeExecPlan(activePlanCandidate.bytes, activeExecPlan, identityContract.normalization),
  };
  const entries = [];

  for (const path of orderedPaths) {
    const baseEntry = baseEntries.get(path) ?? null;
    const candidate = path === activeExecPlan ? normalizedActivePlanCandidate : candidateEntry(repositoryRoot, path);
    let baseObjectId = baseEntry?.objectId ?? null;

    if (path === activeExecPlan) {
      if (baseEntry !== null) {
        const baseBytes = git(repositoryRoot, ['cat-file', 'blob', baseEntry.objectId]);
        baseObjectId = gitObjectId(objectFormat, normalizeExecPlan(baseBytes, path, identityContract.normalization));
      }
    }

    const candidateObjectId = candidate === null ? null : gitObjectId(objectFormat, candidate.bytes);
    if (baseEntry !== null && candidate !== null && baseEntry.mode === candidate.mode && baseObjectId === candidateObjectId) continue;
    if (baseEntry === null && candidate === null) continue;

    entries.push({
      path,
      status: baseEntry === null ? 'ADDED' : candidate === null ? 'DELETED' : 'MODIFIED',
      mode: candidate?.mode ?? null,
      contentSha256: candidate === null ? null : createHash('sha256').update(candidate.bytes).digest('hex'),
    });
  }

  const manifest = {
    format: identityContract.format,
    digestAlgorithm: identityContract.digestAlgorithm,
    encoding: identityContract.canonicalEncoding,
    lineSeparator: identityContract.lineSeparator,
    pathEncoding: identityContract.pathEncoding,
    pathOrder: identityContract.pathOrder,
    normalizationVersion: identityContract.normalization.version,
    baseCommit: args.base,
    activeExecPlan,
    entries,
  };
  const canonicalManifest = `${JSON.stringify(manifest)}\n`;
  const identity = `sha256:${createHash('sha256').update(canonicalManifest, 'utf8').digest('hex')}`;
  process.stdout.write(`${JSON.stringify({ manifest, canonicalManifest, identity }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`reviewed-content-identity: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
