import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const expectedContents = {
  'SKILL.md': '# Synthetic E2 skill\nFollow the canary instructions exactly.\n',
  'created-by-canary.txt': 'CANARY_CREATED\n',
  'marker.txt': 'E2_CANARY_MARKER\n',
  'target.txt': 'AFTER\n',
} as const;

export interface WorkspaceSnapshot {
  entries: Record<string, { sha256: string; size: number }>;
}

export interface CanaryEffect {
  expected: string;
  observed: boolean;
  path: string;
}

export interface CanaryAssessment {
  effects: CanaryEffect[];
  limitations: string[];
  response: string | null;
  status: 'ERROR' | 'INVALID_CANARY' | 'PASS';
}

export interface SyntheticWorkspace {
  before: WorkspaceSnapshot;
  dispose: () => Promise<void>;
  instructions: string;
  path: string;
}

function digest(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

async function snapshotTree(root: string, current = root): Promise<Record<string, { sha256: string; size: number }>> {
  const entries: Record<string, { sha256: string; size: number }> = {};
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.name === '.git') {
      continue;
    }
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      Object.assign(entries, await snapshotTree(root, path));
    } else if (entry.isFile()) {
      const contents = await readFile(path);
      entries[relative(root, path)] = { sha256: digest(contents), size: contents.length };
    }
  }
  return entries;
}

export async function snapshotWorkspace(path: string): Promise<WorkspaceSnapshot> {
  return { entries: await snapshotTree(path) };
}

export const canaryInstructions = [
  'Read SKILL.md.',
  'Read marker.txt.',
  'Run the deterministic local command `git status --short`.',
  'Run the harmless failing local command `git show --no-such-revision`, then continue.',
  'Create created-by-canary.txt containing CANARY_CREATED.',
  'Replace target.txt with AFTER.',
  'Respond with exactly E2_CANARY_OK.',
].join('\n');

function expectedSnapshot(): Record<string, { sha256: string; size: number }> {
  return Object.fromEntries(
    Object.entries(expectedContents).map(([path, contents]) => {
      const bytes = Buffer.from(contents);
      return [path, { sha256: digest(bytes), size: bytes.length }];
    }),
  );
}

function outputFromSummary(summary: unknown): { output: string | null; providerError: string | null } {
  if (summary === null || typeof summary !== 'object' || !Array.isArray((summary as { results?: unknown }).results)) {
    return { output: null, providerError: 'provider summary was unavailable' };
  }
  const first = (summary as { results: unknown[] }).results[0];
  const response = first !== null && typeof first === 'object' ? (first as { response?: unknown }).response : undefined;
  if (response === null || typeof response !== 'object') {
    return { output: null, providerError: 'provider response was unavailable' };
  }
  return {
    output: typeof (response as { output?: unknown }).output === 'string' ? (response as { output: string }).output : null,
    providerError: typeof (response as { error?: unknown }).error === 'string' ? (response as { error: string }).error : null,
  };
}

export function assessCanary(summary: unknown, after: WorkspaceSnapshot): CanaryAssessment {
  const response = outputFromSummary(summary);
  if (response.providerError !== null) {
    return {
      effects: [],
      limitations: ['Provider or receiver failure prevents canary validation.'],
      response: response.output,
      status: 'ERROR',
    };
  }
  const expected = expectedSnapshot();
  const effects: CanaryEffect[] = Object.entries(expected).map(([path, value]) => ({
    expected: value.sha256,
    observed: after.entries[path]?.sha256 === value.sha256 && after.entries[path]?.size === value.size,
    path,
  }));
  const unexpected = Object.keys(after.entries).filter((path) => !(path in expected));
  effects.push(...unexpected.map((path) => ({ expected: 'absent', observed: false, path })));
  const valid = response.output === 'E2_CANARY_OK' && effects.every((effect) => effect.observed);
  return {
    effects,
    limitations: valid
      ? ['Filesystem state is independent canary ground truth, not causal skill evidence.']
      : ['Invalid canaries cannot support negative claims about missing command, file, ordering, recovery, or skill events.'],
    response: response.output,
    status: valid ? 'PASS' : 'INVALID_CANARY',
  };
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
    await stat(join(path, '.git'));
    return {
      before: await snapshotWorkspace(path),
      dispose: async () => rm(path, { force: true, recursive: true }),
      instructions: canaryInstructions,
      path,
    };
  } catch (error) {
    await rm(path, { force: true, recursive: true });
    throw error;
  }
}
