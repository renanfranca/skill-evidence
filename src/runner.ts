import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalDigest } from './canonical.js';
import { evaluateContracts, evaluatePreconditions } from './checks.js';
import { loadEvaluation, qualificationProbes, type QualificationProbe } from './evaluation.js';
import { normalizeJsonl } from './events.js';
import { directoryFingerprint, readJson, safeResolve, writeCanonicalJson } from './files.js';
import { prepareJudgeSession, type JudgeInput } from './judge-input.js';
import { skillExclusions } from './plan.js';
import { inspectPreflight } from './preflight.js';
import { reducedEnvironment, runProcess } from './process.js';
import { validateSchema } from './schema.js';
import { sanitize } from './security.js';
import type { CaseEvidence, CaseStatus, CheckEvidence, Contract, EvidenceV2, Preflight, RunPlan, SessionUsage } from './types.js';
import { copyFiltered, forceRemove, makeReadOnly, snapshot, snapshotDiff } from './workspace.js';

const ignoredWorkspace = new Set(['.git', '.agents', '.codex', 'node_modules']);
const sessionMicrocredits = 370_000;
const judgeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'rationale'],
  properties: { status: { enum: ['PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR'] }, rationale: { type: 'string' } },
};
const calibrationSchema = (count: number) => ({
  type: 'object',
  additionalProperties: false,
  required: ['probes'],
  properties: {
    probes: {
      type: 'array',
      minItems: count,
      maxItems: count,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status'],
        properties: { id: { type: 'string' }, status: { enum: ['PASS', 'FAIL', 'INCONCLUSIVE'] } },
      },
    },
  },
});

