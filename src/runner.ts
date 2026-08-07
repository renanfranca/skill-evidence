import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalDigest, canonicalJson } from './canonical.js';
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
import type {
  CaseEvidence,
  CaseStatus,
  CheckEvidence,
  Contract,
  ExecutePlanOutcome,
  LoadedEvaluation,
  Preflight,
  ProducedEvidenceV2,
  RunPlan,
  SessionUsage,
} from './types.js';
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
        required: ['id', 'status', 'rationale'],
        properties: {
          id: { type: 'string' },
          status: { enum: ['PASS', 'FAIL', 'INCONCLUSIVE'] },
          rationale: { type: 'string', minLength: 1 },
        },
      },
    },
  },
});

const judgeRubric = [
  'Judge observable behavior against the supplied contract and oracle.',
  'PASS only when direct observable evidence supports a contract-valid result, including a valid alternative.',
  'FAIL when direct evidence establishes a contract violation.',
  'INCONCLUSIVE when observable evidence is missing or incomplete; do not reward fluent claims without evidence.',
  'Return only the structured output required by the output schema.',
].join(' ');

interface CalibrationInputProbe {
  id: string;
  judgeInput: JudgeInput;
  oracle: string;
}

interface CalibrationProbeResult {
  id: string;
  expectedStatus: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  observedStatus: CaseStatus;
  rationale: string;
  passed: boolean;
}

export function qualifyCalibration(
  actual: { probes?: { id: string; status: string }[] },
  expectedProbes: Pick<QualificationProbe, 'id' | 'expectedStatus'>[] = [
    { id: 'valid', expectedStatus: 'PASS' },
    { id: 'invalid', expectedStatus: 'FAIL' },
    { id: 'alternative', expectedStatus: 'PASS' },
    { id: 'unsupported', expectedStatus: 'INCONCLUSIVE' },
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
  const fakeMode = process.env.SKILL_EVIDENCE_CODEX_BIN !== undefined;
  const fakeOutput = fakeMode ? path.join(os.tmpdir(), `skill-evidence-fake-${randomUUID()}.jsonl`) : undefined;
  const fakeEnvironment: NodeJS.ProcessEnv = fakeMode
    ? {
        SKILL_EVIDENCE_FAKE_OUTPUT: fakeOutput,
        ...(process.env.SKILL_EVIDENCE_FAKE_SCENARIO === undefined
          ? {}
          : { SKILL_EVIDENCE_FAKE_SCENARIO: process.env.SKILL_EVIDENCE_FAKE_SCENARIO }),
        ...(process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG === undefined
          ? {}
          : { SKILL_EVIDENCE_FAKE_SESSION_LOG: process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG }),
        ...(process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG === undefined
          ? {}
          : { SKILL_EVIDENCE_FAKE_INVOCATION_LOG: process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG }),
        ...(process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS === undefined
          ? {}
          : { SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS: process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS }),
      }
    : {};
  const result = await runProcess(argv, {
    cwd,
    timeoutMs,
    env: {
      ...reducedEnvironment(),
      ...invocationEnvironment,
      ...fakeEnvironment,
    },
  });
  const raw = result.stdout || (fakeOutput ? await readFile(fakeOutput, 'utf8').catch(() => '') : '');
  if (fakeOutput) await rm(fakeOutput, { force: true });
  const normalized = normalizeJsonl(raw);
  return { ...normalized, exitCode: result.exitCode, stderr: result.stderr, raw };
}

async function calibrationInput(
  loaded: LoadedEvaluation,
  probesToQualify: QualificationProbe[],
): Promise<{ input: CalibrationInputProbe[]; expected: Map<string, QualificationProbe['expectedStatus']> }> {
  const cases = new Map(loaded.cases.map(evaluationCase => [evaluationCase.id, evaluationCase]));
  const input: CalibrationInputProbe[] = [];
  const expected = new Map<string, QualificationProbe['expectedStatus']>();
  for (const probe of probesToQualify) {
    const evaluationCase = cases.get(probe.judgeInput.caseId);
    if (!evaluationCase) throw new Error(`Qualification probe references non-decision case ${probe.judgeInput.caseId}`);
    const id = `probe-${canonicalDigest({ caseId: evaluationCase.id, package: { purpose: probe.purpose, input: probe.judgeInput } })}`;
    if (expected.has(id)) throw new Error(`Duplicate deterministic calibration probe ID ${id}`);
    input.push({
      id,
      judgeInput: probe.judgeInput,
      oracle: sanitize(await readFile(safeResolve(loaded.directory, evaluationCase.oracle), 'utf8')),
    });
    expected.set(id, probe.expectedStatus);
  }
  return { input, expected };
}

function parsedCalibration(
  value: unknown,
  expected: Map<string, QualificationProbe['expectedStatus']>,
): { probes?: { id: string; status: 'PASS' | 'FAIL' | 'INCONCLUSIVE'; rationale: string }[]; error?: string } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { error: 'Calibration response is not an object' };
  const response = value as Record<string, unknown>;
  if (Object.keys(response).length !== 1 || !Array.isArray(response.probes))
    return { error: 'Calibration response must contain only probes' };
  if (response.probes.length !== expected.size) return { error: 'Calibration response has an incomplete probe set' };
  const probes: { id: string; status: 'PASS' | 'FAIL' | 'INCONCLUSIVE'; rationale: string }[] = [];
  const seen = new Set<string>();
  for (const item of response.probes) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return { error: 'Calibration response has a malformed probe' };
    const probe = item as Record<string, unknown>;
    if (
      Object.keys(probe).length !== 3
      || typeof probe.id !== 'string'
      || !['PASS', 'FAIL', 'INCONCLUSIVE'].includes(probe.status as string)
      || typeof probe.rationale !== 'string'
      || !probe.rationale.trim()
    )
      return { error: 'Calibration response has a malformed probe' };
    if (!expected.has(probe.id)) return { error: `Calibration response has unknown probe ${probe.id}` };
    if (seen.has(probe.id)) return { error: `Calibration response has duplicate probe ${probe.id}` };
    seen.add(probe.id);
    probes.push({ id: probe.id, status: probe.status as 'PASS' | 'FAIL' | 'INCONCLUSIVE', rationale: probe.rationale });
  }
  return { probes };
}

