import { Ajv, type ErrorObject } from 'ajv';

import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };

export type BlueprintLifecycle = 'BLOCKED' | 'DRAFT' | 'READY';

export interface BlueprintCandidate {
  activationRegions?: { nearBoundary: string[]; negative: string[]; positive: string[] };
  analysisPlan?: {
    missingTrials: string;
    multiplicity: string;
    primaryComparisons: string[];
    reportingRule: string;
    subgroups: string[];
  };
  claims?: Array<{ id: string; mandatory: boolean; statement: string; type: string }>;
  contrasts?: Array<{ claimIds: string[]; condition: string; id: string; rationale: string }>;
  contracts?: Array<{
    acceptableDecisions: string[];
    activationExpectation: string;
    authorityConstraints: string[];
    claimIds: string[];
    evidenceRequired: string[];
    id: string;
    preconditions: string[];
    prohibitedEffects: string[];
    recoveryBehavior: string[];
    requiredEffects: string[];
    responsibilityBoundaries: string[];
    stimulus: string;
    temporalConstraints: string[];
  }>;
  decisionContext?: {
    decision: string;
    efficiencyBudgets: string[];
    maximumAcceptableRegression: string;
    minimumWorthwhileImprovement: string;
    requiredUncertainty: string;
    severeHarmLimits: string[];
  };
  evidencePlan?: Array<{
    claimIds: string[];
    contractIds: string[];
    evidenceType: string;
    id: string;
    required: boolean;
    source: string;
  }>;
  exclusions?: Array<{ description: string; id: string }>;
  oracleQualificationPlan?: {
    ambiguousAlternatives: string[];
    invalidBehaviors: string[];
    leakageChecks: string[];
    validBehaviors: string[];
  };
  policies?: {
    criticalViolationPrecedence: string;
    expectationBlindness: string;
    missingEvidence: string;
    semanticEquivalence: string;
  };
  population?: { excluded: string[]; target: string };
  samplingPlan?: {
    exclusionRules: string[];
    inclusionRules: string[];
    randomization: string;
    repetitions: number;
    stressCount: number;
    usageCount: number;
  };
  skill?: { name: string; summary: string };
  stoppingConditions?: Array<{ action: string; condition: string; id: string }>;
  stressFamilies?: Array<{ contractIds: string[]; description: string; id: string }>;
  unresolvedRequirements?: Array<{ blocking: boolean; description: string; id: string; relatedSection: string }>;
  untestedRisks?: Array<{ description: string; id: string; severity: string }>;
  usageFamilies?: Array<{ contractIds: string[]; description: string; id: string }>;
}

export interface BlueprintValidation {
  complete: boolean;
  diagnostics: BlueprintDiagnostic[];
  structurallyValid: boolean;
}

export interface BlueprintDiagnostic {
  code: string;
  path: string;
}

export interface AuthorProvenance {
  campaignId: string;
  conditionFingerprint: string;
  instructionDigest: string;
  observedModel: string | null;
  protocolDigest: string;
  reasoningEffort: 'xhigh';
  requestedModel: 'gpt-5.6-terra';
  schemaDigest: string;
  status: 'NOT_QUALIFIED';
  theoryDigest: string;
}

export type EvaluationBlueprint = Required<BlueprintCandidate> & {
  authorProvenance: AuthorProvenance;
  blueprintId: string;
  lifecycle: { decisionEligible: false; scope: 'DEVELOPMENT_AUTHORING'; state: BlueprintLifecycle };
  schemaVersion: 1;
  snapshotFingerprint: string;
};

const controlledFields = new Set(['authorProvenance', 'blueprintId', 'lifecycle', 'schemaVersion', 'snapshotFingerprint']);
const candidateFields = Object.keys(blueprintSchema.properties).filter((field) => !controlledFields.has(field));
export const evaluationBlueprintCandidateSchema = {
  $defs: blueprintSchema.$defs,
  additionalProperties: false,
  properties: Object.fromEntries(
    candidateFields.map((field) => [field, blueprintSchema.properties[field as keyof typeof blueprintSchema.properties]]),
  ),
  required: candidateFields,
  type: 'object',
};
const ajv = new Ajv({ allErrors: true, strict: false });
const validateStructure = ajv.compile(evaluationBlueprintCandidateSchema);

function structuralDiagnostics(errors: ErrorObject[] | null | undefined): BlueprintDiagnostic[] {
  return (errors ?? []).map((error) => ({ code: `SCHEMA_${error.keyword.toUpperCase()}`, path: error.instancePath || '/' }));
}

