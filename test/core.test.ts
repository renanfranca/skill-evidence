import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { canonicalDigest, canonicalJson } from '../src/canonical.js';
import { isSkillPreserved, observesOutOfScopeWrite, temporalOrderObserved } from '../src/checks.js';
import { loadEvaluation } from '../src/evaluation.js';
import { normalizeJsonl } from '../src/events.js';
import { safeResolve, writeCanonicalJson } from '../src/files.js';
import { archiveRun, reviewRun, writeReport } from '../src/lifecycle.js';
import { createPlan } from '../src/plan.js';
import { runProcess } from '../src/process.js';
import { renderEvidence } from '../src/report.js';
import { executePlan, qualifyCalibration, resolveCaseStatus } from '../src/runner.js';
import { containsSecret, sanitize } from '../src/security.js';
import type { Evidence } from '../src/types.js';
import { forceRemove } from '../src/workspace.js';

const root = path.resolve(import.meta.dirname, '..');
const evaluationDirectory = path.join(root, 'evaluations', 'refactor-design');
const temporary: string[] = [];

async function tempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'skill-evidence-test-'));
  temporary.push(directory);
  return directory;
}

afterEach(async () => {
  delete process.env.SKILL_EVIDENCE_CODEX_BIN;
  await Promise.all(
    temporary.splice(0).map(directory => forceRemove(directory).catch(() => rm(directory, { recursive: true, force: true }))),
  );
});

describe.sequential('canonical domain and safety boundaries', () => {
  test('canonicalizes object keys and fingerprints deterministically', () => {
    expect(canonicalJson({ z: 1, a: { d: 2, b: 1 } })).toBe('{"a":{"b":1,"d":2},"z":1}\n');
    expect(canonicalDigest({ b: 2, a: 1 })).toBe(canonicalDigest({ a: 1, b: 2 }));
  });

  test('loads schemas, references, claims, and the four-case population', async () => {
    const loaded = await loadEvaluation(evaluationDirectory);
    expect(loaded.cases.map(item => item.distribution)).toEqual(['usage', 'usage', 'stress', 'stress']);
    expect(loaded.contracts).toHaveLength(4);
    expect(loaded.evaluation.thresholds.requiredPassingCases).toBe(4);
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
  test('plans exactly nine maximum sessions and refuses insufficient approval before invocation', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    const plan = await createPlan(evaluationDirectory, {
      model: 'gpt-5.6-terra',
      reasoningEffort: 'xhigh',
      judgeModel: 'gpt-5.6-terra',
      judgeReasoningEffort: 'xhigh',
      out: planFile,
    });
    expect(plan.sessions).toEqual({ calibration: 1, executors: 4, judges: 4, maximum: 9 });
    await expect(executePlan(planFile, 8)).rejects.toThrow(/Approved 8/u);
  });

  test('detects evaluation drift before invoking a model', async () => {
    const directory = await tempDirectory();
    const copiedEvaluation = path.join(directory, 'evaluation');
    await cp(evaluationDirectory, copiedEvaluation, { recursive: true });
    const planFile = path.join(directory, 'plan.json');
    await createPlan(copiedEvaluation, {
      model: 'fake',
      reasoningEffort: 'low',
      judgeModel: 'fake',
      judgeReasoningEffort: 'low',
      out: planFile,
    });
    const prompt = path.join(copiedEvaluation, 'cases', 'usage-valid-no-action', 'prompt.md');
    await writeFile(prompt, `${await readFile(prompt, 'utf8')}\ndrift\n`);
    await expect(executePlan(planFile, 9)).rejects.toThrow(/drift/u);
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

  test('completes a nine-session flow with a fake Codex executor', async () => {
    const directory = await tempDirectory();
    const planFile = path.join(directory, 'plan.json');
    await createPlan(evaluationDirectory, {
      model: 'fake',
      reasoningEffort: 'low',
      judgeModel: 'fake',
      judgeReasoningEffort: 'low',
      out: planFile,
    });
    process.env.SKILL_EVIDENCE_CODEX_BIN = path.join(root, 'test', 'fixtures', 'fake-codex.mjs');
    const result = await executePlan(planFile, 9);
    temporary.push(result.runDirectory);
    expect(result.evidence.usage.sessions).toBe(9);
    expect(result.evidence.cases.map(item => item.status)).toEqual(['PASS', 'PASS', 'PASS', 'PASS']);
    expect(result.evidence.eligibility.confirm).toBe(true);
    const rationale = path.join(directory, 'rationale.md');
    await writeFile(rationale, 'The bounded evidence is eligible for confirmation.\n');
    await reviewRun(result.runDirectory, 'confirm', rationale);
    const previousDirectory = process.cwd();
    try {
      process.chdir(directory);
      const archive = await archiveRun(result.runDirectory);
      expect(await readFile(path.join(archive, 'report.md'), 'utf8')).toBe(renderEvidence(result.evidence));
    } finally {
      process.chdir(previousDirectory);
    }
  }, 30_000);

  test('keeps all versioned source formats Prettier-compliant', async () => {
    const result = await runProcess(
      [path.join(root, 'node_modules', '.bin', 'prettier'), '--check', 'src', 'test', 'schemas', 'evaluations', 'docs'],
      { cwd: root, timeoutMs: 30_000, env: process.env },
    );
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
  });
});