async function calibrate(
  plan: RunPlan,
  runDirectory: string,
  timeoutMs: number,
  loaded: LoadedEvaluation,
  probesToQualify: QualificationProbe[],
): Promise<{
  passed: boolean;
  probes: { id: string; passed: boolean }[];
  results: CalibrationProbeResult[];
  inputDigest: string;
  resultDigest: string;
  usage: { input: number; cachedInput: number; output: number };
}> {
  const workspace = path.join(runDirectory, 'calibration-workspace');
  await mkdir(workspace, { recursive: true });
  await runProcess(['git', 'init', '--quiet'], { cwd: workspace, timeoutMs: 10_000 });
  const schemaFile = path.join(runDirectory, 'calibration-output.schema.json');
  await writeCanonicalJson(schemaFile, calibrationSchema(probesToQualify.length));
  const { input, expected } = await calibrationInput(loaded, probesToQualify);
  await writeCanonicalJson(path.join(runDirectory, 'calibration-input.json'), input);
  const prompt = `${judgeRubric}\n\n${canonicalJson(input)}`;
  const argv = codexArgs(plan.judgeModel, plan.judgeReasoningEffort, workspace, prompt, schemaFile);
  await writeCanonicalJson(path.join(runDirectory, 'calibration.command.json'), argv.slice(0, -1));
  const result = await invoke(argv, workspace, timeoutMs, { SKILL_EVIDENCE_ROLE: 'calibration' });
  await writeFile(path.join(runDirectory, 'calibration.raw.jsonl'), sanitize(result.raw), { mode: 0o600 });
  await writeFile(path.join(runDirectory, 'calibration.stderr.log'), sanitize(result.stderr), { mode: 0o600 });
  let actual: unknown;
  let error: string | undefined;
  try {
    actual = JSON.parse(result.finalMessage) as unknown;
  } catch {
    error = 'Calibration response is not valid JSON';
  }
  const parsed = error ? { error } : parsedCalibration(actual, expected);
  const observed = new Map(parsed.probes?.map(probe => [probe.id, probe]));
  const failure = parsed.error ?? (result.exitCode === 0 && result.complete ? undefined : 'Calibration session did not complete cleanly');
  const results: CalibrationProbeResult[] = [...expected].map(([id, expectedStatus]) => {
    const response = observed.get(id);
    return {
      id,
      expectedStatus,
      observedStatus: failure ? 'ERROR' : (response?.status ?? 'ERROR'),
      rationale: failure ?? response?.rationale ?? 'Calibration response omitted this probe',
      passed: !failure && response?.status === expectedStatus,
    };
  });
  const calibrationResult = { schemaVersion: 1, probes: results };
  await writeCanonicalJson(path.join(runDirectory, 'calibration-result.json'), calibrationResult);
  return {
    passed: results.every(probe => probe.passed),
    probes: results.map(({ id, passed }) => ({ id, passed })),
    results,
    inputDigest: canonicalDigest(input),
    resultDigest: canonicalDigest(calibrationResult),
    usage: result.usage,
  };
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
    codexArgs(plan.judgeModel, plan.judgeReasoningEffort, workspace, `${judgeRubric}\n\n${payload}`, schemaFile),
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
): Promise<{ runDirectory: string; evidence: ProducedEvidenceV2; outcome: ExecutePlanOutcome }> {
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
  authorizeNextSession(1);
  const calibration = await calibrate(plan, runDirectory, loaded.evaluation.runtime.timeoutMs, loaded, await qualificationProbes(loaded));
  spentCredits += sessionMicrocredits;
  if (!calibration.passed) {
    const evidence: ProducedEvidenceV2 = {
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
      },
      calibration: {
        passed: false,
        inputDigest: calibration.inputDigest,
        resultDigest: calibration.resultDigest,
        probes: calibration.results,
      },
      cases: [],
      claims: [...loaded.evaluation.claims.map(claim => claim.id), ...loaded.evaluation.exclusions].map(id => ({
        id,
        status: 'NOT_EVALUATED' as const,
      })),
      eligibility: { confirm: false, reasons: ['Judge calibration failed'] },
      usage: {
        sessions: 1,
        inputTokens: calibration.usage.input,
        cachedInputTokens: calibration.usage.cachedInput,
        outputTokens: calibration.usage.output,
        credits: 0.37,
        ledger: [
          {
            session: 1,
            role: 'calibration',
            inputTokens: calibration.usage.input,
            cachedInputTokens: calibration.usage.cachedInput,
            outputTokens: calibration.usage.output,
            credits: 0.37,
          },
        ],
      },
    };
    await validateSchema('evidence', evidence, 'evidence.json');
    await writeCanonicalJson(path.join(runDirectory, 'evidence.json'), evidence);
    return { runDirectory, evidence, outcome: 'calibration-failed' };
  }

  const archivalSkillSnapshot = path.join(runDirectory, 'snapshot', 'refactor-design');
  await copyFiltered(loaded.evaluation.runtime.skillSource, archivalSkillSnapshot, skillExclusions);
  await makeReadOnly(archivalSkillSnapshot);
  const archivalSnapshotFingerprint = await directoryFingerprint(archivalSkillSnapshot);
  if (archivalSnapshotFingerprint !== plan.skillSnapshotFingerprint) throw new Error('Filtered skill snapshot drift detected');

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
  const claims: ProducedEvidenceV2['claims'] = loaded.evaluation.claims.map(claim => ({
    id: claim.id,
    status: eligibility.confirm
      ? ('SUPPORTED' as const)
      : cases.some(item => item.status === 'INCONCLUSIVE' || item.status === 'ERROR')
        ? ('INCONCLUSIVE' as const)
        : ('NOT_SUPPORTED' as const),
  }));
  for (const exclusion of loaded.evaluation.exclusions) claims.push({ id: exclusion, status: 'NOT_EVALUATED' });
  const evidence: ProducedEvidenceV2 = {
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
    calibration: {
      passed: calibration.passed,
      inputDigest: calibration.inputDigest,
      resultDigest: calibration.resultDigest,
      probes: calibration.results,
    },
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
  return { runDirectory, evidence, outcome: 'completed' as ExecutePlanOutcome };
}
