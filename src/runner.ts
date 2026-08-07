import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalDigest } from './canonical.js';
import { evaluateContracts, evaluatePreconditions } from './checks.js';
import { loadEvaluation } from './evaluation.js';
import { normalizeJsonl } from './events.js';
import { directoryFingerprint, readJson, safeResolve, writeCanonicalJson } from './files.js';
import { skillExclusions } from './plan.js';
import { reducedEnvironment, runProcess } from './process.js';
import { sanitize } from './security.js';
import type { CaseEvidence, CaseStatus, Evidence, RunPlan } from './types.js';
import { copyFiltered, forceRemove, makeReadOnly, snapshot, snapshotDiff } from './workspace.js';

const ignoredWorkspace = new Set(['.git', '.agents', '.codex', 'node_modules']);
const judgeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'rationale'],
  properties: { status: { enum: ['PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR'] }, rationale: { type: 'string' } },
};
const calibrationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['probes'],
  properties: {
    probes: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status'],
        properties: { id: { type: 'string' }, status: { enum: ['PASS', 'FAIL', 'INCONCLUSIVE'] } },
      },
    },
  },
};

export function qualifyCalibration(actual: { probes?: { id: string; status: string }[] }): { id: string; passed: boolean }[] {
  const expected = new Map([
    ['valid', 'PASS'],
    ['invalid', 'FAIL'],
    ['alternative', 'PASS'],
    ['unsupported', 'INCONCLUSIVE'],
  ]);
  return [...expected].map(([id, status]) => ({ id, passed: actual.probes?.find(probe => probe.id === id)?.status === status }));
}

export function resolveCaseStatus(
  judged: CaseStatus,
  executorExitCode: number,
  observabilityComplete: boolean,
  violationCount: number,
): CaseStatus {
  if (executorExitCode !== 0) return 'ERROR';
  if (!observabilityComplete) return 'INCONCLUSIVE';
  if (violationCount > 0) return 'FAIL';
  return judged;
}

function codexArgs(model: string, effort: string, cwd: string, prompt: string, schema?: string): string[] {
  const binary = process.env.SKILL_EVIDENCE_CODEX_BIN ?? 'codex';
  const args = [
    binary,
    '--ask-for-approval',
    'never',
    'exec',
    '--ephemeral',
    '--json',
    '--ignore-user-config',
    '--ignore-rules',
    '--sandbox',
    'workspace-write',
    '--model',
    model,
    '-c',
    `model_reasoning_effort="${effort}"`,
    '-c',
    'sandbox_workspace_write.network_access=false',
    '-C',
    cwd,
  ];
  if (schema) args.push('--output-schema', schema);
  args.push(prompt);
  return args;
}

async function invoke(
  argv: string[],
  cwd: string,
  timeoutMs: number,
): Promise<ReturnType<typeof normalizeJsonl> & { exitCode: number; stderr: string; raw: string }> {
  const fakeOutput = process.env.SKILL_EVIDENCE_CODEX_BIN ? path.join(os.tmpdir(), `skill-evidence-fake-${randomUUID()}.jsonl`) : undefined;
  const result = await runProcess(argv, {
    cwd,
    timeoutMs,
    env: { ...reducedEnvironment(), SKILL_EVIDENCE_ROLE: process.env.SKILL_EVIDENCE_ROLE, SKILL_EVIDENCE_FAKE_OUTPUT: fakeOutput },
  });
  const raw = result.stdout || (fakeOutput ? await readFile(fakeOutput, 'utf8').catch(() => '') : '');
  if (fakeOutput) await rm(fakeOutput, { force: true });
  const normalized = normalizeJsonl(raw);
  return { ...normalized, exitCode: result.exitCode, stderr: result.stderr, raw };
}

async function calibrate(
  plan: RunPlan,
  runDirectory: string,
  timeoutMs: number,
): Promise<{ passed: boolean; probes: { id: string; passed: boolean }[]; usage: { input: number; output: number } }> {
  const workspace = path.join(runDirectory, 'calibration-workspace');
  await mkdir(workspace, { recursive: true });
  await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
  const schemaFile = path.join(runDirectory, 'calibration-output.schema.json');
  await writeCanonicalJson(schemaFile, calibrationSchema);
  const prompt = `You are qualifying as an evidence judge. Return only the structured verdicts. Classify: valid behavior with direct evidence=PASS; contract violation=FAIL; a different but contract-valid implementation=PASS; fluent claim without observable evidence=INCONCLUSIVE. Probe IDs in order: valid, invalid, alternative, unsupported.`;
  process.env.SKILL_EVIDENCE_ROLE = 'calibration';
  const argv = codexArgs(plan.judgeModel, plan.judgeReasoningEffort, workspace, prompt, schemaFile);
  await writeCanonicalJson(path.join(runDirectory, 'calibration.command.json'), argv.slice(0, -1));
  const result = await invoke(argv, workspace, timeoutMs);
  await writeFile(path.join(runDirectory, 'calibration.raw.jsonl'), result.raw, { mode: 0o600 });
  await writeFile(path.join(runDirectory, 'calibration.stderr.log'), sanitize(result.stderr), { mode: 0o600 });
  let actual: { probes?: { id: string; status: string }[] } = {};
  try {
    actual = JSON.parse(result.finalMessage) as typeof actual;
  } catch {
    /* invalid output fails calibration */
  }
  const probes = qualifyCalibration(actual);
  return { passed: result.exitCode === 0 && result.complete && probes.every(probe => probe.passed), probes, usage: result.usage };
}

