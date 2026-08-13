import { Ajv2020 } from 'ajv/dist/2020.js';

import authoringContextSchema from '../../schemas/authoring-context.schema.json' with { type: 'json' };

export type MissingFactStatus = 'UNKNOWN' | 'UNSUPPORTED' | 'INSUFFICIENT_INFORMATION' | 'UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT';

export type AuthoringFact<T> =
  | { disposition: 'SUPPLIED'; source: string; value: T }
  | { disposition: 'REQUIRED_ABSENT'; evidenceNeeded: string; reason: string; source: string; status: MissingFactStatus }
  | { disposition: 'NOT_REQUIRED'; rationale: string; source: string };

export interface AuthoringContext {
  decisionContext: {
    decision: AuthoringFact<string>;
    efficiencyBudgets: AuthoringFact<string[]>;
    maximumAcceptableRegression: AuthoringFact<string>;
    minimumWorthwhileImprovement: AuthoringFact<string>;
    requiredUncertainty: AuthoringFact<string>;
    severeHarmLimits: AuthoringFact<string[]>;
  };
  population: { excluded: AuthoringFact<string[]>; target: AuthoringFact<string> };
  schemaVersion: 1;
}

export interface SystemAuthoringContextRequirement {
  affectedClaimIds: string[];
  blocking: true;
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

export function isAuthoringContext(value: unknown): value is AuthoringContext {
  return validateAuthoringContext(value);
}

export function deriveSystemAuthoringContextRequirements(context: AuthoringContext): SystemAuthoringContextRequirement[] {
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
  return facts.flatMap(([field, slug, fact]) =>
    fact.disposition === 'REQUIRED_ABSENT'
      ? [
          {
            affectedClaimIds: [],
            blocking: true as const,
            evidenceNeeded: fact.evidenceNeeded,
            field,
            id: `system:authoring-context:${slug}`,
            origin: 'SYSTEM_AUTHORING_CONTEXT' as const,
            reason: fact.reason,
            source: fact.source,
            status: fact.status,
          },
        ]
      : [],
  );
}
