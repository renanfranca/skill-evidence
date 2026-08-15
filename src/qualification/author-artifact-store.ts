import { constants } from 'node:fs';
import { lstat, link, mkdir, open, realpath, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

import { canonicalJson } from '../canonical-json.js';

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export async function assertConfinedArtifactPath(repositoryRoot: string, targetPath: string): Promise<string> {
  const canonicalRoot = await realpath(repositoryRoot);
  const absoluteTarget = resolve(repositoryRoot, targetPath);
  const targetRelative = relative(canonicalRoot, absoluteTarget);
  if (targetRelative === '..' || targetRelative.startsWith(`..${sep}`) || isAbsolute(targetRelative)) {
    throw new Error('AUTHOR_ARTIFACT_PATH_UNSAFE');
  }
  let current = canonicalRoot;
  for (const segment of targetRelative.split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('AUTHOR_ARTIFACT_PATH_UNSAFE');
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }
  }
  return absoluteTarget;
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function publishJsonNoReplace(input: {
  repositoryRoot: string;
  targetPath: string;
  value: unknown;
  verifyExisting?: boolean;
}): Promise<'CREATED' | 'VERIFIED'> {
  const targetPath = await assertConfinedArtifactPath(input.repositoryRoot, input.targetPath);
  const parent = dirname(targetPath);
  await mkdir(parent, { recursive: true });
  await assertConfinedArtifactPath(input.repositoryRoot, targetPath);
  const temporaryPath = resolve(parent, `.${randomUUID()}.tmp`);
  const serialized = `${canonicalJson(input.value)}\n`;
  let createdTemporary = false;
  try {
    const handle = await open(temporaryPath, 'wx', 0o600);
    createdTemporary = true;
    try {
      await handle.writeFile(serialized, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await link(temporaryPath, targetPath);
      await syncDirectory(parent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || input.verifyExisting !== true) throw error;
      if ((await readConfinedText(input.repositoryRoot, targetPath)) !== serialized) throw new Error('AUTHOR_ARTIFACT_CONFLICT');
      return 'VERIFIED';
    }
    return 'CREATED';
  } finally {
    if (createdTemporary) {
      try {
        await unlink(temporaryPath);
      } catch {
        // The published target remains authoritative; a same-directory orphan is never reused.
      }
    }
  }
}

export async function readConfinedJson(repositoryRoot: string, targetPath: string): Promise<unknown> {
  return JSON.parse(await readConfinedText(repositoryRoot, targetPath)) as unknown;
}

export async function readConfinedText(repositoryRoot: string, targetPath: string): Promise<string> {
  const path = await assertConfinedArtifactPath(repositoryRoot, targetPath);
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP') throw new Error('AUTHOR_ARTIFACT_PATH_UNSAFE');
    throw error;
  }
  try {
    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}
