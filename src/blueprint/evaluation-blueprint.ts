import { Ajv, type ErrorObject } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';

import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };
import blueprintSchema2 from '../../schemas/evaluation-blueprint.schema-2.json' with { type: 'json' };
import blueprintSchema3 from '../../schemas/evaluation-blueprint.schema-3.json' with { type: 'json' };
import authoringContextSchema from '../../schemas/authoring-context.schema.json' with { type: 'json' };

import { canonicalJson } from '../canonical-json.js';
import { deriveSystemAuthoringContextRequirements, type AuthoringContext } from '../author/authoring-context.js';

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

export interface BlueprintCandidateV3 extends Omit<
  BlueprintCandidate,
  'decisionContext' | 'evidencePlan' | 'population' | 'unresolvedRequirements'
> {
  evidencePlan?: Array<{
    claimIds: string[];
    contractIds: string[];
    id: string;
    paths: Array<{
      assessments: Array<{ id: string; method: 'JUDGMENT' | 'MECHANICAL' | 'SEMANTIC'; procedure: string }>;
      id: string;
      observations: Array<{ capabilityRequired: string; id: string; observable: string; source: string }>;
    }>;
    required: boolean;
  }>;
  unresolvedRequirements?: Array<{
    affectedClaimIds: string[];
    blocking: boolean;
    evidenceNeeded: string;
    field: string;
    id: string;
    reason: string;
    source: string;
    status: 'INSUFFICIENT_INFORMATION' | 'UNKNOWN' | 'UNSUPPORTED' | 'UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT';
  }>;
}

export interface ComposedBlueprintValidation {
  diagnostics: BlueprintDiagnostic[];
  valid: boolean;
}

export interface AuthorProvenance {
  authoringContextFingerprint?: string;
  campaignId: string;
  conditionFingerprint: string;
  instructionDigest: string;
  observedModel: string | null;
  protocolDigest: string;
  reasoningEffort: 'max' | 'xhigh';
  requestedModel: 'gpt-5.6-luna' | 'gpt-5.6-terra';
  schemaDigest: string;
  status: 'NOT_QUALIFIED';
  theoryDigest: string;
}

export type EvaluationBlueprint = Required<BlueprintCandidate> & {
  authorProvenance: AuthorProvenance;
  blueprintId: string;
  lifecycle: { decisionEligible: false; scope: 'DEVELOPMENT_AUTHORING'; state: BlueprintLifecycle };
  schemaVersion: 1 | 2 | 3;
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
const composedAjv = new Ajv2020({ allErrors: true, strict: false });
composedAjv.addSchema(blueprintSchema);
composedAjv.addSchema(
  { ...blueprintSchema, $id: 'https://skill-evidence.local/schemas/evaluation-blueprint.schema.json' },
  'https://skill-evidence.local/schemas/evaluation-blueprint.schema.json',
);
const validateComposedV1 = composedAjv.getSchema(blueprintSchema.$id)!;
const validateComposedV2 = composedAjv.compile(blueprintSchema2);
composedAjv.addSchema(authoringContextSchema);
const validateComposedV3 = composedAjv.compile(blueprintSchema3);

function rewriteSchemaReferences(value: unknown, rewrite: (reference: string) => string): unknown {
  if (Array.isArray(value)) return value.map((entry) => rewriteSchemaReferences(entry, rewrite));
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === '$ref' && typeof entry === 'string' ? rewrite(entry) : rewriteSchemaReferences(entry, rewrite),
    ]),
  );
}

const bundledBlueprintSchema = rewriteSchemaReferences(
  Object.fromEntries(Object.entries(blueprintSchema).filter(([key]) => key !== '$id' && key !== '$schema')),
  (reference) => (reference.startsWith('#/') ? `#/$defs/blueprint${reference.slice(1)}` : reference),
);
const localizeBlueprintReference = (reference: string): string => {
  const relativePrefix = 'evaluation-blueprint.schema.json#';
  const canonicalPrefix = 'https://skill-evidence.local/schemas/evaluation-blueprint.schema-1.json#';
  if (reference.startsWith(relativePrefix)) return `#/$defs/blueprint${reference.slice(relativePrefix.length)}`;
  if (reference.startsWith(canonicalPrefix)) return `#/$defs/blueprint${reference.slice(canonicalPrefix.length)}`;
  return reference;
};

