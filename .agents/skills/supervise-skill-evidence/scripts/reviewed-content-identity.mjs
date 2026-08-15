#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { TextDecoder } from 'node:util';

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;
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
    if (!['--repo', '--base', '--previous-receipt', '--write-receipt'].includes(option) || value === undefined) {
      fail('usage: --repo <repository> --base <exact-commit> [--previous-receipt <name.json>] [--write-receipt <name.json>]');
    }
    if (result[option.slice(2)] !== undefined) fail(`duplicate option: ${option}`);
    result[option.slice(2)] = value;
  }
  if (typeof result.repo !== 'string' || typeof result.base !== 'string') {
    fail('usage: --repo <repository> --base <exact-commit> [--previous-receipt <name.json>] [--write-receipt <name.json>]');
  }

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

function captureAncestorMetadata(repositoryRoot, path) {
  const components = path.split('/');
  let ancestor = repositoryRoot;
  const metadata = [];

  for (const component of [null, ...components.slice(0, -1)]) {
    if (component !== null) ancestor = join(ancestor, component);
    const repositoryRelativePath = relative(repositoryRoot, ancestor) || '.';
    let stat;
    try {
      stat = lstatSync(ancestor, { bigint: true });
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw error;
    }
    if (stat.isSymbolicLink()) fail(`ancestor symlink is unsupported at ${repositoryRelativePath}`);
    if (!stat.isDirectory()) fail(`non-directory ancestor is unsupported at ${repositoryRelativePath}`);
    metadata.push({ path: ancestor, repositoryRelativePath, stat });
  }

  return metadata;
}

function assertAncestorsUnchanged(ancestors) {
  for (const ancestor of ancestors) {
    let stat;
    try {
      stat = lstatSync(ancestor.path, { bigint: true });
    } catch (error) {
      if (error && error.code === 'ENOENT') fail(`ancestor changed during collection at ${ancestor.repositoryRelativePath}`);
      throw error;
    }
    if (!stat.isDirectory() || !sameEntryMetadata(ancestor.stat, stat)) {
      fail(`ancestor changed during collection at ${ancestor.repositoryRelativePath}`);
    }
  }
}

