import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const observedFiles = ['SKILL.md', 'marker.txt', 'target.txt', 'created-by-canary.txt'] as const;

export interface WorkspaceSnapshot {
  entries: Record<string, { exists: boolean; sha256?: string }>;
}

export interface SyntheticWorkspace {
  before: WorkspaceSnapshot;
  dispose: () => Promise<void>;
  instructions: string;
  path: string;
}

function digest(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

async function snapshotFile(path: string): Promise<{ exists: boolean; sha256?: string }> {
  try {
    return { exists: true, sha256: digest(await readFile(path, 'utf8')) };
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
}

export async function snapshotWorkspace(path: string): Promise<WorkspaceSnapshot> {
  const entries = await Promise.all(observedFiles.map(async (file) => [file, await snapshotFile(join(path, file))] as const));
  return { entries: Object.fromEntries(entries) };
}

export async function createSyntheticWorkspace(): Promise<SyntheticWorkspace> {
  const path = await mkdtemp(join(tmpdir(), 'skill-evidence-canary-'));
  try {
    await Promise.all([
      writeFile(join(path, 'SKILL.md'), '# Synthetic E2 skill\nFollow the canary instructions exactly.\n'),
      writeFile(join(path, 'marker.txt'), 'E2_CANARY_MARKER\n'),
      writeFile(join(path, 'target.txt'), 'BEFORE\n'),
    ]);
    await execFile('git', ['init', '--quiet'], { cwd: path });
    const before = await snapshotWorkspace(path);
    return {
      before,
      dispose: async () => rm(path, { force: true, recursive: true }),
      instructions: [
        'Read SKILL.md.',
        'Read marker.txt.',
        'Run the deterministic local command `git status --short`.',
        'Run the harmless failing local command `git show --no-such-revision`, then continue.',
        'Create created-by-canary.txt containing CANARY_CREATED.',
        'Replace target.txt with AFTER.',
        'Respond with exactly E2_CANARY_OK.',
      ].join('\n'),
      path,
    };
  } catch (error) {
    await rm(path, { force: true, recursive: true });
    throw error;
  }
}