export const evaluationBlueprintCandidateSchemaV3 = {
  $id: 'https://skill-evidence.local/schemas/evaluation-blueprint-candidate.schema-3.json',
  $defs: {
    ...(rewriteSchemaReferences(blueprintSchema3.$defs, localizeBlueprintReference) as typeof blueprintSchema3.$defs),
    blueprint: bundledBlueprintSchema,
    authorRequirement: {
      additionalProperties: false,
      properties: {
        affectedClaimIds: { $ref: '#/$defs/blueprint/$defs/stringArray' },
        blocking: { type: 'boolean' },
        evidenceNeeded: { $ref: '#/$defs/blueprint/$defs/nonEmptyString' },
        field: { $ref: '#/$defs/blueprint/$defs/nonEmptyString' },
        id: { $ref: '#/$defs/candidateId' },
        reason: { $ref: '#/$defs/blueprint/$defs/nonEmptyString' },
        source: { $ref: '#/$defs/blueprint/$defs/nonEmptyString' },
        status: { enum: ['UNKNOWN', 'UNSUPPORTED', 'INSUFFICIENT_INFORMATION', 'UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT'] },
      },
      required: ['id', 'field', 'reason', 'status', 'blocking', 'evidenceNeeded', 'source', 'affectedClaimIds'],
      type: 'object',
    },
  },
  additionalProperties: false,
  properties: Object.fromEntries(
    Object.entries(blueprintSchema3.properties)
      .filter(([field]) => !controlledFields.has(field) && field !== 'decisionContext' && field !== 'population')
      .map(([field, schema]) => [
        field,
        field === 'unresolvedRequirements'
          ? { items: { $ref: '#/$defs/authorRequirement' }, type: 'array' }
          : rewriteSchemaReferences(schema, localizeBlueprintReference),
      ]),
  ),
  required: blueprintSchema3.required.filter(
    (field) => !controlledFields.has(field) && field !== 'decisionContext' && field !== 'population',
  ),
  type: 'object',
};

const candidateV3Ajv = new Ajv2020({ allErrors: true, strict: false });
const validateStructureV3 = candidateV3Ajv.compile(evaluationBlueprintCandidateSchemaV3);

function structuralDiagnostics(errors: ErrorObject[] | null | undefined): BlueprintDiagnostic[] {
  return (errors ?? []).map((error) => ({ code: `SCHEMA_${error.keyword.toUpperCase()}`, path: error.instancePath || '/' }));
}