function assertNoAncestorSymlink(repositoryRoot, path) {
  captureAncestorMetadata(repositoryRoot, path);
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
  const ancestors = captureAncestorMetadata(repositoryRoot, path);
  let stat;
  try {
    stat = lstatSync(absolutePath, { bigint: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
  if (ancestors === null) fail(`ancestor changed during collection at ${path}`);

  if (stat.isSymbolicLink()) {
    let bytes;
    try {
      bytes = readlinkSync(absolutePath, { encoding: 'buffer' });
    } catch (error) {
      if (error && (error.code === 'EINVAL' || error.code === 'ENOENT')) fail(`candidate symlink changed during collection at ${path}`);
      throw error;
    }
    let after;
    try {
      after = lstatSync(absolutePath, { bigint: true });
    } catch (error) {
      if (error && error.code === 'ENOENT') fail(`candidate symlink changed during collection at ${path}`);
      throw error;
    }
    if (!after.isSymbolicLink() || !sameEntryMetadata(stat, after)) fail(`candidate symlink changed during collection at ${path}`);
    assertAncestorsUnchanged(ancestors);

    return { bytes, mode: '120000' };
  }
  if (stat.isFile()) {
    if (typeof constants.O_NOFOLLOW !== 'number') fail('no-follow regular-file reads are unsupported on this platform');
    let descriptor;
    try {
      descriptor = openSync(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
      if (error && (error.code === 'ELOOP' || error.code === 'ENOENT')) fail(`candidate entry changed during collection at ${path}`);
      throw error;
    }

    try {
      const before = fstatSync(descriptor, { bigint: true });
      if (!sameEntryMetadata(stat, before)) fail(`candidate entry changed during collection at ${path}`);
      const bytes = readFileSync(descriptor);
      const after = fstatSync(descriptor, { bigint: true });
      if (!sameEntryMetadata(before, after)) fail(`candidate entry changed during collection at ${path}`);
      assertAncestorsUnchanged(ancestors);

      return { bytes, mode: (before.mode & 0o111n) === 0n ? '100644' : '100755' };
    } finally {
      closeSync(descriptor);
    }
  }
  return fail(`unsupported working-tree entry at ${path}`);
}

function sameEntryMetadata(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.rdev === right.rdev &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function gitObjectId(algorithm, bytes) {
  return createHash(algorithm)
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

function activeExecPlanRevision(bytes, path) {
  const text = decodeUtf8(bytes, path);
  const matches = [...text.matchAll(/^- Contract revision: ([1-9][0-9]*)$/gmu)];
  if (matches.length !== 1) fail(`${path} must contain exactly one positive Contract revision`);

  return Number(matches[0][1]);
}

function partitionExecPlan(bytes, path, active, partitions) {
  let text = decodeUtf8(bytes, path);
  if (text.includes('\r')) fail(`${path} contains a noncanonical carriage return`);
  const replacements = [];
  const operationalSections = [];
  const allHeadings = [...text.matchAll(/^## (.+)$/gmu)].map((match, ordinal) => ({
    heading: match[1],
    index: match.index,
    ordinal,
  }));

  for (const section of partitions.sections) {
    const { heading, marker } = section;
    const headingPattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'gmu');
    const matches = [...text.matchAll(headingPattern)];
    const required = active;
    if (matches.length > 1 || (required && matches.length !== 1)) {
      fail(`${path} must contain ${active ? 'exactly one' : 'zero or one'} ## ${heading} section`);
    }
    if (matches.length === 0) continue;
    const start = matches[0].index;
    const remainder = text.slice(start + matches[0][0].length);
    const nextHeading = /^## .+$/gmu.exec(remainder);
    const end = nextHeading?.index === undefined ? text.length : start + matches[0][0].length + nextHeading.index;
    if ((active ? section.active : section.inactive) === 'OPERATIONAL') {
      const ordinal = allHeadings.findIndex((candidate) => candidate.index === start);
      operationalSections.push({
        heading,
        bytes: Buffer.from(text.slice(start, end), 'utf8'),
        placement: {
          ordinal,
          afterHeading: ordinal > 0 ? (allHeadings[ordinal - 1]?.heading ?? null) : null,
          beforeHeading: ordinal + 1 < allHeadings.length ? (allHeadings[ordinal + 1]?.heading ?? null) : null,
        },
      });
    }
    if (active) {
      replacements.push({ end, replacement: `## ${heading}\n\n${marker}\n\n`, start });
    } else {
      const removalStart = start > 0 && text[start - 1] === '\n' ? start - 1 : start;
      const removalEnd = end < text.length && end > 0 && text[end - 1] === '\n' ? end - 1 : end;
      replacements.push({ end: removalEnd, replacement: '', start: removalStart });
    }
  }
  replacements.sort((left, right) => right.start - left.start);
  for (const { end, replacement, start } of replacements) text = `${text.slice(0, start)}${replacement}${text.slice(end)}`;

  return { materialBytes: Buffer.from(text, 'utf8'), operationalSections };
}

function discoverActiveExecPlan(repositoryRoot, discovery) {
  const indexEntry = candidateEntry(repositoryRoot, discovery.indexPath);
  if (indexEntry === null || indexEntry.mode === '120000') fail(`missing regular ${discovery.indexPath}`);
  const index = decodeUtf8(indexEntry.bytes, discovery.indexPath);
  const activeRows = index.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
    const cells = trimmed.slice(1, -1).split('|');
    return cells[1]?.trim() === discovery.activeStatus;
  });
  if (activeRows.length !== discovery.requiredMatches) {
    fail(`expected exactly ${discovery.requiredMatches} active ExecPlan status cell`);
  }
  const activeCells = (activeRows[0] ?? '')
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
  const match = /^\[[^\]\r\n]+\]\(([^)\r\n]+)\)$/u.exec(activeCells[0] ?? '');
  if (match === null) fail('active ExecPlan row must contain one canonical direct-child plan link');
  const target = match[1];
  if (target === undefined || !new RegExp(discovery.directChildFilePattern, 'u').test(target)) {
    fail(`active ExecPlan target must be a canonical direct child of ${discovery.directory}`);
  }
  const path = `${discovery.directory}/${target}`;
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
  const expectedPartitions = {
    version: 'skill-evidence-execplan-partitions/v2',
    sections: [
      {
        heading: 'Existing Context',
        marker: '<!-- skill-evidence-partitioned:existing-context:v2 -->',
        active: 'OPERATIONAL',
        inactive: 'OPERATIONAL',
      },
      {
        heading: 'Supervisor Record',
        marker: '<!-- skill-evidence-partitioned:supervisor-record:v2 -->',
        active: 'IDENTITY_NEUTRAL',
        inactive: 'OPERATIONAL',
      },
      {
        heading: 'Progress',
        marker: '<!-- skill-evidence-partitioned:progress:v2 -->',
        active: 'IDENTITY_NEUTRAL',
        inactive: 'OPERATIONAL',
      },
      {
        heading: 'Lessons Learned',
        marker: '<!-- skill-evidence-partitioned:lessons-learned:v2 -->',
        active: 'IDENTITY_NEUTRAL',
        inactive: 'OPERATIONAL',
      },
    ],
    activeCardinality: 'EXACTLY_ONE_EACH',
    inactiveCardinality: 'ZERO_OR_ONE_EACH',
    indexPartition: 'MATERIAL',
  };
  if (
    contract.schemaVersion !== 2 ||
    contract.conflictRule !== 'DENY_ON_CONFLICT' ||
    identity?.format !== 'skill-evidence-reviewed-content/v2' ||
    identity.materialFormat !== 'skill-evidence-reviewed-material/v2' ||
    identity.operationalEvidenceFormat !== 'skill-evidence-operational-evidence/v2' ||
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
        ancestorObservation: 'STABLE_PRE_POST_LSTAT_AROUND_REGULAR_AND_SYMLINK_LEAF_READS',
        prefixCollisions: 'REJECT_BEFORE_CONTENT_READ',
        leafSymlinks: 'HASH_RAW_LINK_TARGET_BYTES',
        leafSymlinkObservation: 'STABLE_PRE_POST_LSTAT_AROUND_READLINK',
        regularFiles: 'NOFOLLOW_DESCRIPTOR_WITH_STABLE_PRE_POST_METADATA',
      }) ||
    JSON.stringify(identity.deletionRepresentation) !== JSON.stringify({ mode: null, contentSha256: null }) ||
    JSON.stringify(identity.activeExecPlanDiscovery) !==
      JSON.stringify({
        indexPath: 'docs/execplans/README.md',
        activeStatus: 'Active',
        requiredMatches: 1,
        directory: 'docs/execplans',
        directChildFilePattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\\.md$',
      }) ||
    JSON.stringify(identity.partitions) !== JSON.stringify(expectedPartitions) ||
    identity.receiptPersistence?.format !== 'skill-evidence-review-coverage/v2' ||
    identity.receiptPersistence?.directory !== '.skill-evidence/supervisor/reviews' ||
    identity.receiptPersistence?.previousOption !== '--previous-receipt' ||
    identity.receiptPersistence?.writeOption !== '--write-receipt' ||
    identity.receiptPersistence?.writeMode !== 'ATOMIC_CREATE_ONLY' ||
    identity.receiptPersistence?.content !== 'PATHS_AND_HASHES_ONLY' ||
    identity.receiptPersistence?.invalidPreviousDisposition !== 'FULL_REVIEW_REQUIRED' ||
    JSON.stringify(identity.receiptPersistence?.incrementBinding) !== JSON.stringify(['ACTIVE_EXECPLAN', 'PLAN_REVISION']) ||
    identity.receiptPersistence?.coverageValidation !== 'IDENTITY_BOUND_CANONICAL_REVIEW_CHAIN' ||
    identity.receiptPersistence?.roundLedger !== 'INDEPENDENT_MONOTONIC_DISTINCT_MATERIAL_IDENTITIES' ||
    identity.receiptPersistence?.directoryConfinement !== 'HELD_NOFOLLOW_DIRECTORY_DESCRIPTOR' ||
    JSON.stringify(identity.receiptPersistence?.artifactFormats) !==
      JSON.stringify({
        foundationReview: 'skill-evidence-foundation-review/v1',
        operationalDeltaCheck: 'skill-evidence-operational-delta-check/v1',
        reinforcedRoundStart: 'skill-evidence-reinforced-round-start/v1',
        findingDisposition: 'skill-evidence-finding-disposition/v1',
      }) ||
    JSON.stringify(contract.review?.operationalDeltaSemantics) !==
      JSON.stringify({
        checks: [
          'IDENTITIES_REPRODUCED_TWICE',
          'MATERIAL_IDENTITY_UNCHANGED',
          'OPERATIONAL_ALLOWLIST',
          'UTF8_LF',
          'SECTION_CARDINALITY',
          'APPLICABLE_FORMAT_LINK_PATH_DIFF_CHECKS',
        ],
        dispatch: 'NO_REVIEWER_CONSOLIDATOR_OR_MODEL',
        semanticAdjudication: 'FORBIDDEN',
        findingDisposition: 'MATERIAL_P0_P2_NONE_MECHANICALLY_CARRIED',
      }) ||
    JSON.stringify(identity.stableCollection) !==
      JSON.stringify({
        requiredConsecutiveCollections: 2,
        eachCollection: ['GIT_BASE_TREE', 'GIT_INDEX', 'GIT_UNTRACKED', 'GIT_STATUS', 'ACTIVE_EXECPLAN_DISCOVERY', 'CANDIDATE_ENTRY_READS'],
        comparison: 'BYTE_IDENTICAL_CANONICAL_MANIFESTS',
        output: 'EMIT_ONLY_AFTER_MATCH',
      }) ||
    identity.failureSemantics !== 'FAIL_CLOSED_WITH_NONZERO_EXIT_AND_NO_MANIFEST'
  ) {
    fail('unsupported or incomplete reviewed-content identity contract');
  }

  return identity;
}

