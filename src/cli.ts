import { execFile } from 'node:child_process';
import { access, mkdtemp, open, readFile, rm, stat, unlink, type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { constants } from 'node:fs';

import { authorEvaluationBlueprint, prepareAuthorInvocation, type AuthorInvoker } from './author/evaluation-author.js';
import { createPromptfooAuthorInvoker } from './author/promptfoo-author-invoker.js';
import { reserveAuthorInvocation } from './author/reservation.js';
import { canonicalJson } from './canonical-json.js';
import { createSkillSnapshot } from './intake/skill-snapshot.js';

const execFileAsync = promisify(execFile);

export type AuthorCommandErrorCode =
  | 'AUTHOR_APPROVAL_REQUIRED'
  | 'AUTHOR_ARGUMENT_INVALID'
  | 'AUTHOR_AUTH_INVALID'
  | 'AUTHOR_CREDENTIAL_ENV_FORBIDDEN'
  | 'AUTHOR_OUTPUT_EXISTS'
  | 'AUTHOR_RUN_ERROR'
  | 'AUTHOR_VERSION_MISMATCH'
  | 'AUTHOR_WORKTREE_DIRTY';

export class AuthorCommandError extends Error {
  readonly code: AuthorCommandErrorCode;

  constructor(code: AuthorCommandErrorCode, message: string) {
    super(message);
    this.name = 'AuthorCommandError';
    this.code = code;
  }
}

interface AuthorCommandArguments {
  approval: string | undefined;
  campaign: string | undefined;
  out: string | undefined;
  skill: string | undefined;
}

export interface AuthorCommandDependencies {
  codexCliVersion?: () => Promise<string>;
  createWorkspace?: () => Promise<{ cleanup: () => Promise<void>; path: string }>;
  currentCommit?: () => Promise<string>;
  environment?: NodeJS.ProcessEnv;
  invoke?: AuthorInvoker;
  repositoryRoot?: string;
  workingTreeClean?: () => Promise<boolean>;
}

export interface AuthorCommandResult {
  blueprintId: string;
  lifecycle: 'BLOCKED' | 'DRAFT' | 'READY';
  status: 'COMPLETED';
}

function parseArguments(args: string[]): AuthorCommandArguments {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  return {
    approval: value('--approve-provider-invocations'),
    campaign: value('--campaign'),
    out: value('--out'),
    skill: value('--skill'),
  };
}

async function gitOutput(repositoryRoot: string, args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
  return result.stdout.trim();
}

async function defaultWorkspace(): Promise<{ cleanup: () => Promise<void>; path: string }> {
  const path = await mkdtemp(join(tmpdir(), 'skill-evidence-author-workspace-'));
  return { cleanup: async () => await rm(path, { force: true, recursive: true }), path };
}

async function assertCodexHome(environment: NodeJS.ProcessEnv): Promise<string> {
  if (environment.OPENAI_API_KEY !== undefined || environment.CODEX_API_KEY !== undefined) {
    throw new AuthorCommandError('AUTHOR_CREDENTIAL_ENV_FORBIDDEN', 'OPENAI_API_KEY and CODEX_API_KEY must be absent');
  }
  const codexHome = environment.SKILL_EVIDENCE_AUTHOR_CODEX_HOME;
  if (codexHome === undefined || codexHome.length === 0) {
    throw new AuthorCommandError('AUTHOR_AUTH_INVALID', 'SKILL_EVIDENCE_AUTHOR_CODEX_HOME must identify a logged-in writable Codex home');
  }
  try {
    const [homeMetadata, authMetadata] = await Promise.all([
      stat(codexHome),
      stat(join(codexHome, 'auth.json')),
      access(codexHome, constants.R_OK | constants.W_OK),
      access(join(codexHome, 'auth.json'), constants.R_OK),
    ]);
    if (!homeMetadata.isDirectory() || !authMetadata.isFile()) {
      throw new Error('invalid Codex home');
    }
  } catch {
    throw new AuthorCommandError('AUTHOR_AUTH_INVALID', 'SKILL_EVIDENCE_AUTHOR_CODEX_HOME must identify a logged-in writable Codex home');
  }
  return codexHome;
}

async function claimBlueprintOutput(path: string): Promise<FileHandle> {
  await access(dirname(path), constants.W_OK);
  try {
    return await open(path, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new AuthorCommandError('AUTHOR_OUTPUT_EXISTS', 'Blueprint output already exists');
    }
    throw error;
  }
}

export async function runAuthorCommand(args: string[], dependencies: AuthorCommandDependencies = {}): Promise<AuthorCommandResult> {
  const parsed = parseArguments(args);
  if (parsed.approval !== '1') {
    throw new AuthorCommandError('AUTHOR_APPROVAL_REQUIRED', 'Author execution requires approval for exactly one provider invocation');
  }
  if (parsed.campaign === undefined || parsed.out === undefined || parsed.skill === undefined) {
    throw new AuthorCommandError('AUTHOR_ARGUMENT_INVALID', 'Author execution requires --skill, --out, and --campaign');
  }
  const repositoryRoot = dependencies.repositoryRoot ?? process.cwd();
  const environment = dependencies.environment ?? process.env;
  const codexHome = await assertCodexHome(environment);
  const currentCommit = dependencies.currentCommit ?? (async () => await gitOutput(repositoryRoot, ['rev-parse', 'HEAD']));
  const workingTreeClean =
    dependencies.workingTreeClean ?? (async () => (await gitOutput(repositoryRoot, ['status', '--porcelain'])) === '');
  const codexCliVersion =
    dependencies.codexCliVersion ??
    (async () => {
      const manifest = JSON.parse(
        await readFile(join(repositoryRoot, 'node_modules', '@openai', 'codex', 'package.json'), 'utf8'),
      ) as unknown;
      return typeof manifest === 'object' && manifest !== null && typeof (manifest as { version?: unknown }).version === 'string'
        ? (manifest as { version: string }).version
        : 'UNAVAILABLE';
    });
  const [commit, clean, version, snapshot] = await Promise.all([
    currentCommit(),
    workingTreeClean(),
    codexCliVersion(),
    createSkillSnapshot({ rootDirectory: resolve(parsed.skill) }),
  ]);
  if (!clean) {
    throw new AuthorCommandError('AUTHOR_WORKTREE_DIRTY', 'the Author canary requires a clean worktree');
  }
  if (version !== '0.147.0') {
    throw new AuthorCommandError('AUTHOR_VERSION_MISMATCH', 'the Author canary requires Codex CLI 0.147.0');
  }
  const prepared = prepareAuthorInvocation(snapshot);
  const outputPath = resolve(parsed.out);
  const outputHandle = await claimBlueprintOutput(outputPath);
  const createWorkspace = dependencies.createWorkspace ?? defaultWorkspace;
  let workspace: Awaited<ReturnType<typeof createWorkspace>> | undefined;
  let outputCommitted = false;
  try {
    workspace = await createWorkspace();
    await reserveAuthorInvocation({
      repositoryRoot,
      reservation: {
        campaignId: parsed.campaign,
        commit,
        conditionFingerprint: prepared.conditionFingerprint,
        packetFingerprint: prepared.packetFingerprint,
        snapshotFingerprint: snapshot.fingerprint,
      },
    });
    const invoke = dependencies.invoke ?? createPromptfooAuthorInvoker({ codexHome, workingDirectory: workspace.path });
    const run = await authorEvaluationBlueprint({ campaignId: parsed.campaign, invoke, snapshot });
    if (run.status === 'ERROR') {
      throw new AuthorCommandError('AUTHOR_RUN_ERROR', `Author invocation ended with ${run.error.code}`);
    }
    if (run.packetFingerprint !== prepared.packetFingerprint) {
      throw new AuthorCommandError('AUTHOR_RUN_ERROR', 'Author invocation ended with INVALID_RESULT');
    }
    await outputHandle.writeFile(`${canonicalJson(run.blueprint)}\n`, 'utf8');
    outputCommitted = true;
    return { blueprintId: run.blueprint.blueprintId, lifecycle: run.blueprint.lifecycle.state, status: 'COMPLETED' };
  } finally {
    await outputHandle.close();
    if (!outputCommitted) {
      await unlink(outputPath).catch(() => undefined);
    }
    await workspace?.cleanup();
  }
}

async function main(): Promise<void> {
  try {
    const result = await runAuthorCommand(process.argv.slice(2));
    process.stdout.write(`${canonicalJson(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
