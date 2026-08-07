import path from 'node:path';
import { loadEvaluation } from './evaluation.js';
import { directoryFingerprint, writeCanonicalJson } from './files.js';
import type { RunPlan } from './types.js';

const skillExclusions = new Set(['evals', '.git', 'node_modules', 'dist', 'coverage', '.cache', '.skill-evidence']);

export async function createPlan(
  evaluationDirectory: string,
  options: { model: string; reasoningEffort: string; judgeModel: string; judgeReasoningEffort: string; out: string },
): Promise<RunPlan> {
  for (const [name, value] of Object.entries(options)) if (!value.trim()) throw new Error(`Missing option ${name}`);
  const loaded = await loadEvaluation(evaluationDirectory);
  const judges = loaded.cases.length;
  const maximum = 1 + loaded.cases.length + judges;
  if (maximum > 9) throw new Error(`Plan needs ${maximum} sessions; maximum is 9`);
  const plan: RunPlan = {
    schemaVersion: 1,
    evaluationDirectory: loaded.directory,
    evaluationFingerprint: loaded.fingerprint,
    engineFingerprint: await directoryFingerprint(path.resolve(import.meta.dirname)),
    schemaFingerprint: await directoryFingerprint(path.resolve(import.meta.dirname, '..', 'schemas')),
    skillFingerprint: await directoryFingerprint(loaded.evaluation.runtime.skillSource, skillExclusions),
    skillSnapshotFingerprint: await directoryFingerprint(loaded.evaluation.runtime.skillSource, skillExclusions),
    inputDigests: loaded.inputDigests,
    model: options.model,
    reasoningEffort: options.reasoningEffort,
    judgeModel: options.judgeModel,
    judgeReasoningEffort: options.judgeReasoningEffort,
    sessions: { calibration: 1, executors: loaded.cases.length, judges, maximum },
    createdAt: new Date().toISOString(),
  };
  await writeCanonicalJson(options.out, plan);
  return plan;
}

export { skillExclusions };