function collectManifests(repositoryRoot, baseCommit, objectFormat, identityContract) {
  const baseEntries = parseBaseTree(repositoryRoot, baseCommit);
  const indexEntries = parseIndex(repositoryRoot);
  const untrackedPaths = splitNul(git(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z']), 'git ls-files --others');
  splitNul(
    git(repositoryRoot, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames']),
    'git status',
  ).forEach((record) => {
    if (record.startsWith('u ')) fail('unmerged Git status is unsupported');
  });

  const paths = new Set([...baseEntries.keys(), ...indexEntries.keys(), ...untrackedPaths]);
  assertNoPathPrefixCollisions(paths);
  const orderedPaths = [...paths].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')));
  for (const path of orderedPaths) {
    safePath(repositoryRoot, path);
    assertNoAncestorSymlink(repositoryRoot, path);
  }

  if (!paths.has(identityContract.activeExecPlanDiscovery.indexPath)) fail('active ExecPlan index is absent from candidate paths');
  const activeExecPlan = discoverActiveExecPlan(repositoryRoot, identityContract.activeExecPlanDiscovery);
  if (!paths.has(activeExecPlan)) fail('active ExecPlan is absent from candidate paths');
  const materialEntries = [];
  const operationalBySection = new Map();
  const execPlanPattern = new RegExp(identityContract.activeExecPlanDiscovery.directChildFilePattern, 'u');
  let planRevision = null;

  for (const path of orderedPaths) {
    const baseEntry = baseEntries.get(path) ?? null;
    const candidate = candidateEntry(repositoryRoot, path);
    let baseObjectId = baseEntry?.objectId ?? null;
    let materialCandidate = candidate;
    const relativePlanPath = path.slice(identityContract.activeExecPlanDiscovery.directory.length + 1);
    const isExecPlan = path.startsWith(`${identityContract.activeExecPlanDiscovery.directory}/`) && execPlanPattern.test(relativePlanPath);

    if (isExecPlan && candidate !== null) {
      if (candidate.mode === '120000') fail(`ExecPlan must be a regular UTF-8 file at ${path}`);
      if (path === activeExecPlan) planRevision = activeExecPlanRevision(candidate.bytes, path);
      const partitioned = partitionExecPlan(candidate.bytes, path, path === activeExecPlan, identityContract.partitions);
      materialCandidate = { ...candidate, bytes: partitioned.materialBytes };
      for (const section of partitioned.operationalSections) {
        operationalBySection.set(`${path}\0${section.heading}`, {
          path,
          section: section.heading,
          baseSha256: null,
          candidateSha256: createHash('sha256').update(section.bytes).digest('hex'),
          basePlacement: null,
          candidatePlacement: section.placement,
        });
      }
    }
    if (isExecPlan && baseEntry !== null) {
      const partitioned = partitionExecPlan(
        git(repositoryRoot, ['cat-file', 'blob', baseEntry.objectId]),
        path,
        path === activeExecPlan,
        identityContract.partitions,
      );
      baseObjectId = gitObjectId(objectFormat, partitioned.materialBytes);
      for (const section of partitioned.operationalSections) {
        const key = `${path}\0${section.heading}`;
        const baseSha256 = createHash('sha256').update(section.bytes).digest('hex');
        const value = operationalBySection.get(key);
        operationalBySection.set(
          key,
          value === undefined
            ? {
                path,
                section: section.heading,
                baseSha256,
                candidateSha256: null,
                basePlacement: section.placement,
                candidatePlacement: null,
              }
            : { ...value, baseSha256, basePlacement: section.placement },
        );
      }
    }

    const candidateObjectId = materialCandidate === null ? null : gitObjectId(objectFormat, materialCandidate.bytes);
    if (baseEntry !== null && materialCandidate !== null && baseEntry.mode === materialCandidate.mode && baseObjectId === candidateObjectId)
      continue;
    if (baseEntry === null && materialCandidate === null) continue;

    materialEntries.push({
      path,
      status: baseEntry === null ? 'ADDED' : materialCandidate === null ? 'DELETED' : 'MODIFIED',
      mode: materialCandidate?.mode ?? null,
      contentSha256: materialCandidate === null ? null : createHash('sha256').update(materialCandidate.bytes).digest('hex'),
    });
  }
  if (!Number.isSafeInteger(planRevision) || planRevision < 1) fail('active ExecPlan revision was not collected');

  const materialManifest = {
    format: identityContract.materialFormat,
    digestAlgorithm: identityContract.digestAlgorithm,
    encoding: identityContract.canonicalEncoding,
    lineSeparator: identityContract.lineSeparator,
    pathEncoding: identityContract.pathEncoding,
    pathOrder: identityContract.pathOrder,
    partitionVersion: identityContract.partitions.version,
    baseCommit,
    activeExecPlan,
    entries: materialEntries,
  };
  const operationalEvidenceManifest = {
    format: identityContract.operationalEvidenceFormat,
    digestAlgorithm: identityContract.digestAlgorithm,
    encoding: identityContract.canonicalEncoding,
    lineSeparator: identityContract.lineSeparator,
    pathEncoding: identityContract.pathEncoding,
    pathOrder: identityContract.pathOrder,
    partitionVersion: identityContract.partitions.version,
    baseCommit,
    activeExecPlan,
    entries: [...operationalBySection.values()]
      .filter(
        ({ baseSha256, candidateSha256, basePlacement, candidatePlacement }) =>
          baseSha256 !== candidateSha256 || JSON.stringify(basePlacement) !== JSON.stringify(candidatePlacement),
      )
      .sort((left, right) => Buffer.compare(Buffer.from(`${left.path}\0${left.section}`), Buffer.from(`${right.path}\0${right.section}`)))
      .map(({ path, section, baseSha256, candidateSha256, candidatePlacement }) => ({
        path,
        section,
        status: baseSha256 === null ? 'ADDED' : candidateSha256 === null ? 'DELETED' : 'MODIFIED',
        contentSha256: candidateSha256,
        placement: candidatePlacement,
      })),
  };

  return {
    materialManifest,
    operationalEvidenceManifest,
    canonicalMaterialManifest: `${JSON.stringify(materialManifest)}\n`,
    canonicalOperationalEvidenceManifest: `${JSON.stringify(operationalEvidenceManifest)}\n`,
    planRevision,
  };
}

function identityFor(canonicalManifest) {
  return `sha256:${createHash('sha256').update(canonicalManifest, 'utf8').digest('hex')}`;
}

function receiptPath(repositoryRoot, name, persistence) {
  if (!/^[a-z0-9][a-z0-9.-]*\.json$/u.test(name)) fail('receipt name must be a lowercase .json basename');
  return join(repositoryRoot, persistence.directory, name);
}

function openConfinedReceiptDirectory(repositoryRoot, persistence) {
  if (
    process.platform !== 'linux' ||
    typeof constants.O_DIRECTORY !== 'number' ||
    typeof constants.O_NOFOLLOW !== 'number' ||
    !realpathSync('/proc/self/fd').startsWith('/proc/')
  ) {
    fail('confined receipt persistence is unsupported on this platform');
  }
  const flags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let descriptor = openSync(repositoryRoot, flags);
  let logicalRelativePath = '';
  try {
    for (const component of persistence.directory.split('/')) {
      logicalRelativePath = logicalRelativePath.length === 0 ? component : `${logicalRelativePath}/${component}`;
      const anchoredPath = `/proc/self/fd/${descriptor}/${component}`;
      let nextDescriptor;
      try {
        nextDescriptor = openSync(anchoredPath, flags);
      } catch (error) {
        if (error && error.code === 'ELOOP') fail(`receipt directory ancestor is a symlink: ${logicalRelativePath}`);
        if (error && error.code === 'ENOTDIR') {
          const stat = lstatSync(anchoredPath);
          fail(
            stat.isSymbolicLink()
              ? `receipt directory ancestor is a symlink: ${logicalRelativePath}`
              : `receipt directory ancestor is not a directory: ${logicalRelativePath}`,
          );
        }
        if (!error || error.code !== 'ENOENT') throw error;
        try {
          mkdirSync(anchoredPath, { mode: 0o700 });
        } catch (mkdirError) {
          if (!mkdirError || mkdirError.code !== 'EEXIST') throw mkdirError;
        }
        try {
          nextDescriptor = openSync(anchoredPath, flags);
        } catch (openError) {
          if (openError && openError.code === 'ELOOP') fail(`receipt directory ancestor is a symlink: ${logicalRelativePath}`);
          if (openError && openError.code === 'ENOTDIR') fail(`receipt directory ancestor is not a directory: ${logicalRelativePath}`);
          throw openError;
        }
      }
      closeSync(descriptor);
      descriptor = nextDescriptor;
    }

    return descriptor;
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function assertReceiptDirectoryBinding(repositoryRoot, persistence, descriptor) {
  const expected = fstatSync(descriptor, { bigint: true });
  const logicalPath = join(repositoryRoot, persistence.directory);
  assertNoAncestorSymlink(repositoryRoot, persistence.directory);
  const currentDescriptor = openSync(logicalPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    const current = fstatSync(currentDescriptor, { bigint: true });
    if (!sameEntryMetadata(expected, current)) fail('receipt directory changed during persistence');
  } finally {
    closeSync(currentDescriptor);
  }
}

function hasExactKeys(value, expectedKeys) {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length && expectedKeys.every((key) => keys.includes(key));
}

function readCoverageArtifact(repositoryRoot, reference) {
  if (
    reference === null ||
    typeof reference !== 'object' ||
    !hasExactKeys(reference, ['path', 'sha256']) ||
    typeof reference.path !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(reference.sha256)
  ) {
    fail('invalid coverage reference');
  }
  safePath(repositoryRoot, reference.path);
  const entry = candidateEntry(repositoryRoot, reference.path);
  if (entry === null || entry.mode === '120000') fail('missing regular coverage artifact');
  if (createHash('sha256').update(entry.bytes).digest('hex') !== reference.sha256) fail('coverage artifact digest mismatch');
  const text = decodeUtf8(entry.bytes, reference.path);
  const artifact = JSON.parse(text);
  if (text !== `${JSON.stringify(artifact)}\n`) fail('coverage artifact is not canonical JSON');

  return artifact;
}

function validateRoundArtifact(artifact, receipt) {
  if (
    artifact === null ||
    typeof artifact !== 'object' ||
    !hasExactKeys(artifact, [
      'format',
      'kind',
      'activeExecPlan',
      'planRevision',
      'baseCommitAtDispatch',
      'materialIdentity',
      'topology',
      'outcome',
    ]) ||
    artifact.format !== 'skill-evidence-reinforced-round-start/v1' ||
    artifact.kind !== 'REINFORCED_ROUND_STARTED' ||
    artifact.activeExecPlan !== receipt.activeExecPlan ||
    artifact.planRevision !== receipt.planRevision ||
    !SHA_PATTERN.test(artifact.baseCommitAtDispatch) ||
    !IDENTITY_PATTERN.test(artifact.materialIdentity) ||
    artifact.topology !== 'REINFORCED' ||
    artifact.outcome !== 'STARTED'
  ) {
    fail('invalid reinforced round artifact');
  }
}

function validateCompleteCoverage(repositoryRoot, receipt) {
  const coverage = receipt.coverage;
  if (coverage.foundationReview === null || coverage.findingDisposition === null) fail('incomplete receipt coverage');
  const foundation = readCoverageArtifact(repositoryRoot, coverage.foundationReview);
  if (
    foundation === null ||
    typeof foundation !== 'object' ||
    !hasExactKeys(foundation, [
      'format',
      'kind',
      'baseCommit',
      'activeExecPlan',
      'planRevision',
      'materialIdentity',
      'operationalEvidenceIdentity',
      'topology',
      'outcome',
    ]) ||
    foundation.format !== 'skill-evidence-foundation-review/v1' ||
    foundation.kind !== 'FOUNDATION_REVIEW' ||
    foundation.baseCommit !== receipt.baseCommit ||
    foundation.activeExecPlan !== receipt.activeExecPlan ||
    foundation.planRevision !== receipt.planRevision ||
    foundation.materialIdentity !== receipt.material.identity ||
    !IDENTITY_PATTERN.test(foundation.operationalEvidenceIdentity) ||
    !['STANDARD', 'REINFORCED'].includes(foundation.topology) ||
    foundation.outcome !== 'P0_P2_NONE'
  ) {
    fail('invalid foundation review artifact');
  }

  let operationalIdentity = foundation.operationalEvidenceIdentity;
  for (const reference of coverage.acceptedOperationalDeltaChecks) {
    const delta = readCoverageArtifact(repositoryRoot, reference);
    if (
      delta === null ||
      typeof delta !== 'object' ||
      !hasExactKeys(delta, [
        'format',
        'kind',
        'baseCommit',
        'activeExecPlan',
        'planRevision',
        'materialIdentity',
        'fromOperationalEvidenceIdentity',
        'toOperationalEvidenceIdentity',
        'topology',
        'outcome',
      ]) ||
      delta.format !== 'skill-evidence-operational-delta-check/v1' ||
      delta.kind !== 'OPERATIONAL_DELTA_CHECK' ||
      delta.baseCommit !== receipt.baseCommit ||
      delta.activeExecPlan !== receipt.activeExecPlan ||
      delta.planRevision !== receipt.planRevision ||
      delta.materialIdentity !== receipt.material.identity ||
      delta.fromOperationalEvidenceIdentity !== operationalIdentity ||
      !IDENTITY_PATTERN.test(delta.toOperationalEvidenceIdentity) ||
      delta.topology !== 'MECHANICAL_ONLY' ||
      delta.outcome !== 'GREEN'
    ) {
      fail('invalid operational delta check artifact');
    }
    operationalIdentity = delta.toOperationalEvidenceIdentity;
  }
  if (operationalIdentity !== receipt.operationalEvidence.identity) fail('operational check chain is incomplete');

  const disposition = readCoverageArtifact(repositoryRoot, coverage.findingDisposition);
  if (
    disposition === null ||
    typeof disposition !== 'object' ||
    !hasExactKeys(disposition, [
      'format',
      'kind',
      'baseCommit',
      'activeExecPlan',
      'planRevision',
      'materialIdentity',
      'operationalEvidenceIdentity',
      'outcome',
    ]) ||
    disposition.format !== 'skill-evidence-finding-disposition/v1' ||
    disposition.kind !== 'FINDING_DISPOSITION' ||
    disposition.baseCommit !== receipt.baseCommit ||
    disposition.activeExecPlan !== receipt.activeExecPlan ||
    disposition.planRevision !== receipt.planRevision ||
    disposition.materialIdentity !== receipt.material.identity ||
    disposition.operationalEvidenceIdentity !== receipt.operationalEvidence.identity ||
    disposition.outcome !==
      (coverage.acceptedOperationalDeltaChecks.length === 0 ? 'P0_P2_NONE' : 'MATERIAL_P0_P2_NONE_MECHANICALLY_CARRIED')
  ) {
    fail('invalid finding disposition artifact');
  }
}

function validateReceiptStructure(repositoryRoot, receipt, persistence) {
  if (
    receipt === null ||
    typeof receipt !== 'object' ||
    !hasExactKeys(receipt, ['format', 'baseCommit', 'activeExecPlan', 'planRevision', 'material', 'operationalEvidence', 'coverage']) ||
    receipt.format !== persistence.format ||
    !SHA_PATTERN.test(receipt.baseCommit) ||
    typeof receipt.activeExecPlan !== 'string' ||
    !Number.isSafeInteger(receipt.planRevision) ||
    receipt.planRevision < 1
  ) {
    fail('invalid receipt header');
  }
  const coverage = receipt.coverage;
  if (
    coverage === null ||
    typeof coverage !== 'object' ||
    !hasExactKeys(coverage, ['foundationReview', 'acceptedOperationalDeltaChecks', 'reinforcedRounds', 'findingDisposition']) ||
    !Array.isArray(coverage.acceptedOperationalDeltaChecks) ||
    !Array.isArray(coverage.reinforcedRounds)
  ) {
    fail('invalid receipt coverage');
  }
  safePath(repositoryRoot, receipt.activeExecPlan);
  for (const [key, expectedFormat] of [
    ['material', 'skill-evidence-reviewed-material/v2'],
    ['operationalEvidence', 'skill-evidence-operational-evidence/v2'],
  ]) {
    const part = receipt[key];
    const manifest = part?.manifest;
    if (
      manifest?.format !== expectedFormat ||
      manifest.baseCommit !== receipt.baseCommit ||
      manifest.activeExecPlan !== receipt.activeExecPlan ||
      !Array.isArray(manifest.entries) ||
      part.identity !== identityFor(`${JSON.stringify(manifest)}\n`)
    ) {
      fail(`invalid ${key} receipt part`);
    }
    let previousKey = null;
    for (const entry of manifest.entries) {
      if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') fail(`invalid ${key} receipt entry`);
      safePath(repositoryRoot, entry.path);
      if (entry.contentSha256 !== null && !/^[0-9a-f]{64}$/u.test(entry.contentSha256)) fail(`invalid ${key} content digest`);
      if (
        key === 'operationalEvidence' &&
        !['Existing Context', 'Supervisor Record', 'Progress', 'Lessons Learned'].includes(entry.section)
      ) {
        fail('invalid operational section');
      }
      const currentKey = `${entry.path}\0${key === 'operationalEvidence' ? entry.section : ''}`;
      if (previousKey !== null && Buffer.compare(Buffer.from(previousKey), Buffer.from(currentKey)) >= 0)
        fail(`noncanonical ${key} entry order`);
      previousKey = currentKey;
    }
  }

  const materialIdentities = new Set();
  for (const reference of coverage.reinforcedRounds) {
    const artifact = readCoverageArtifact(repositoryRoot, reference);
    validateRoundArtifact(artifact, receipt);
    if (materialIdentities.has(artifact.materialIdentity)) fail('duplicate reinforced round material identity');
    materialIdentities.add(artifact.materialIdentity);
  }

  let coverageValid = true;
  try {
    validateCompleteCoverage(repositoryRoot, receipt);
  } catch {
    coverageValid = false;
  }

  return { coverageValid };
}

function validatedPreviousReceipt(repositoryRoot, name, persistence) {
  const relativePath = `${persistence.directory}/${name}`;
  receiptPath(repositoryRoot, name, persistence);
  try {
    const entry = candidateEntry(repositoryRoot, relativePath);
    if (entry === null) return { invalidReason: 'PREVIOUS_RECEIPT_MISSING' };
    if (entry.mode === '120000') throw new Error('receipt is a symlink');
    const text = decodeUtf8(entry.bytes, name);
    const receipt = JSON.parse(text);
    if (text !== `${JSON.stringify(receipt)}\n`) throw new Error('invalid receipt');
    const { coverageValid } = validateReceiptStructure(repositoryRoot, receipt, persistence);
    return { coverageValid, receipt };
  } catch {
    return { invalidReason: 'PREVIOUS_RECEIPT_INVALID' };
  }
}

function comparisonFor(previous, current) {
  if (previous === undefined)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: 'NO_PREVIOUS_RECEIPT', changedOperationalSections: [] };
  if (previous.invalidReason !== undefined)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: previous.invalidReason, changedOperationalSections: [] };
  const prior = previous.receipt;
  if (prior.baseCommit !== current.baseCommit)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: 'PREVIOUS_RECEIPT_WRONG_BASE', changedOperationalSections: [] };
  if (prior.activeExecPlan !== current.activeExecPlan)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: 'PREVIOUS_RECEIPT_WRONG_ACTIVE_PLAN', changedOperationalSections: [] };
  if (prior.planRevision !== current.planRevision)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: 'PREVIOUS_RECEIPT_WRONG_PLAN_REVISION', changedOperationalSections: [] };
  if (!previous.coverageValid)
    return { classification: 'FULL_REVIEW_REQUIRED', reason: 'PREVIOUS_COVERAGE_INCOMPLETE', changedOperationalSections: [] };
  if (prior.material.identity !== current.material.identity)
    return { classification: 'MATERIAL_DELTA', reason: 'MATERIAL_IDENTITY_CHANGED', changedOperationalSections: [] };
  if (prior.operationalEvidence.identity === current.operationalEvidence.identity)
    return { classification: 'UNCHANGED', reason: 'IDENTITIES_UNCHANGED', changedOperationalSections: [] };
  const before = new Map(
    prior.operationalEvidence.manifest.entries.map((entry) => [
      `${entry.path}#${entry.section}`,
      JSON.stringify([entry.contentSha256, entry.placement]),
    ]),
  );
  const after = new Map(
    current.operationalEvidence.manifest.entries.map((entry) => [
      `${entry.path}#${entry.section}`,
      JSON.stringify([entry.contentSha256, entry.placement]),
    ]),
  );
  const changedOperationalSections = [...new Set([...before.keys(), ...after.keys()])]
    .filter((key) => before.get(key) !== after.get(key))
    .sort();
  return { classification: 'COMPOSABLE_OPERATIONAL_DELTA', reason: 'ONLY_OPERATIONAL_EVIDENCE_CHANGED', changedOperationalSections };
}

