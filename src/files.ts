import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canonicalJson, sha256 } from './canonical.js';

export function safeResolve(root: string, relative: string): string {
  if (path.isAbsolute(relative) || relative.includes('\0')) throw new Error(`Unsafe path: ${relative}`);
  const resolved = path.resolve(root, relative);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (resolved !== path.resolve(root) && !resolved.startsWith(prefix)) throw new Error(`Path escapes evaluation directory: ${relative}`);
  return resolved;
}

export async function assertNoSymlinks(root: string): Promise<void> {
  const stat = await lstat(root);
  if (stat.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${root}`);
  if (!stat.isDirectory()) return;
  for (const entry of await readdir(root)) await assertNoSymlinks(path.join(root, entry));
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

export async function writeCanonicalJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, canonicalJson(value), { encoding: 'utf8', mode: 0o600 });
}

export async function directoryFingerprint(root: string, excluded: Set<string> = new Set()): Promise<string> {
  const actualRoot = await realpath(root);
  const entries: { path: string; digest: string }[] = [];
  async function visit(directory: string, relative = ''): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      if (excluded.has(name)) continue;
      const absolute = path.join(directory, name);
      const itemPath = path.posix.join(relative.split(path.sep).join('/'), name);
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${itemPath}`);
      if (stat.isDirectory()) await visit(absolute, itemPath);
      else if (stat.isFile()) entries.push({ path: itemPath, digest: sha256(await readFile(absolute)) });
    }
  }
  await visit(actualRoot);
  return sha256(canonicalJson(entries));
}