export function qualifyCalibration(
  actual: { probes?: { id: string; status: string }[] },
  expectedProbes: QualificationProbe[] = [
    { id: 'valid', kind: 'valid', text: '', expectedStatus: 'PASS' },
    { id: 'invalid', kind: 'invalid', text: '', expectedStatus: 'FAIL' },
    { id: 'alternative', kind: 'alternative', text: '', expectedStatus: 'PASS' },
    { id: 'unsupported', kind: 'unsupported', text: '', expectedStatus: 'INCONCLUSIVE' },
  ],
): { id: string; passed: boolean }[] {
  const expected = new Map(expectedProbes.map(probe => [probe.id, probe.expectedStatus]));
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

function materializeRequiredEvidence(
  contracts: Contract[],
  observable: JudgeInput['observable'],
  complete: boolean,
  skillFingerprint: string,
): CheckEvidence[] {
  const checks: CheckEvidence[] = [];
  for (const contract of contracts) {
    checks.push({
      id: `${contract.id}:observability`,
      state: complete ? 'PASS' : 'INCONCLUSIVE',
      contractId: contract.id,
      phase: 'required-effect',
      severity: contract.severity,
      facts: [complete ? 'relevant executor events are fully recognized' : 'unknown relevant executor events were observed'],
      evidence: {
        type: 'trajectory',
        digest: canonicalDigest(observable.trajectory),
        reference: `trajectory:${contract.id}:observability`,
        ...(observable.trajectory.length > 0 ? { sequence: observable.trajectory.length - 1 } : {}),
      },
    });
    for (const type of contract.evidence) {
      const available =
        type === 'trajectory'
          ? complete && observable.trajectory.length > 0
          : type === 'message'
            ? observable.finalMessage.trim().length > 0
            : type === 'command'
              ? observable.commands.length > 0
              : true;
      const value =
        type === 'diff'
          ? observable.diff
          : type === 'command'
            ? observable.commands
            : type === 'trajectory'
              ? observable.trajectory
              : type === 'message'
                ? observable.finalMessage
                : type === 'skill-fingerprint'
                  ? skillFingerprint
                  : { audited: true };
      checks.push({
        id: `${contract.id}:evidence:${type}`,
        state: available ? 'PASS' : 'INCONCLUSIVE',
        contractId: contract.id,
        phase: 'required-effect',
        severity: contract.severity,
        facts: [available ? `${type} evidence materialized` : `${type} evidence is missing`],
        evidence: {
          type,
          digest: canonicalDigest(value),
          reference: `${type}:${contract.id}`,
          ...(type === 'trajectory' && observable.trajectory.length > 0 ? { sequence: observable.trajectory.length - 1 } : {}),
        },
      });
    }
  }
  return checks;
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
    '-c',
    'sandbox_workspace_write.writable_roots=[]',
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
  invocationEnvironment: NodeJS.ProcessEnv,
): Promise<ReturnType<typeof normalizeJsonl> & { exitCode: number; stderr: string; raw: string }> {
  const fakeOutput = process.env.SKILL_EVIDENCE_CODEX_BIN ? path.join(os.tmpdir(), `skill-evidence-fake-${randomUUID()}.jsonl`) : undefined;
  const result = await runProcess(argv, {
    cwd,
    timeoutMs,
    env: {
      ...reducedEnvironment(),
      ...invocationEnvironment,
      SKILL_EVIDENCE_FAKE_OUTPUT: fakeOutput,
      SKILL_EVIDENCE_FAKE_SCENARIO: process.env.SKILL_EVIDENCE_FAKE_SCENARIO,
      SKILL_EVIDENCE_FAKE_SESSION_LOG: process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG,
    },
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
  probesToQualify: QualificationProbe[],
): Promise<{
  passed: boolean;
  probes: { id: string; passed: boolean }[];
  usage: { input: number; cachedInput: number; output: number };
}> {
  const workspace = path.join(runDirectory, 'calibration-workspace');
  await mkdir(workspace, { recursive: true });
  await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
  const schemaFile = path.join(runDirectory, 'calibration-output.schema.json');
  await writeCanonicalJson(schemaFile, calibrationSchema(probesToQualify.length));
  const prompt = `You are qualifying as an evidence judge. Return only structured verdicts. Apply these rules independently: valid behavior with direct evidence=PASS; contract violation=FAIL; a different but contract-valid implementation=PASS; fluent claim without observable evidence=INCONCLUSIVE. Probes: ${JSON.stringify(
    probesToQualify.map(({ id, text }) => ({ id, text })),
  )}`;
  const argv = codexArgs(plan.judgeModel, plan.judgeReasoningEffort, workspace, prompt, schemaFile);
  await writeCanonicalJson(path.join(runDirectory, 'calibration.command.json'), argv.slice(0, -1));
  const result = await invoke(argv, workspace, timeoutMs, {
    SKILL_EVIDENCE_ROLE: 'calibration',
    SKILL_EVIDENCE_CALIBRATION_PROBES: JSON.stringify(probesToQualify.map(probe => ({ id: probe.id, status: probe.expectedStatus }))),
  });
  await writeFile(path.join(runDirectory, 'calibration.raw.jsonl'), result.raw, { mode: 0o600 });
  await writeFile(path.join(runDirectory, 'calibration.stderr.log'), sanitize(result.stderr), { mode: 0o600 });
  let actual: { probes?: { id: string; status: string }[] } = {};
  try {
    actual = JSON.parse(result.finalMessage) as typeof actual;
  } catch {
    /* invalid output fails calibration */
  }
  const probes = qualifyCalibration(actual, probesToQualify);
  return { passed: result.exitCode === 0 && result.complete && probes.every(probe => probe.passed), probes, usage: result.usage };
}

async function judgeCase(
  plan: RunPlan,
  runDirectory: string,
  caseId: string,
  payload: string,
  timeoutMs: number,
): Promise<{
  status: CaseStatus;
  rationale: string;
  usage: { input: number; cachedInput: number; output: number };
}> {
  const schemaFile = path.join(runDirectory, 'judge-output.schema.json');
  await writeCanonicalJson(schemaFile, judgeSchema);
  const workspace = path.join(runDirectory, 'judge-workspace');
  await mkdir(workspace, { recursive: true });
  await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
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
    { SKILL_EVIDENCE_ROLE: 'judge' },
  );
  await writeFile(path.join(runDirectory, `${caseId}.judge.raw.jsonl`), result.raw, { mode: 0o600 });
  try {
    const parsed = JSON.parse(result.finalMessage) as { status: CaseStatus; rationale: string };
    return { ...parsed, usage: result.usage };
  } catch {
    return { status: 'ERROR', rationale: 'Judge returned invalid structured output', usage: result.usage };
  }
}

export async function executePlan(
  planFile: string,
  preflightFile: string,
  approvedSessions: number,
  maxCredits: number,
): Promise<{ runDirectory: string; evidence: EvidenceV2 }> {
  const plan = await readJson<RunPlan>(planFile);
  const suppliedPreflight = await readJson<Preflight>(preflightFile);
  const currentPreflight = await inspectPreflight(planFile);
  if (!suppliedPreflight.eligible || canonicalDigest(suppliedPreflight) !== canonicalDigest(currentPreflight))
    throw new Error('Preflight is ineligible or stale');
  if (!Number.isFinite(maxCredits) || maxCredits <= 0) throw new Error('A positive credit limit is required');
  const creditLimit = Math.round(maxCredits * 1_000_000);
  let spentCredits = 0;
  const authorizeNextSession = (session: number): void => {
    if (spentCredits + sessionMicrocredits > creditLimit)
      throw new Error(`Reached credit limit before session ${session}; an already-started session is never interrupted retroactively`);
  };
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
  const archivalSnapshotFingerprint = await directoryFingerprint(archivalSkillSnapshot);
  if (archivalSnapshotFingerprint !== plan.skillSnapshotFingerprint) throw new Error('Filtered skill snapshot drift detected');
  authorizeNextSession(1);
  const calibration = await calibrate(plan, runDirectory, loaded.evaluation.runtime.timeoutMs, await qualificationProbes(loaded));
  spentCredits += sessionMicrocredits;
  if (!calibration.passed) throw new Error(`Judge calibration failed; artifacts preserved at ${runDirectory}`);

  const cases: CaseEvidence[] = [];
  let sessions = 1;
  let inputTokens = calibration.usage.input;
  let cachedInputTokens = calibration.usage.cachedInput;
  let outputTokens = calibration.usage.output;
  const ledger: SessionUsage[] = [
    {
      session: 1,
      role: 'calibration',
      inputTokens: calibration.usage.input,
      cachedInputTokens: calibration.usage.cachedInput,
      outputTokens: calibration.usage.output,
      credits: 0.37,
    },
  ];
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
    authorizeNextSession(sessions + 1);
    const executed = await invoke(
      codexArgs(plan.model, plan.reasoningEffort, workspace, `$refactor-design\n\n${publicPrompt}`),
      workspace,
      loaded.evaluation.runtime.timeoutMs,
      { SKILL_EVIDENCE_ROLE: 'executor' },
    );
    sessions++;
    spentCredits += sessionMicrocredits;
    inputTokens += executed.usage.input;
    cachedInputTokens += executed.usage.cachedInput;
    outputTokens += executed.usage.output;
    ledger.push({
      session: sessions,
      role: 'executor',
      caseId: evaluationCase.id,
      inputTokens: executed.usage.input,
      cachedInputTokens: executed.usage.cachedInput,
      outputTokens: executed.usage.output,
      credits: 0.37,
    });
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
    const observable: JudgeInput['observable'] = {
      diff: sanitize(diff),
      commands: [...preconditions.commands, ...direct.commands].map(command => ({
        ...command,
        stdout: sanitize(command.stdout),
        stderr: sanitize(command.stderr),
      })),
      trajectory: executed.events,
      finalMessage: sanitize(executed.finalMessage),
    };
    const checks = [
      ...preconditions.checks,
      ...direct.checks,
      ...materializeRequiredEvidence(relevantContracts, observable, executed.complete, afterSkill),
    ];
    const relativeJudgeInput = `judge-input/${evaluationCase.id}.json`;
    const judgeInputFile = path.join(runDirectory, relativeJudgeInput);
    const prepared = await prepareJudgeSession(judgeInputFile, {
      schemaVersion: 1,
      caseId: evaluationCase.id,
      contracts: relevantContracts.map(contract => contract.id),
      checks,
      observable,
    });
    let judged: Awaited<ReturnType<typeof judgeCase>> | undefined;
    if (prepared) {
      authorizeNextSession(sessions + 1);
      judged = await judgeCase(
        plan,
        runDirectory,
        evaluationCase.id,
        `${await readFile(judgeInputFile, 'utf8')}\nOracle:\n${sanitize(oracle)}`,
        loaded.evaluation.runtime.timeoutMs,
      );
      sessions++;
      spentCredits += sessionMicrocredits;
      inputTokens += judged.usage.input;
      cachedInputTokens += judged.usage.cachedInput;
      outputTokens += judged.usage.output;
      ledger.push({
        session: sessions,
        role: 'judge',
        caseId: evaluationCase.id,
        inputTokens: judged.usage.input,
        cachedInputTokens: judged.usage.cachedInput,
        outputTokens: judged.usage.output,
        credits: 0.37,
      });
    }
    const status = resolveCaseStatus(
      judged?.status ?? 'INCONCLUSIVE',
      executed.exitCode,
      executed.complete && prepared,
      direct.violations.length,
    );
    cases.push({
      id: evaluationCase.id,
      purpose: 'decision',
      distribution: evaluationCase.distribution,
      status,
      directViolations: direct.violations,
      trajectory: executed.events,
      diff: observable.diff,
      commands: observable.commands,
      checks,
      finalMessage: observable.finalMessage,
      ...(prepared ? { judgeInput: relativeJudgeInput } : {}),
      ...(judged ? { judge: { status: judged.status, rationale: sanitize(judged.rationale) } } : {}),
      observabilityComplete: executed.complete && prepared,
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
  const claims: EvidenceV2['claims'] = loaded.evaluation.claims.map(claim => ({
    id: claim.id,
    status: eligibility.confirm
      ? ('SUPPORTED' as const)
      : cases.some(item => item.status === 'INCONCLUSIVE' || item.status === 'ERROR')
        ? ('INCONCLUSIVE' as const)
        : ('NOT_SUPPORTED' as const),
  }));
  for (const exclusion of loaded.evaluation.exclusions) claims.push({ id: exclusion, status: 'NOT_EVALUATED' });
  const evidence: EvidenceV2 = {
    schemaVersion: 2,
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
      preflightDigest: canonicalDigest(suppliedPreflight),
    },
    fingerprints: {
      evaluation: loaded.fingerprint,
      skill: currentSkillFingerprint,
      skillSnapshot: archivalSnapshotFingerprint,
    },
    calibration: { passed: calibration.passed, probes: calibration.probes },
    cases,
    claims,
    eligibility,
    usage: {
      sessions,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      credits: Number(ledger.reduce((total, item) => total + item.credits, 0).toFixed(2)),
      ledger,
    },
  };
  await validateSchema('evidence', evidence, 'evidence.json');
  await writeCanonicalJson(path.join(runDirectory, 'evidence.json'), evidence);
  return { runDirectory, evidence };
}
