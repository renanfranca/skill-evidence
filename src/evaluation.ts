import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { canonicalDigest, sha256 } from './canonical.js';
import { assertNoSymlinks, directoryFingerprint, readJson, safeResolve } from './files.js';
import { validateSchema } from './schema.js';
import type { Contract, Evaluation, EvaluationCase, LoadedEvaluation } from './types.js';

async function requiredFile(root: string, relative: string): Promise<string> {
  const file = safeResolve(root, relative);
  await access(file);
  return file;
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}

export async function loadEvaluation(directory: string): Promise<LoadedEvaluation> {
  const root = path.resolve(directory);
  const evaluationFile = await requiredFile(root, 'evaluation.json');
  const evaluation = await readJson<Evaluation>(evaluationFile);
  await validateSchema('evaluation', evaluation, 'evaluation.json');
  assertUnique(
    evaluation.claims.map(claim => claim.id),
    'claim IDs',
  );
  assertUnique(evaluation.cases, 'case references');

  const cases: EvaluationCase[] = [];
  const contracts = new Map<string, Contract>();
  const inputDigests: Record<string, string> = {};
  inputDigests['evaluation.json'] = sha256(await readFile(evaluationFile));

  for (const reference of evaluation.cases) {
    const caseFile = await requiredFile(root, reference);
    const evaluationCase = await readJson<EvaluationCase>(caseFile);
    await validateSchema('case', evaluationCase, reference);
    cases.push(evaluationCase);
    inputDigests[reference] = sha256(await readFile(caseFile));
    await requiredFile(root, evaluationCase.prompt);
    await requiredFile(root, evaluationCase.oracle);
    const fixture = await requiredFile(root, evaluationCase.fixture);
    await assertNoSymlinks(fixture);
    inputDigests[evaluationCase.prompt] = sha256(await readFile(safeResolve(root, evaluationCase.prompt)));
    inputDigests[evaluationCase.oracle] = sha256(await readFile(safeResolve(root, evaluationCase.oracle)));
    inputDigests[`${evaluationCase.fixture}/`] = await directoryFingerprint(fixture);

    for (const contractReference of evaluationCase.contracts) {
      const contractFile = await requiredFile(root, contractReference);
      const contract = await readJson<Contract>(contractFile);
      await validateSchema('contract', contract, contractReference);
      const existing = contracts.get(contract.id);
      if (existing && canonicalDigest(existing) !== canonicalDigest(contract))
        throw new Error(`Duplicate contract ID with different content: ${contract.id}`);
      contracts.set(contract.id, contract);
      inputDigests[contractReference] = sha256(await readFile(contractFile));
      for (const check of [...contract.preconditions, ...contract.requiredEffects, ...contract.prohibitedEffects]) {
        if (check.path) safeResolve(fixture, check.path);
      }
    }
  }

  assertUnique(
    cases.map(item => item.id),
    'case IDs',
  );
  if (evaluation.thresholds.requiredPassingCases > cases.length) throw new Error('requiredPassingCases exceeds the case population');
  const knownClaims = new Set(evaluation.claims.map(claim => claim.id));
  const evidencedClaims = new Set<string>();
  for (const contract of contracts.values())
    for (const claim of contract.claims) {
      if (!knownClaims.has(claim)) throw new Error(`Contract ${contract.id} references unknown claim ${claim}`);
      evidencedClaims.add(claim);
    }
  for (const claim of knownClaims) if (!evidencedClaims.has(claim)) throw new Error(`Claim has no contract evidence: ${claim}`);
  await access(evaluation.runtime.skillSource);

  return {
    directory: root,
    evaluation,
    cases,
    contracts: [...contracts.values()],
    inputDigests,
    fingerprint: canonicalDigest(inputDigests),
  };
}