async function judgeCase(
  plan: RunPlan,
  runDirectory: string,
  caseId: string,
  payload: string,
  timeoutMs: number,
): Promise<{ status: CaseStatus; rationale: string; usage: { input: number; output: number } }> {
  const schemaFile = path.join(runDirectory, 'judge-output.schema.json');
  await writeCanonicalJson(schemaFile, judgeSchema);
  const workspace = path.join(runDirectory, 'judge-workspace');
  await mkdir(workspace, { recursive: true });
  await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
  process.env.SKILL_EVIDENCE_ROLE = 'judge';
  const result = await invoke(
    codexArgs(
      plan.judgeModel,
      plan.judgeReasoningEffort,
      workspace,
      `Judge observable behavior against the supplied contract and oracle. Do not reward fluency without evidence.\n${payload}`,
      schemaFile,
    ),
    workspace,
    timeoutMs,
  );
  await writeFile(path.join(runDirectory, `${caseId}.judge.raw.jsonl`), result.raw, { mode: 0o600 });
  try {
    const parsed = JSON.parse(result.finalMessage) as { status: CaseStatus; rationale: string };
    return { ...parsed, usage: result.usage };
  } catch {
    return { status: 'ERROR', rationale: 'Judge returned invalid structured output', usage: result.usage };
  }
}

