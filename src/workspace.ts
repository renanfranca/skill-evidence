import { createTwoFilesPatch } from 'diff';
import { chmod, cp, lstat, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './canonical.js';

export async function copyFiltered(source: string, destination: string, excluded: Set<string>): Promise<void> {
  await mkdir(destination, { recursive: true });
  for (const name of await readdir(source)) {
    if (excluded.has(name)) continue;
    const from = path.join(source, name);
    const to = path.join(destination, name);
    const stat = await lstat(from);
    if (stat.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${from}`);
    if (stat.isDirectory()) await copyFiltered(from, to, excluded);
    else if (stat.isFile()) await cp(from, to, { preserveTimestamps: false });
  }
}

export async function makeReadOnly(root: string): Promise<void> {
  const stat = await lstat(root);
  if (stat.isDirectory()) {
    for (const entry of await readdir(root)) await makeReadOnly(path.join(root, entry));
    await chmod(root, 0o555);
  } else await chmod(root, 0o444);
}

export async function snapshot(root: string, ignored = new Set<string>()): Promise<Record<string, { digest: string; content: string }>> {
  const result: Record<string, { digest: string; content: string }> = {};
  async function visit(directory: string, relative = ''): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      if (ignored.has(name)) continue;
      const absolute = path.join(directory, name);
      const itemPath = path.posix.join(relative, name);
      const stat = await lstat(absolute);
      if (stat.isDirectory()) await visit(absolute, itemPath);
      else if (stat.isFile()) {
        const content = await readFile(absolute, 'utf8');
        result[itemPath] = { digest: sha256(content), content };
      }
    }
  }
  await visit(root);
  return result;
}

export function snapshotDiff(
  before: Record<string, { digest: string; content: string }>,
  after: Record<string, { digest: string; content: string }>,
): string {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return names
    .filter(name => before[name]?.digest !== after[name]?.digest)
    .map(name =>
      createTwoFilesPatch(`a/${name}`, `b/${name}`, before[name]?.content ?? '', after[name]?.content ?? '', '', '', { context: 3 }),
    )
    .join('');
}

export async function forceRemove(root: string): Promise<void> {
  await chmod(root, 0o755).catch(() => undefined);
  for (const entry of await readdir(root).catch(() => [])) {
    const item = path.join(root, entry);
    const stat = await lstat(item);
    if (stat.isDirectory()) await forceRemove(item);
    else await chmod(item, 0o644).catch(() => undefined);
  }
  await rm(root, { recursive: true, force: true });
}