function addDuplicateDiagnostics(candidate: BlueprintCandidate, diagnostics: BlueprintDiagnostic[]): void {
  const collections = [
    ['claims', candidate.claims],
    ['exclusions', candidate.exclusions],
    ['contracts', candidate.contracts],
    ['usageFamilies', candidate.usageFamilies],
    ['stressFamilies', candidate.stressFamilies],
    ['contrasts', candidate.contrasts],
    ['evidencePlan', candidate.evidencePlan],
    ['stoppingConditions', candidate.stoppingConditions],
    ['unresolvedRequirements', candidate.unresolvedRequirements],
    ['untestedRisks', candidate.untestedRisks],
  ] as const;
  const seen = new Set<string>();
  for (const [name, collection] of collections) {
    collection?.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        diagnostics.push({ code: 'DUPLICATE_ID', path: `/${name}/${index}/id` });
      }
      seen.add(entry.id);
    });
  }
}

function addBrokenReferences(values: string[] | undefined, known: Set<string>, path: string, diagnostics: BlueprintDiagnostic[]): void {
  values?.forEach((value, index) => {
    if (!known.has(value)) {
      diagnostics.push({ code: 'BROKEN_REFERENCE', path: `${path}/${index}` });
    }
  });
}

function addReferenceDiagnostics(candidate: BlueprintCandidate, diagnostics: BlueprintDiagnostic[]): void {
  const claimIds = new Set(candidate.claims?.map((claim) => claim.id));
  const contractIds = new Set(candidate.contracts?.map((contract) => contract.id));
  candidate.contracts?.forEach((contract, index) =>
    addBrokenReferences(contract.claimIds, claimIds, `/contracts/${index}/claimIds`, diagnostics),
  );
  candidate.usageFamilies?.forEach((family, index) =>
    addBrokenReferences(family.contractIds, contractIds, `/usageFamilies/${index}/contractIds`, diagnostics),
  );
  candidate.stressFamilies?.forEach((family, index) =>
    addBrokenReferences(family.contractIds, contractIds, `/stressFamilies/${index}/contractIds`, diagnostics),
  );
  candidate.contrasts?.forEach((contrast, index) =>
    addBrokenReferences(contrast.claimIds, claimIds, `/contrasts/${index}/claimIds`, diagnostics),
  );
  candidate.evidencePlan?.forEach((evidence, index) => {
    addBrokenReferences(evidence.claimIds, claimIds, `/evidencePlan/${index}/claimIds`, diagnostics);
    addBrokenReferences(evidence.contractIds, contractIds, `/evidencePlan/${index}/contractIds`, diagnostics);
  });
}

function addEvidenceDiagnostics(candidate: BlueprintCandidate, diagnostics: BlueprintDiagnostic[]): void {
  const mandatoryClaimIds = new Set(candidate.claims?.filter((claim) => claim.mandatory).map((claim) => claim.id));
  const evidenceGapRepresented = candidate.unresolvedRequirements?.some(
    (requirement) => requirement.blocking && requirement.relatedSection === 'evidencePlan',
  );
  candidate.contracts?.forEach((contract, index) => {
    const mandatory = contract.claimIds.some((claimId) => mandatoryClaimIds.has(claimId));
    const directEvidence = candidate.evidencePlan?.some(
      (evidence) => evidence.required && evidence.evidenceType === 'DIRECT' && evidence.contractIds.includes(contract.id),
    );
    if (mandatory && contract.evidenceRequired.length > 0 && !directEvidence && !evidenceGapRepresented) {
      diagnostics.push({ code: 'MANDATORY_DIRECT_EVIDENCE_MISSING', path: `/contracts/${index}/evidenceRequired` });
    }
  });
}

export function validateEvaluationBlueprint(value: unknown): BlueprintValidation {
  if (!validateStructure(value)) {
    return { complete: false, diagnostics: structuralDiagnostics(validateStructure.errors), structurallyValid: false };
  }
  const candidate = value as BlueprintCandidate;
  const diagnostics: BlueprintDiagnostic[] = [];
  for (const field of candidateFields) {
    if (!(field in candidate)) {
      diagnostics.push({ code: 'REQUIRED_SECTION_MISSING', path: `/${field}` });
    }
  }
  for (const field of [
    'claims',
    'contracts',
    'usageFamilies',
    'stressFamilies',
    'evidencePlan',
    'stoppingConditions',
    'untestedRisks',
  ] as const) {
    const representedByBlocker = candidate.unresolvedRequirements?.some(
      (requirement) => requirement.blocking && requirement.relatedSection === field,
    );
    if (candidate[field] !== undefined && candidate[field].length === 0 && !representedByBlocker) {
      diagnostics.push({ code: 'REQUIRED_SECTION_EMPTY', path: `/${field}` });
    }
  }
  addDuplicateDiagnostics(candidate, diagnostics);
  addReferenceDiagnostics(candidate, diagnostics);
  addEvidenceDiagnostics(candidate, diagnostics);
  return { complete: diagnostics.length === 0, diagnostics, structurallyValid: true };
}

export function deriveBlueprintLifecycle(candidate: BlueprintCandidate, validation: BlueprintValidation): BlueprintLifecycle {
  if (!validation.structurallyValid || !validation.complete || validation.diagnostics.length > 0) {
    return 'DRAFT';
  }
  return candidate.unresolvedRequirements?.some((requirement) => requirement.blocking) === true ? 'BLOCKED' : 'READY';
}
