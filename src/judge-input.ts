import { writeCanonicalJson } from './files.js';
import { validateSchema } from './schema.js';

export interface JudgeInput {
  schemaVersion: 1;
  caseId: string;
  contracts: string[];
  checks: {
    id: string;
    state: 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'ERROR';
    contractId: string;
    phase: 'precondition' | 'required-effect' | 'prohibited-effect' | 'temporal';
    severity: 'critical' | 'major' | 'minor';
    facts: string[];
    evidence: { type: string; digest: string; reference: string; sequence?: number };
  }[];
  observable: {
    diff: string;
    commands: { argv: string[]; exitCode: number; stdout: string; stderr: string }[];
    trajectory: unknown[];
    finalMessage: string;
  };
}

export async function prepareJudgeSession(file: string, input: JudgeInput): Promise<boolean> {
  if (input.checks.length === 0 || input.checks.some(check => check.state === 'INCONCLUSIVE' || check.state === 'ERROR')) return false;
  await validateSchema('judge-input', input, 'judge-input.json');
  await writeCanonicalJson(file, input);
  return true;
}
