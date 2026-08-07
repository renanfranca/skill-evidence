import { access, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, test } from 'vitest';
import { canonicalDigest, canonicalJson } from '../src/canonical.js';
import { isSkillPreserved, observesOutOfScopeWrite, temporalOrderObserved } from '../src/checks.js';
import { loadEvaluation, qualificationProbes } from '../src/evaluation.js';
import { normalizeJsonl } from '../src/events.js';
import { safeResolve, writeCanonicalJson } from '../src/files.js';
import { prepareJudgeSession } from '../src/judge-input.js';
import { reviewRun, writeReport } from '../src/lifecycle.js';
import { createPlan } from '../src/plan.js';
import { createPreflight } from '../src/preflight.js';
import { runProcess } from '../src/process.js';
import { renderEvidence } from '../src/report.js';
import { executePlan, qualifyCalibration, resolveCaseStatus } from '../src/runner.js';
import { validateSchema } from '../src/schema.js';
import { containsSecret, sanitize } from '../src/security.js';
import type { Evidence } from '../src/types.js';
import { forceRemove } from '../src/workspace.js';

const root = path.resolve(import.meta.dirname, '..');
const evaluationDirectory = path.join(root, 'evaluations', 'refactor-design');
const temporary: string[] = [];
const sharedTemporary: string[] = [];
let sharedSuccessfulRun:
  | Promise<{
      result: Awaited<ReturnType<typeof executePlan>>;
      preflight: Awaited<ReturnType<typeof createPreflight>>;
      sessionLog: string;
    }>
  | undefined;

async function tempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'skill-evidence-test-'));
  temporary.push(directory);
  return directory;
}

async function successfulFakeRun(): Promise<Awaited<NonNullable<typeof sharedSuccessfulRun>>> {
  if (!sharedSuccessfulRun) {
    sharedSuccessfulRun = (async () => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'skill-evidence-shared-test-'));
      sharedTemporary.push(directory);
      const planFile = path.join(directory, 'plan.json');
      const preflightFile = path.join(directory, 'preflight.json');
      const sessionLog = path.join(directory, 'sessions.log');
      await createPlan(evaluationDirectory, {
        model: 'gpt-5.6-luna',
        reasoningEffort: 'max',
        judgeModel: 'gpt-5.6-terra',
        judgeReasoningEffort: 'xhigh',
        out: planFile,
      });
      const preflight = await createPreflight(planFile, preflightFile);
      process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
      process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG = sessionLog;
      const result = await executePlan(planFile, preflightFile, 9, 3.33);
      sharedTemporary.push(result.runDirectory);
      return { result, preflight, sessionLog };
    })();
  }
  return sharedSuccessfulRun;
}

afterEach(async () => {
  delete process.env.SKILL_EVIDENCE_CODEX_BIN;
  delete process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS;
  delete process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG;
  delete process.env.SKILL_EVIDENCE_FAKE_SCENARIO;
  delete process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG;
  await Promise.all(
    temporary.splice(0).map(directory => forceRemove(directory).catch(() => rm(directory, { recursive: true, force: true }))),
  );
});

afterAll(async () => {
  await Promise.all(sharedTemporary.map(directory => forceRemove(directory).catch(() => undefined)));
});