export function validateComposedEvaluationBlueprint(value: unknown): ComposedBlueprintValidation {
  const schemaVersion =
    value !== null && typeof value === 'object' && 'schemaVersion' in value
      ? (value as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  const validate =
    schemaVersion === 1
      ? validateComposedV1
      : schemaVersion === 2
        ? validateComposedV2
        : schemaVersion === 3
          ? validateComposedV3
          : undefined;
  if (validate === undefined) {
    return { diagnostics: [{ code: 'SCHEMA_VERSION', path: '/schemaVersion' }], valid: false };
  }
  const valid = validate(value);
  if (!valid) return { diagnostics: structuralDiagnostics(validate.errors), valid: false };
  if (schemaVersion !== 3) return { diagnostics: [], valid: true };
  const diagnostics = validateSystemBlockerIntegrity(value as Record<string, unknown>);
  return { diagnostics, valid: diagnostics.length === 0 };
}

function validateSystemBlockerIntegrity(blueprint: Record<string, unknown>): BlueprintDiagnostic[] {
  const requirements = blueprint.unresolvedRequirements as Array<Record<string, unknown>>;
  const context = { decisionContext: blueprint.decisionContext, population: blueprint.population, schemaVersion: 1 } as AuthoringContext;
  const expected = new Map(deriveSystemAuthoringContextRequirements(context).map((requirement) => [requirement.id, requirement]));
  const actualSystem = requirements.filter(
    (requirement) => requirement.origin === 'SYSTEM_AUTHORING_CONTEXT' || String(requirement.id).startsWith('system:authoring-context:'),
  );
  const diagnostics: BlueprintDiagnostic[] = [];
  for (const [index, requirement] of requirements.entries()) {
    if (requirement.origin === 'AUTHOR' && String(requirement.id).startsWith('system:authoring-context:')) {
      diagnostics.push({ code: 'SYSTEM_BLOCKER_INTEGRITY', path: `/unresolvedRequirements/${index}/id` });
    }
  }
  for (const [id, expectedRequirement] of expected) {
    const matches = actualSystem.filter((requirement) => requirement.id === id);
    if (matches.length !== 1 || canonicalJson(matches[0]) !== canonicalJson(expectedRequirement)) {
      diagnostics.push({ code: 'SYSTEM_BLOCKER_INTEGRITY', path: '/unresolvedRequirements' });
    }
  }
  for (const requirement of actualSystem) {
    if (typeof requirement.id !== 'string' || !expected.has(requirement.id)) {
      diagnostics.push({ code: 'SYSTEM_BLOCKER_INTEGRITY', path: '/unresolvedRequirements' });
    }
  }
  return diagnostics;
}

function reservedIdDiagnostic(value: unknown, path = ''): BlueprintDiagnostic | undefined {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const diagnostic = reservedIdDiagnostic(item, `${path}/${index}`);
      if (diagnostic !== undefined) return diagnostic;
    }
    return undefined;
  }
  if (typeof value !== 'object' || value === null) return undefined;
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}/${key}`;
    if (key === 'id' && typeof item === 'string' && item.startsWith('system:authoring-context:')) {
      return { code: 'CANDIDATE_RESERVED_ID', path: itemPath };
    }
    const diagnostic = reservedIdDiagnostic(item, itemPath);
    if (diagnostic !== undefined) return diagnostic;
  }
  return undefined;
}

function allIds(value: unknown): Array<{ id: string; path: string }> {
  const ids: Array<{ id: string; path: string }> = [];
  const visit = (item: unknown, path: string): void => {
    if (Array.isArray(item)) {
      item.forEach((entry, index) => visit(entry, `${path}/${index}`));
      return;
    }
    if (typeof item !== 'object' || item === null) return;
    for (const [key, entry] of Object.entries(item)) {
      const entryPath = `${path}/${key}`;
      if (key === 'id' && typeof entry === 'string') ids.push({ id: entry, path: entryPath });
      else visit(entry, entryPath);
    }
  };
  visit(value, '');
  return ids;
}

export function validateEvaluationBlueprintV3(value: unknown): BlueprintValidation {
  const reserved = reservedIdDiagnostic(value);
  if (reserved !== undefined) return { complete: false, diagnostics: [reserved], structurallyValid: false };
  if (!validateStructureV3(value)) {
    return { complete: false, diagnostics: structuralDiagnostics(validateStructureV3.errors), structurallyValid: false };
  }
  const candidate = value as BlueprintCandidateV3;
  const diagnostics: BlueprintDiagnostic[] = [];
  const seen = new Set<string>();
  for (const entry of allIds(candidate)) {
    if (seen.has(entry.id)) diagnostics.push({ code: 'DUPLICATE_ID', path: entry.path });
    seen.add(entry.id);
  }
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
  candidate.unresolvedRequirements?.forEach((requirement, index) =>
    addBrokenReferences(requirement.affectedClaimIds, claimIds, `/unresolvedRequirements/${index}/affectedClaimIds`, diagnostics),
  );
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
      (requirement) => requirement.blocking && requirement.field === field,
    );
    if (candidate[field] !== undefined && candidate[field].length === 0 && !representedByBlocker) {
      diagnostics.push({ code: 'REQUIRED_SECTION_EMPTY', path: `/${field}` });
    }
  }
  return { complete: diagnostics.length === 0, diagnostics, structurallyValid: true };
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