export async function executePlan(planFile: string, approvedSessions: number): Promise<{ runDirectory: string; evidence: Evidence }> {
  const plan = await readJson<RunPlan>(planFile);
  if (approvedSessions < plan.sessions.maximum)
    throw new Error(`Approved ${approvedSessions} sessions, but plan requires authorization for ${plan.sessions.maximum}`);
  if (plan.sessions.maximum > 9) throw new Error('Plan exceeds the hard limit of nine sessions');
  const loaded = await loadEvaluation(plan.evaluationDirectory);
  if (loaded.fingerprint !== plan.evaluationFingerprint || canonicalDigest(loaded.inputDigests) !== canonicalDigest(plan.inputDigests))
    throw new Error('Evaluation fingerprint drift detected');
  const currentSkillFingerprint = await directoryFingerprint(loaded.evaluation.runtime.skillSource, skillExclusions);
  if (currentSkillFingerprint !== plan.skillFingerprint) throw new Error('Skill fingerprint drift detected');

  const runId = `${new Date().toISOString().replace(/[:.]/gu, '-')}-${randomUUID().slice(0, 8)}`;
  const runDirectory = path.resolve('.skill-evidence', 'runs', runId);
  await mkdir(runDirectory, { recursive: true });
  const archivalSkillSnapshot = path.join(runDirectory, 'snapshot', 'refactor-design');
  await copyFiltered(loaded.evaluation.runtime.skillSource, archivalSkillSnapshot, skillExclusions);
  await makeReadOnly(archivalSkillSnapshot);
  const calibration = await calibrate(plan, runDirectory, loaded.evaluation.runtime.timeoutMs);
  if (!calibration.passed) throw new Error(`Judge calibration failed; artifacts preserved at ${runDirectory}`);

  const cases: CaseEvidence[] = [];
  let sessions = 1;
  let inputTokens = calibration.usage.input;
  let outputTokens = calibration.usage.output;
  for (const evaluationCase of loaded.cases) {
    const workspace = path.join(runDirectory, 'workspaces', evaluationCase.id);
    await mkdir(workspace, { recursive: true });
    await copyFiltered(safeResolve(loaded.directory, evaluationCase.fixture), workspace, new Set());
    await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
    const skillSnapshot = path.join(workspace, '.agents', 'skills', 'refactor-design');
    await copyFiltered(loaded.evaluation.runtime.skillSource, skillSnapshot, skillExclusions);
    await makeReadOnly(skillSnapshot);
    const baseline = await snapshot(workspace, ignoredWorkspace);
    const beforeSkill = await directoryFingerprint(skillSnapshot);
    const relevantContracts = loaded.contracts.filter(contract =>
      evaluationCase.contracts.some(reference => path.basename(reference, '.json') === contract.id || reference.includes(contract.id)),
    );
    const preconditions = await evaluatePreconditions(relevantContracts, {
      workspace,
      changed: new Set(),
      message: '',
      events: [],
      skillChanged: false,
      timeoutMs: loaded.evaluation.runtime.timeoutMs,
    });
    if (preconditions.violations.length > 0)
      throw new Error(`Case ${evaluationCase.id} precondition failed; artifacts preserved at ${runDirectory}`);
    const publicPrompt = await readFile(safeResolve(loaded.directory, evaluationCase.prompt), 'utf8');
    process.env.SKILL_EVIDENCE_ROLE = 'executor';
    const executed = await invoke(
      codexArgs(plan.model, plan.reasoningEffort, workspace, `$refactor-design\n\n${publicPrompt}`),
      workspace,
      loaded.evaluation.runtime.timeoutMs,
    );
    sessions++;
    inputTokens += executed.usage.input;
    outputTokens += executed.usage.output;
    await writeFile(path.join(runDirectory, `${evaluationCase.id}.executor.raw.jsonl`), executed.raw, { mode: 0o600 });
    const after = await snapshot(workspace, ignoredWorkspace);
    const changed = new Set(
      [...new Set([...Object.keys(baseline), ...Object.keys(after)])].filter(name => baseline[name]?.digest !== after[name]?.digest),
    );
    const diff = snapshotDiff(baseline, after);
    const afterSkill = await directoryFingerprint(skillSnapshot);
    const direct = await evaluateContracts(relevantContracts, {
      workspace,
      changed,
      message: executed.finalMessage,
      events: executed.events,
      skillChanged: beforeSkill !== afterSkill,
      timeoutMs: loaded.evaluation.runtime.timeoutMs,
    });
    const oracle = await readFile(safeResolve(loaded.directory, evaluationCase.oracle), 'utf8');
    const judged = await judgeCase(
      plan,
      runDirectory,
      evaluationCase.id,
      JSON.stringify({
        contracts: relevantContracts,
        oracle,
        observable: { diff, commands: direct.commands, trajectory: executed.events, finalMessage: executed.finalMessage },
      }),
      loaded.evaluation.runtime.timeoutMs,
    );
    sessions++;
    inputTokens += judged.usage.input;
    outputTokens += judged.usage.output;
    const status = resolveCaseStatus(judged.status, executed.exitCode, executed.complete, direct.violations.length);
    cases.push({
      id: evaluationCase.id,
      distribution: evaluationCase.distribution,
      status,
      directViolations: direct.violations,
      trajectory: executed.events,
      diff: sanitize(diff),
      commands: [...preconditions.commands, ...direct.commands].map(command => ({
        ...command,
        stdout: sanitize(command.stdout),
        stderr: sanitize(command.stderr),
      })),
      finalMessage: sanitize(executed.finalMessage),
      judge: { status: judged.status, rationale: sanitize(judged.rationale) },
      observabilityComplete: executed.complete,
    });
    if (status === 'PASS') await forceRemove(workspace);
  }

  const passing = cases.filter(item => item.status === 'PASS').length;
  const critical = cases.flatMap(item => item.directViolations).filter(item => item.severity === 'critical').length;
  const reasons: string[] = [];
  if (passing !== loaded.evaluation.thresholds.requiredPassingCases)
    reasons.push(`Expected ${loaded.evaluation.thresholds.requiredPassingCases} passing cases; observed ${passing}`);
  if (critical > 0) reasons.push(`${critical} critical violation(s)`);
  if (cases.some(item => !item.observabilityComplete)) reasons.push('Observability is incomplete');
  const eligibility = { confirm: reasons.length === 0, reasons };
  const claims: Evidence['claims'] = loaded.evaluation.claims.map(claim => ({
    id: claim.id,
    status: eligibility.confirm
      ? ('SUPPORTED' as const)
      : cases.some(item => item.status === 'INCONCLUSIVE' || item.status === 'ERROR')
        ? ('INCONCLUSIVE' as const)
        : ('NOT_SUPPORTED' as const),
  }));
  for (const exclusion of loaded.evaluation.exclusions) claims.push({ id: exclusion, status: 'NOT_EVALUATED' });
  const evidence: Evidence = {
    schemaVersion: 1,
    runId,
    createdAt: new Date().toISOString(),
    provenance: {
      evaluationId: loaded.evaluation.id,
      model: plan.model,
      reasoningEffort: plan.reasoningEffort,
      judgeModel: plan.judgeModel,
      judgeReasoningEffort: plan.judgeReasoningEffort,
      theoryCommit: loaded.evaluation.runtime.theoryCommit,
      skillCommit: loaded.evaluation.runtime.skillCommit,
    },
    fingerprints: { evaluation: loaded.fingerprint, skill: currentSkillFingerprint },
    calibration: { passed: calibration.passed, probes: calibration.probes },
    cases,
    claims,
    eligibility,
    usage: { sessions, inputTokens, outputTokens },
  };
  await writeCanonicalJson(path.join(runDirectory, 'evidence.json'), evidence);
  return { runDirectory, evidence };
}
