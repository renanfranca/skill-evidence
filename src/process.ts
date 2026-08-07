import { spawn } from 'node:child_process';
import { mkdtemp, open, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runProcess(
  argv: string[],
  options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<ProcessResult> {
  if (argv.length === 0) throw new Error('Empty command');
  const [command, ...args] = argv;
  if (!command) throw new Error('Empty command');
  const captureDirectory = await mkdtemp(path.join(os.tmpdir(), 'skill-evidence-process-'));
  const stdoutFile = path.join(captureDirectory, 'stdout');
  const stderrFile = path.join(captureDirectory, 'stderr');
  const stdoutHandle = await open(stdoutFile, 'w', 0o600);
  const stderrHandle = await open(stderrFile, 'w', 0o600);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? reducedEnvironment(),
      shell: false,
      stdio: ['ignore', stdoutHandle.fd, stderrHandle.fd],
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), options.timeoutMs);
    let settled = false;
    child.once('error', error => {
      settled = true;
      clearTimeout(timer);
      void Promise.all([stdoutHandle.close(), stderrHandle.close()]).finally(() => {
        void rm(captureDirectory, { recursive: true, force: true });
        reject(error);
      });
    });
    child.once('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void (async () => {
        await Promise.all([stdoutHandle.close(), stderrHandle.close()]);
        const [stdout, stderr] = await Promise.all([readFile(stdoutFile, 'utf8'), readFile(stderrFile, 'utf8')]);
        await rm(captureDirectory, { recursive: true, force: true });
        resolve({ exitCode: code ?? 1, stdout, stderr });
      })().catch(reject);
    });
  });
}

export function reducedEnvironment(): NodeJS.ProcessEnv {
  const allowed = ['PATH', 'CODEX_HOME', 'CODEX_API_KEY', 'OPENAI_API_KEY', 'USER', 'LOGNAME', 'LANG', 'LC_ALL'];
  return Object.fromEntries(allowed.flatMap(key => (process.env[key] === undefined ? [] : [[key, process.env[key]]]))) as NodeJS.ProcessEnv;
}
