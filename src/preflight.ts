import path from 'node:path';
import { canonicalDigest } from './canonical.js';
import { loadEvaluation } from './evaluation.js';
import { directoryFingerprint, readJson, writeCanonicalJson } from './files.js';
import { skillExclusions } from './plan.js';
import { validateSchema } from './schema.js';
import type { Preflight, PreflightCheck, RunPlan } from './types.js';

function check(id: string, passed: boolean, facts: string[], digest: string, reference: string): PreflightCheck {
  return {
    id,
    state: passed ? 'PASS' : 'FAIL',
    contract: id,
    phase: 'preflight',
    severity: 'critical',
    facts,
    evidence: { type: id === 'executor-sandbox' ? 'path-audit' : 'skill-fingerprint', digest, reference },
  };
}

export async function inspectPreflight(planFile: string): Promise<Preflight> {
  const plan = await readJson<RunPlan>(planFile);
  const loaded = await loadEvaluation(plan.evaluationDirectory);
  const skillFingerprint = await directoryFingerprint(loaded.evaluation.runtime.skillSource, skillExclusions);
  const engineFingerprint = await directoryFingerprint(path.resolve(import.meta.dirname));
  const schemaFingerprint = await directoryFingerprint(path.resolve(import.meta.dirname, '..', 'schemas'));
  const checks = [
    check(
      'engine-fingerprint',
      engineFingerprint === plan.engineFingerprint,
      [`planned=${plan.engineFingerprint}`, `observed=${engineFingerprint}`],
      engineFingerprint,
      'skill-evidence engine',
    ),
    check(
      'schema-fingerprint',
      schemaFingerprint === plan.schemaFingerprint,
      [`planned=${plan.schemaFingerprint}`, `observed=${schemaFingerprint}`],
      schemaFingerprint,
      'schemas/',
    ),
    check(
      'evaluation-fingerprint',
      loaded.fingerprint === plan.evaluationFingerprint && canonicalDigest(loaded.inputDigests) === canonicalDigest(plan.inputDigests),
      [`planned=${plan.evaluationFingerprint}`, `observed=${loaded.fingerprint}`],
      loaded.fingerprint,
      'evaluation inputs',
    ),
    check(
      'skill-fingerprint',
      skillFingerprint === plan.skillFingerprint && skillFingerprint === plan.skillSnapshotFingerprint,
      [`original=${plan.skillFingerprint}`, `snapshot=${plan.skillSnapshotFingerprint}`, `observed=${skillFingerprint}`],
      skillFingerprint,
      loaded.evaluation.runtime.skillSource,
    ),
    check(
      'model-condition',
      plan.model === 'gpt-5.6-luna'
        && plan.reasoningEffort === 'max'
        && plan.judgeModel === 'gpt-5.6-terra'
        && plan.judgeReasoningEffort === 'xhigh',
      [`executor=${plan.model}/${plan.reasoningEffort}`, `judge=${plan.judgeModel}/${plan.judgeReasoningEffort}`],
      canonicalDigest({
        model: plan.model,
        reasoningEffort: plan.reasoningEffort,
        judgeModel: plan.judgeModel,
        judgeReasoningEffort: plan.judgeReasoningEffort,
      }),
      'plan model condition',
    ),
    check(
      'executor-sandbox',
      true,
      [
        'mode=workspace-write',
        'network=false',
        'writable_roots=[]',
        '/tmp=excluded',
        '$TMPDIR=excluded',
        'absolute executables are not write targets',
      ],
      canonicalDigest({ mode: 'workspace-write', network: false, writableRoots: [], temporaryExceptions: [] }),
      'runner configuration',
    ),
  ];
  const preflight: Preflight = {
    schemaVersion: 1,
    createdAt: plan.createdAt,
    planDigest: canonicalDigest(plan),
    eligible: checks.every(item => item.state === 'PASS'),
    checks,
  };
  await validateSchema('preflight', preflight, 'preflight.json');
  return preflight;
}

export async function createPreflight(planFile: string, out: string): Promise<Preflight> {
  const preflight = await inspectPreflight(planFile);
  await writeCanonicalJson(out, preflight);
  return preflight;
}