function unlinkIfPresent(path) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error;
  }
}

function persistReceipt(repositoryRoot, name, persistence, receipt) {
  receiptPath(repositoryRoot, name, persistence);
  const serialized = `${JSON.stringify(receipt)}\n`;
  const directoryDescriptor = openConfinedReceiptDirectory(repositoryRoot, persistence);
  const anchoredDirectory = `/proc/self/fd/${directoryDescriptor}`;
  const temporaryName = `${name}.tmp-${process.pid}-${createHash('sha256').update(serialized).digest('hex').slice(0, 12)}`;
  const temporary = `${anchoredDirectory}/${temporaryName}`;
  const target = `${anchoredDirectory}/${name}`;
  let linked = false;
  try {
    const descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
      writeFileSync(descriptor, serialized, { encoding: 'utf8' });
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    assertReceiptDirectoryBinding(repositoryRoot, persistence, directoryDescriptor);
    linkSync(temporary, target);
    linked = true;
    fsyncSync(directoryDescriptor);
    assertReceiptDirectoryBinding(repositoryRoot, persistence, directoryDescriptor);
  } catch (error) {
    if (linked) unlinkIfPresent(target);
    throw error;
  } finally {
    unlinkIfPresent(temporary);
    closeSync(directoryDescriptor);
  }
  return { path: `${persistence.directory}/${name}`, sha256: createHash('sha256').update(serialized).digest('hex') };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const repositoryRoot = realpathSync(args.repo);
  const discoveredRoot = decodeUtf8(git(repositoryRoot, ['rev-parse', '--show-toplevel']), 'repository root').trimEnd();
  if (realpathSync(discoveredRoot) !== repositoryRoot) fail('--repo must name the Git worktree root');
  if (!SHA_PATTERN.test(args.base)) fail('--base must be an exact lowercase commit object ID');
  const resolvedBase = decodeUtf8(git(repositoryRoot, ['rev-parse', '--verify', `${args.base}^{commit}`]), 'base commit').trimEnd();
  if (resolvedBase !== args.base) fail('--base must resolve to the exact supplied commit');

  const objectFormat = decodeUtf8(git(repositoryRoot, ['rev-parse', '--show-object-format']), 'Git object format').trimEnd();
  if (objectFormat !== 'sha1' && objectFormat !== 'sha256') fail(`unsupported Git object format: ${objectFormat}`);
  const contractPath = fileURLToPath(new URL('../references/supervisor-contract.json', import.meta.url));
  const identityContract = validateIdentityContract(JSON.parse(readFileSync(contractPath, 'utf8')));
  const first = collectManifests(repositoryRoot, args.base, objectFormat, identityContract);
  const second = collectManifests(repositoryRoot, args.base, objectFormat, identityContract);
  if (
    first.canonicalMaterialManifest !== second.canonicalMaterialManifest ||
    first.canonicalOperationalEvidenceManifest !== second.canonicalOperationalEvidenceManifest ||
    first.planRevision !== second.planRevision
  ) {
    fail('reviewed content changed between consecutive collections');
  }

  const material = {
    manifest: second.materialManifest,
    canonicalManifest: second.canonicalMaterialManifest,
    identity: identityFor(second.canonicalMaterialManifest),
  };
  const operationalEvidence = {
    manifest: second.operationalEvidenceManifest,
    canonicalManifest: second.canonicalOperationalEvidenceManifest,
    identity: identityFor(second.canonicalOperationalEvidenceManifest),
  };
  const receipt = {
    format: identityContract.receiptPersistence.format,
    baseCommit: args.base,
    activeExecPlan: second.materialManifest.activeExecPlan,
    planRevision: second.planRevision,
    material: { manifest: material.manifest, identity: material.identity },
    operationalEvidence: { manifest: operationalEvidence.manifest, identity: operationalEvidence.identity },
    coverage: {
      foundationReview: null,
      acceptedOperationalDeltaChecks: [],
      reinforcedRounds: [],
      findingDisposition: null,
    },
  };
  const previous =
    typeof args['previous-receipt'] === 'string'
      ? validatedPreviousReceipt(repositoryRoot, args['previous-receipt'], identityContract.receiptPersistence)
      : undefined;
  const comparison = comparisonFor(previous, receipt);
  if (
    previous?.receipt !== undefined &&
    previous.receipt.activeExecPlan === receipt.activeExecPlan &&
    previous.receipt.planRevision === receipt.planRevision
  ) {
    receipt.coverage.reinforcedRounds = [...previous.receipt.coverage.reinforcedRounds];
    if (
      previous.coverageValid &&
      previous.receipt.baseCommit === receipt.baseCommit &&
      previous.receipt.material.identity === receipt.material.identity
    ) {
      receipt.coverage = { ...previous.receipt.coverage };
      if (comparison.classification === 'COMPOSABLE_OPERATIONAL_DELTA') receipt.coverage.findingDisposition = null;
    }
  }
  const persistedReceipt =
    typeof args['write-receipt'] === 'string'
      ? persistReceipt(repositoryRoot, args['write-receipt'], identityContract.receiptPersistence, receipt)
      : undefined;
  process.stdout.write(`${JSON.stringify({ material, operationalEvidence, comparison, receipt, persistedReceipt }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`reviewed-content-identity: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