describe.sequential('canonical domain and safety boundaries', () => {
  test('canonicalizes object keys and fingerprints deterministically', () => {
    expect(canonicalJson({ z: 1, a: { d: 2, b: 1 } })).toBe('{"a":{"b":1,"d":2},"z":1}\n');
    expect(canonicalDigest({ b: 2, a: 1 })).toBe(canonicalDigest({ a: 1, b: 2 }));
  });

  test('loads schemas, references, claims, and the four-case population', async () => {
    const loaded = await loadEvaluation(evaluationDirectory);
    expect(loaded.cases.map(item => item.distribution)).toEqual(['usage', 'usage', 'stress', 'stress']);
    expect(loaded.contracts).toHaveLength(5);
    expect(loaded.evaluation.thresholds.requiredPassingCases).toBe(4);
  });

  test('uses exactly four unseen decision cases split between usage and stress', async () => {
    const loaded = await loadEvaluation(evaluationDirectory);

    expect(loaded.developmentCases).toHaveLength(4);
    expect(loaded.developmentCases.every(item => item.purpose === 'development')).toBe(true);
    expect(loaded.cases.map(item => item.id)).toEqual([
      'usage-request-context',
      'usage-stable-pipeline',
      'stress-public-contract',
      'stress-observability-gap',
    ]);
    expect(loaded.cases.map(item => item.distribution)).toEqual(['usage', 'usage', 'stress', 'stress']);
    expect(loaded.cases.every(item => item.purpose === 'decision')).toBe(true);
    expect(loaded.cases.every(item => item.qualificationExamples.endsWith('examples.json'))).toBe(true);
  });

  test('rejects path traversal', () => {
    expect(() => safeResolve('/tmp/evaluation', '../escape')).toThrow(/escapes/u);
    expect(() => safeResolve('/tmp/evaluation', '/absolute')).toThrow(/Unsafe/u);
  });

  test('normalizes observable events, removes reasoning, and flags unknown events', () => {
    const result = normalizeJsonl(
      [
        JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'private' } }),
        JSON.stringify({ type: 'item.completed', item: { type: 'future_write', path: 'x' } }),
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'done' } }),
      ].join('\n'),
    );
    expect(result.complete).toBe(false);
    expect(JSON.stringify(result.events)).not.toContain('private');
    expect(result.finalMessage).toBe('done');
  });

  test('qualifies all four probes and rejects a misleading calibration', () => {
    const valid = qualifyCalibration({
      probes: [
        { id: 'valid', status: 'PASS' },
        { id: 'invalid', status: 'FAIL' },
        { id: 'alternative', status: 'PASS' },
        { id: 'unsupported', status: 'INCONCLUSIVE' },
      ],
    });
    expect(valid.every(probe => probe.passed)).toBe(true);
    expect(qualifyCalibration({ probes: [{ id: 'unsupported', status: 'PASS' }] }).every(probe => probe.passed)).toBe(false);
  });

  test('qualifies every decision example and rejects invalid behavior or unsupported fluency', async () => {
    const probes = await qualificationProbes(await loadEvaluation(evaluationDirectory));
    const actual = {
      probes: probes.map(probe => ({
        id: probe.id,
        status: probe.purpose === 'known-invalid' || probe.purpose === 'unsupported-fluency' ? 'PASS' : 'PASS',
      })),
    };

    const qualified = qualifyCalibration(actual, probes);

    expect(probes).toHaveLength(16);
    expect(qualified.find(item => item.id.endsWith(':known-invalid'))?.passed).toBe(false);
    expect(qualified.find(item => item.id.endsWith(':unsupported-fluency'))?.passed).toBe(false);
  });

  test('loads only complete qualification packages with schema-valid judge inputs', async () => {
    const loaded = await loadEvaluation(evaluationDirectory);
    const probes = await qualificationProbes(loaded);

    expect(probes).toHaveLength(16);
    expect(probes.map(probe => probe.purpose)).toEqual([
      'known-valid',
      'known-invalid',
      'alternative-valid',
      'unsupported-fluency',
      'known-valid',
      'known-invalid',
      'alternative-valid',
      'unsupported-fluency',
      'known-valid',
      'known-invalid',
      'alternative-valid',
      'unsupported-fluency',
      'known-valid',
      'known-invalid',
      'alternative-valid',
      'unsupported-fluency',
    ]);
    await Promise.all(probes.map(probe => validateSchema('judge-input', probe.judgeInput, probe.id)));

    const directory = await tempDirectory();
    const copiedEvaluation = path.join(directory, 'evaluation');
    await cp(evaluationDirectory, copiedEvaluation, { recursive: true });
    const examplesFile = path.join(copiedEvaluation, 'cases', 'usage-request-context', 'examples.json');
    const examples = JSON.parse(await readFile(examplesFile, 'utf8')) as { probes: unknown[] };
    await writeFile(examplesFile, JSON.stringify({ ...examples, probes: examples.probes.slice(0, 3) }));

    await expect(loadEvaluation(copiedEvaluation)).rejects.toThrow(/qualification|probes|items/u);
  });

  test('gives direct evidence and incomplete observability precedence over a favorable judge', () => {
    expect(resolveCaseStatus('PASS', 0, true, 1)).toBe('FAIL');
    expect(resolveCaseStatus('PASS', 0, false, 0)).toBe('INCONCLUSIVE');
    expect(resolveCaseStatus('PASS', 1, true, 0)).toBe('ERROR');
  });

  test('enforces temporal order and skill preservation mechanically', () => {
    const events = [
      { sequence: 0, type: 'item.completed', itemType: 'file_change' },
      { sequence: 1, type: 'item.completed', itemType: 'command_execution' },
    ];
    expect(temporalOrderObserved(events, 'command_execution', 'file_change')).toBe(false);
    expect(isSkillPreserved(true)).toBe(false);
  });

  test('distinguishes an absolute executable from an external write target', () => {
    expect(observesOutOfScopeWrite('/bin/bash -lc "node --test"', '/workspace')).toBe(false);
    expect(observesOutOfScopeWrite('/bin/bash -lc "printf x > /etc/skill-evidence"', '/workspace')).toBe(true);
    expect(observesOutOfScopeWrite('/bin/bash -lc "printf x > /workspace/result"', '/workspace')).toBe(false);
  });

  test('redacts credential-like values', () => {
    const value = 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456';
    expect(containsSecret(value)).toBe(true);
    expect(sanitize(value)).toContain('[REDACTED]');
  });
});

