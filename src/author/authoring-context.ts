import { Ajv2020 } from 'ajv/dist/2020.js';

import authoringContextSchema from '../../schemas/authoring-context.schema.json' with { type: 'json' };

export type MissingFactStatus = 'UNKNOWN' | 'UNSUPPORTED' | 'INSUFFICIENT_INFORMATION' | 'UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT';
export type ClaimType =
  | 'ACTIVATION_QUALITY'
  | 'CHANGE_EFFECT'
  | 'DISCRIMINATORY_POWER'
  | 'GENERALIZATION'
  | 'INSTRUCTIONAL_FIDELITY'
  | 'OBSERVED_BEHAVIOR'
  | 'OPERATIONAL_EFFICIENCY'
  | 'OUTCOME_QUALITY'
  | 'PROCESS_COMPLIANCE'
  | 'REGRESSION_PROTECTION'
  | 'ROBUSTNESS'
  | 'SAFETY_NONINTERFERENCE'
  | 'SKILL_CONTRIBUTION'
  | 'STABILITY';

export type MissingFactDependency = { scope: 'CLAIM_REQUIREMENT'; claimRequirementId: string } | { scope: 'DECISION' };

export type AuthoringFact<T> =
  | { disposition: 'SUPPLIED'; source: string; value: T }
  | {
      dependency: MissingFactDependency;
      disposition: 'REQUIRED_ABSENT';
      evidenceNeeded: string;
      reason: string;
      source: string;
      status: MissingFactStatus;
    }
  | { disposition: 'NOT_REQUIRED'; rationale: string; source: string };

export interface PopulationScope {
  excluded: string[];
  id: string;
  source: string;
  target: string;
}

export interface TrustedClaimRequirement {
  claimBoundary: string;
  decisionCritical: boolean;
  id: string;
  mandatory: boolean;
  populationScopeIds: string[];
  rationale: string;
  source: string;
  type: ClaimType;
}

export interface AuthoringContext {
  claimRequirements: TrustedClaimRequirement[];
  decisionContext: {
    decision: AuthoringFact<string>;
    efficiencyBudgets: AuthoringFact<string[]>;
    maximumAcceptableRegression: AuthoringFact<string>;
    minimumWorthwhileImprovement: AuthoringFact<string>;
    requiredUncertainty: AuthoringFact<string>;
    severeHarmLimits: AuthoringFact<string[]>;
  };
  population: {
    defaultScopeId: string;
    excluded: AuthoringFact<string[]>;
    scopes: PopulationScope[];
    target: AuthoringFact<string>;
  };
  schemaVersion: 2;
}

export interface ClaimRequirementReference {
  claimRequirementId?: string;
  id: string;
}

export interface SystemAuthoringContextRequirement {
  affectedClaimIds: string[];
  affectedClaimRequirementId?: string;
  blocking: true;
  dependency: MissingFactDependency;
  evidenceNeeded: string;
  field: string;
  id: string;
  origin: 'SYSTEM_AUTHORING_CONTEXT';
  reason: string;
  source: string;
  status: MissingFactStatus;
}

const authoringContextAjv = new Ajv2020({ allErrors: true, strict: false });
const validateAuthoringContext = authoringContextAjv.compile(authoringContextSchema);

export interface AuthoringContextSemanticDiagnostic {
  path: string;
}

export function validateAuthoringContextSemantics(context: AuthoringContext): AuthoringContextSemanticDiagnostic[] {
  const diagnostics: AuthoringContextSemanticDiagnostic[] = [];
  const scopeIds = context.population.scopes.map((scope) => scope.id);
  const requirementIds = context.claimRequirements.map((requirement) => requirement.id);
  const seenScopes = new Set<string>();
  scopeIds.forEach((id, index) => {
    if (seenScopes.has(id)) diagnostics.push({ path: `/population/scopes/${index}/id` });
    seenScopes.add(id);
  });
  const seenRequirements = new Set<string>();
  requirementIds.forEach((id, index) => {
    if (seenRequirements.has(id)) diagnostics.push({ path: `/claimRequirements/${index}/id` });
    seenRequirements.add(id);
  });
  if (!seenScopes.has(context.population.defaultScopeId)) diagnostics.push({ path: '/population/defaultScopeId' });
  context.claimRequirements.forEach((requirement, requirementIndex) => {
    requirement.populationScopeIds.forEach((id, scopeIndex) => {
      if (!seenScopes.has(id)) diagnostics.push({ path: `/claimRequirements/${requirementIndex}/populationScopeIds/${scopeIndex}` });
    });
  });
  const facts: Array<[string, AuthoringFact<unknown>]> = [
    ...Object.entries(context.decisionContext),
    ['population.target', context.population.target],
    ['population.excluded', context.population.excluded],
  ];
  for (const [path, fact] of facts) {
    if (
      fact.disposition === 'REQUIRED_ABSENT' &&
      fact.dependency.scope === 'CLAIM_REQUIREMENT' &&
      !seenRequirements.has(fact.dependency.claimRequirementId)
    ) {
      diagnostics.push({ path: `/${path.replaceAll('.', '/')}/dependency/claimRequirementId` });
    }
  }
  return diagnostics;
}

export function isAuthoringContext(value: unknown): value is AuthoringContext {
  if (!validateAuthoringContext(value)) return false;
  return validateAuthoringContextSemantics(value as unknown as AuthoringContext).length === 0;
}

export function deriveSystemAuthoringContextRequirements(
  context: AuthoringContext,
  claims: ClaimRequirementReference[] = [],
): SystemAuthoringContextRequirement[] {
  const facts: Array<[string, string, AuthoringFact<unknown>]> = [
    ['decisionContext.decision', 'decision', context.decisionContext.decision],
    [
      'decisionContext.minimumWorthwhileImprovement',
      'minimum-worthwhile-improvement',
      context.decisionContext.minimumWorthwhileImprovement,
    ],
    ['decisionContext.maximumAcceptableRegression', 'maximum-acceptable-regression', context.decisionContext.maximumAcceptableRegression],
    ['decisionContext.severeHarmLimits', 'severe-harm-limits', context.decisionContext.severeHarmLimits],
    ['decisionContext.efficiencyBudgets', 'efficiency-budgets', context.decisionContext.efficiencyBudgets],
    ['decisionContext.requiredUncertainty', 'required-uncertainty', context.decisionContext.requiredUncertainty],
    ['population.target', 'population-target', context.population.target],
    ['population.excluded', 'population-excluded', context.population.excluded],
  ];
  return facts.flatMap(([field, slug, fact]) => {
    if (fact.disposition !== 'REQUIRED_ABSENT') return [];
    const affectedClaimRequirementId = fact.dependency.scope === 'CLAIM_REQUIREMENT' ? fact.dependency.claimRequirementId : undefined;
    return [
      {
        affectedClaimIds:
          affectedClaimRequirementId === undefined
            ? []
            : claims.filter((claim) => claim.claimRequirementId === affectedClaimRequirementId).map((claim) => claim.id),
        ...(affectedClaimRequirementId === undefined ? {} : { affectedClaimRequirementId }),
        blocking: true as const,
        dependency: fact.dependency,
        evidenceNeeded: fact.evidenceNeeded,
        field,
        id: `system:authoring-context:${slug}`,
        origin: 'SYSTEM_AUTHORING_CONTEXT' as const,
        reason: fact.reason,
        source: fact.source,
        status: fact.status,
      },
    ];
  });
}