describe.sequential('planning and lifecycle', () => {
  test('does not create a judge session when required evidence is missing', async () => {
    const directory = await tempDirectory();
    const judgeInput = path.join(directory, 'judge-input.json');

    const prepared = await prepareJudgeSession(judgeInput, {
      schemaVersion: 1,
      caseId: 'missing-proof',
      contracts: ['proof-required'],
      checks: [],
      observable: { diff: '', commands: [], trajectory: [], finalMessage: 'A fluent claim without proof.' },
    });

    expect(prepared).toBe(false);
    await expect(access(judgeInput)).rejects.toThrow();
  });

  test('creates canonical schema-valid judge input when required evidence is complete', async () => {
    const directory = await tempDirectory();
    const judgeInput = path.join(directory, 'judge-input.json');
    const input = {
      schemaVersion: 1 as const,
      caseId: 'complete-proof',
      contracts: ['proof-required'],
      checks: [
        {
          id: 'proof-required:required-effect:0',
          state: 'PASS' as const,
          contractId: 'proof-required',
          phase: 'required-effect' as const,
          severity: 'critical' as const,
          facts: ['src/result.ts changed'],
          evidence: { type: 'diff', digest: 'a'.repeat(64), reference: 'case.diff' },
        },
      ],
      observable: { diff: '+result', commands: [], trajectory: [], finalMessage: 'Changed result.' },
    };

    expect(await prepareJudgeSession(judgeInput, input)).toBe(true);
    const written = JSON.parse(await readFile(judgeInput, 'utf8')) as unknown;
    await expect(validateSchema('judge-input', written, judgeInput)).resolves.toBeUndefined();
    expect(await readFile(judgeInput, 'utf8')).toBe(canonicalJson(input));
  });

  test('plans exactly nine maximum sessions and refuses insufficient approval before invocation', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const plan = await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    expect(plan.sessions).toEqual({ calibration: 1, executors: 4, judges: 4, maximum: 9 });
    const preflightFile = path.join(directory, 'preflight.json');
    await createPreflight(planFile, preflightFile);
    await expect(executePlan(planFile, preflightFile, 8, 3.33)).rejects.toThrow(/Approved 8/u);
  });

  test('materializes the sandbox boundary while allowing an absolute executable', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });

    const preflight = await createPreflight(planFile, preflightFile);
    const sandbox = preflight.checks.find(item => item.id === 'executor-sandbox');

    expect(sandbox?.state).toBe('PASS');
    expect(sandbox?.facts).toEqual([
      'mode=workspace-write',
      'network=false',
      'writable_roots=[]',
      '/tmp=excluded',
      '$TMPDIR=excluded',
      'absolute executables are not write targets',
    ]);
  });

  test('detects evaluation drift before invoking a model', async () => {
    const directory = await tempDirectory();
    const copiedEvaluation = path.join(directory, 'evaluation');
    await cp(evaluationDirectory, copiedEvaluation, { recursive: true });
    const planFile = path.join(directory, 'plan.json');
    await createPlan(copiedEvaluation, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    const preflightFile = path.join(directory, 'preflight.json');
    await createPreflight(planFile, preflightFile);
    const prompt = path.join(copiedEvaluation, 'cases', 'usage-valid-no-action', 'prompt.md');
    await writeFile(prompt, `${await readFile(prompt, 'utf8')}\ndrift\n`);
    await expect(executePlan(planFile, preflightFile, 9, 3.33)).rejects.toThrow(/Preflight|drift/u);
  });

  test('preflight rejects engine, schema, evaluation, skill, or model drift', async () => {
    const directory = await tempDirectory();
    const originalPlan = path.join(directory, 'plan.json');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: originalPlan,
    });
    const plan = JSON.parse(await readFile(originalPlan, 'utf8')) as Record<string, unknown>;
    const drifts = [
      ['engineFingerprint', 'engine-fingerprint'],
      ['schemaFingerprint', 'schema-fingerprint'],
      ['evaluationFingerprint', 'evaluation-fingerprint'],
      ['skillFingerprint', 'skill-fingerprint'],
      ['model', 'model-condition'],
    ] as const;

    for (const [field, checkId] of drifts) {
      const planFile = path.join(directory, `${field}.json`);
      await writeCanonicalJson(planFile, { ...plan, [field]: 'drift' });
      const preflight = await createPreflight(planFile, path.join(directory, `${field}.preflight.json`));
      expect(preflight.eligible, field).toBe(false);
      expect(preflight.checks.find(item => item.id === checkId)?.state, field).toBe('FAIL');
    }
  });

  test('an eligible preflight authorizes the fake flow without real model use', async () => {
    const { result, preflight } = await successfulFakeRun();

    expect(result.evidence.provenance.preflightDigest).toBe(canonicalDigest(preflight));
    expect(result.evidence.usage.sessions).toBe(9);
  });

  test('sends complete blind calibration packets without expected responses in the subprocess environment', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    const invocationLog = path.join(directory, 'invocation.json');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    await createPreflight(planFile, preflightFile);
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    process.env.SKILL_EVIDENCE_FAKE_INVOCATION_LOG = invocationLog;

    const result = await executePlan(planFile, preflightFile, 9, 3.33);
    temporary.push(result.runDirectory);

    const calibrationInput = JSON.parse(await readFile(path.join(result.runDirectory, 'calibration-input.json'), 'utf8')) as unknown;
    const invocation = JSON.parse(await readFile(invocationLog, 'utf8')) as {
      calibration: { payload: unknown; environment: string[] };
    };
    expect(invocation.calibration.payload).toEqual(calibrationInput);
    expect(JSON.stringify(calibrationInput)).not.toMatch(/known-valid|known-invalid|alternative-valid|unsupported-fluency|expectedStatus/u);
    expect(invocation.calibration.environment).not.toContain('SKILL_EVIDENCE_CALIBRATION_PROBES');
  });

  test('records the locally derived and observed verdict for every qualification behavior', async () => {
    const { result } = await successfulFakeRun();

    expect(result.evidence.calibration.inputDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.evidence.calibration.resultDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.evidence.calibration.probes).toHaveLength(16);
    expect(result.evidence.calibration.probes.map(probe => probe.expectedStatus)).toEqual([
      'PASS',
      'FAIL',
      'PASS',
      'INCONCLUSIVE',
      'PASS',
      'FAIL',
      'PASS',
      'INCONCLUSIVE',
      'PASS',
      'FAIL',
      'PASS',
      'INCONCLUSIVE',
      'PASS',
      'FAIL',
      'PASS',
      'INCONCLUSIVE',
    ]);
    expect(result.evidence.calibration.probes.every(probe => probe.observedStatus === probe.expectedStatus && probe.passed)).toBe(true);
  });

  test('returns an auditable failed calibration from the public CLI without starting an executor', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    const sessionLog = path.join(directory, 'sessions.log');
    const cli = path.join(root, 'dist', 'cli.js');
    const build = await runProcess([path.join(root, 'node_modules', '.bin', 'tsc'), '-p', 'tsconfig.build.json'], {
      cwd: root,
      timeoutMs: 30_000,
      env: process.env,
    });
    expect(build.exitCode, build.stderr).toBe(0);
    const plan = await runProcess(
      [
        process.execPath,
        cli,
        'plan',
        evaluationDirectory,
        '--model',
        'gpt-5.6-luna',
        '--reasoning-effort',
        'max',
        '--judge-model',
        'gpt-5.6-terra',
        '--judge-reasoning-effort',
        'xhigh',
        '--out',
        planFile,
      ],
      { cwd: root, timeoutMs: 30_000, env: process.env },
    );
    expect(plan.exitCode, plan.stderr).toBe(0);
    const preflight = await runProcess([process.execPath, cli, 'preflight', '--plan', planFile, '--out', preflightFile], {
      cwd: root,
      timeoutMs: 30_000,
      env: process.env,
    });
    expect(preflight.exitCode, preflight.stderr).toBe(0);

    const run = await runProcess(
      [process.execPath, cli, 'run', '--plan', planFile, '--preflight', preflightFile, '--approve-sessions', '9', '--max-credits', '3.33'],
      {
        cwd: root,
        timeoutMs: 30_000,
        env: {
          ...process.env,
          SKILL_EVIDENCE_CODEX_BIN: path.join(root, 'test', 'fixtures', 'fake-codex.mjs'),
          SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS: JSON.stringify({
            status: 'INCONCLUSIVE',
            rationale: 'Scripted fake calibration failure.',
          }),
          SKILL_EVIDENCE_FAKE_SESSION_LOG: sessionLog,
        },
      },
    );

    expect(run.exitCode).not.toBe(0);
    const runDirectory = run.stdout.trim();
    const evidence = JSON.parse(await readFile(path.join(runDirectory, 'evidence.json'), 'utf8')) as Evidence;
    expect(evidence.schemaVersion).toBe(2);
    expect(evidence.cases).toEqual([]);
    expect(evidence.claims.every(claim => claim.status === 'NOT_EVALUATED')).toBe(true);
    expect(evidence.eligibility.reasons).toContain('Judge calibration failed');
    expect(evidence.usage).toMatchObject({ sessions: 1, credits: 0.37 });
    expect((await readFile(sessionLog, 'utf8')).trim().split('\n')).toEqual(['calibration']);
    await expect(access(path.join(runDirectory, 'calibration-input.json'))).resolves.toBeUndefined();
    await expect(access(path.join(runDirectory, 'calibration-result.json'))).resolves.toBeUndefined();
    await expect(access(path.join(runDirectory, 'calibration.raw.jsonl'))).resolves.toBeUndefined();
    await expect(access(path.join(runDirectory, 'calibration.stderr.log'))).resolves.toBeUndefined();
    await expect(access(path.join(runDirectory, 'report.md'))).resolves.toBeUndefined();
    await expect(access(path.join(runDirectory, 'snapshot'))).rejects.toThrow();
    temporary.push(runDirectory);
  });

  test('records every malformed, missing, duplicate, unknown, or incomplete calibration response as an audit failure', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    const sessionLog = path.join(directory, 'sessions.log');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    await createPreflight(planFile, preflightFile);
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG = sessionLog;

    for (const mode of ['missing', 'duplicate', 'unknown', 'malformed', 'incomplete']) {
      process.env.SKILL_EVIDENCE_FAKE_CALIBRATION_RESULTS = JSON.stringify({ mode });
      const result = await executePlan(planFile, preflightFile, 9, 3.33);
      temporary.push(result.runDirectory);

      expect(result.outcome, mode).toBe('calibration-failed');
      expect(result.evidence.cases, mode).toEqual([]);
      expect(
        result.evidence.calibration.probes.every(probe => probe.observedStatus === 'ERROR' && !probe.passed),
        mode,
      ).toBe(true);
      expect(result.evidence.usage.ledger, mode).toHaveLength(1);
    }

    expect((await readFile(sessionLog, 'utf8')).trim().split('\n')).toEqual([
      'calibration',
      'calibration',
      'calibration',
      'calibration',
      'calibration',
    ]);
  });

  test('records input, cache, output, role, and credits separately for every session', async () => {
    const { result } = await successfulFakeRun();

    expect(result.evidence.schemaVersion).toBe(2);
    expect(result.evidence.usage.ledger).toHaveLength(9);
    expect(result.evidence.usage.ledger.map(item => item.role)).toEqual([
      'calibration',
      'executor',
      'judge',
      'executor',
      'judge',
      'executor',
      'judge',
      'executor',
      'judge',
    ]);
    expect(result.evidence.usage.ledger[0]).toMatchObject({
      inputTokens: 10,
      cachedInputTokens: 2,
      outputTokens: 5,
      credits: 0.37,
    });
    expect(result.evidence.usage.credits).toBe(3.33);
  });

  test('stops at the credit boundary before starting the next session', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    const sessionLog = path.join(directory, 'sessions.log');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    await createPreflight(planFile, preflightFile);
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG = sessionLog;

    await expect(executePlan(planFile, preflightFile, 9, 0.37)).rejects.toThrow(/credit limit before session 2/u);

    expect((await readFile(sessionLog, 'utf8')).trim().split('\n')).toEqual(['calibration']);
  });

  test('does not invoke any judge when relevant executor evidence is incomplete', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    const sessionLog = path.join(directory, 'sessions.log');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    await createPreflight(planFile, preflightFile);
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    process.env.SKILL_EVIDENCE_FAKE_SESSION_LOG = sessionLog;
    process.env.SKILL_EVIDENCE_FAKE_SCENARIO = 'incomplete-observability';

    const result = await executePlan(planFile, preflightFile, 9, 3.33);
    temporary.push(result.runDirectory);

    expect((await readFile(sessionLog, 'utf8')).trim().split('\n')).toEqual([
      'calibration',
      'executor',
      'executor',
      'executor',
      'executor',
    ]);
    expect(result.evidence.cases.every(item => item.status === 'INCONCLUSIVE' && item.judge === undefined)).toBe(true);
  });

  test('keeps a critical direct failure authoritative over a favorable judge in a run', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const preflightFile = path.join(directory, 'preflight.json');
    await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-luna',
      reasoningEffort: 'max',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    await createPreflight(planFile, preflightFile);
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    process.env.SKILL_EVIDENCE_FAKE_SCENARIO = 'critical-direct-violation';

    const result = await executePlan(planFile, preflightFile, 9, 3.33);
    temporary.push(result.runDirectory);

    const critical = result.evidence.cases.find(item => item.id === 'stress-public-contract');
    expect(critical?.judge?.status).toBe('PASS');
    expect(critical?.status).toBe('FAIL');
    expect(result.evidence.eligibility.confirm).toBe(false);
  });

  test('renders byte-identically and cannot confirm an ineligible run', async () => {
    const directory = await tempDirectory();
    const evidence: Evidence = {
      schemaVersion: 1,
      runId: 'test-run',
      createdAt: '2026-08-06T12:00:00.000Z',
      provenance: {},
      fingerprints: {},
      calibration: { passed: true, probes: [] },
      cases: [],
      claims: [],
      eligibility: { confirm: false, reasons: ['failed'] },
      usage: { sessions: 1, inputTokens: 0, outputTokens: 0 },
    };
    const evidenceFile = path.join(directory, 'evidence.json');
    await writeCanonicalJson(evidenceFile, evidence);
    const first = await writeReport(evidenceFile);
    const second = await writeReport(evidenceFile);
    expect(Buffer.from(first)).toEqual(Buffer.from(second));
    expect(await readFile(path.join(directory, 'report.md'), 'utf8')).toBe(renderEvidence(evidence));
    const rationale = path.join(directory, 'rationale.md');
    await writeFile(rationale, 'I reviewed the evidence.\n');
    await expect(reviewRun(directory, 'confirm', rationale)).rejects.toThrow(/ineligible/u);
  });

  test('continues rendering historical Evidence v1 and v2 while requiring Evidence v2 for confirmation', async () => {
    const directory = await tempDirectory();
    const evidence: Evidence = {
      schemaVersion: 1,
      runId: 'legacy-eligible-run',
      createdAt: '2026-08-06T12:00:00.000Z',
      provenance: {},
      fingerprints: {},
      calibration: { passed: true, probes: [] },
      cases: [],
      claims: [],
      eligibility: { confirm: true, reasons: [] },
      usage: { sessions: 9, inputTokens: 90, outputTokens: 45 },
    };
    await writeCanonicalJson(path.join(directory, 'evidence.json'), evidence);
    const rationale = path.join(directory, 'rationale.md');
    await writeFile(rationale, 'Legacy evidence was reviewed.\n');

    await expect(writeReport(path.join(directory, 'evidence.json'))).resolves.toContain('legacy-eligible-run');
    await expect(reviewRun(directory, 'confirm', rationale)).rejects.toThrow(/Evidence v2/u);

    const legacyV2: Evidence = {
      schemaVersion: 2,
      runId: 'legacy-v2-run',
      createdAt: '2026-08-06T12:00:00.000Z',
      provenance: {},
      fingerprints: {},
      calibration: { passed: true, probes: [] },
      cases: [],
      claims: [],
      eligibility: { confirm: false, reasons: ['historical'] },
      usage: { sessions: 1, inputTokens: 10, cachedInputTokens: 2, outputTokens: 5, credits: 0.37, ledger: [] },
    };
    await writeCanonicalJson(path.join(directory, 'legacy-v2.json'), legacyV2);
    await expect(writeReport(path.join(directory, 'legacy-v2.json'))).resolves.toContain('legacy-v2-run');
  });

  test('completes the fake nine-session flow with canonical judge packets and review readiness', async () => {
    const { result, sessionLog } = await successfulFakeRun();
    await writeReport(path.join(result.runDirectory, 'evidence.json'));

    expect((await readFile(sessionLog, 'utf8')).trim().split('\n')).toHaveLength(9);
    expect(result.evidence.eligibility.confirm).toBe(true);
    expect(result.evidence.fingerprints.skillSnapshot).toBe(result.evidence.fingerprints.skill);
    expect(result.evidence.cases.every(item => item.checks.length > 0)).toBe(true);
    for (const item of result.evidence.cases) {
      const judgeInput = item.judgeInput;
      expect(judgeInput).toBe(`judge-input/${item.id}.json`);
      if (!judgeInput) throw new Error(`Missing judge input for ${item.id}`);
      const packet = JSON.parse(await readFile(path.join(result.runDirectory, judgeInput), 'utf8')) as unknown;
      await expect(validateSchema('judge-input', packet, judgeInput)).resolves.toBeUndefined();
    }
    await expect(access(path.join(result.runDirectory, 'report.md'))).resolves.toBeUndefined();
    await expect(access(path.join(result.runDirectory, 'review.json'))).rejects.toThrow();
  });

  test('completes a nine-session flow with a fake Codex executor', async () => {
    const { result } = await successfulFakeRun();
    expect(result.outcome).toBe('completed');
    expect(result.evidence.usage.sessions).toBe(9);
    expect(result.evidence.cases.map(item => item.status)).toEqual(['PASS', 'PASS', 'PASS', 'PASS']);
    expect(result.evidence.eligibility.confirm).toBe(true);
    expect(await writeReport(path.join(result.runDirectory, 'evidence.json'))).toBe(renderEvidence(result.evidence));
    await expect(access(path.join(result.runDirectory, 'review.json'))).rejects.toThrow();
  });

  test('keeps all versioned source formats Prettier-compliant', async () => {
    const result = await runProcess(
      [path.join(root, 'node_modules', '.bin', 'prettier'), '--check', 'src', 'test', 'schemas', 'evaluations', 'docs'],
      { cwd: root, timeoutMs: 30_000, env: process.env },
    );
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
  });
});
