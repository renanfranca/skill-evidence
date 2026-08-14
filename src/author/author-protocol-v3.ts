import blueprintSchema3 from '../../schemas/evaluation-blueprint.schema-3.json' with { type: 'json' };
import authoringContextSchema from '../../schemas/authoring-context.schema.json' with { type: 'json' };

import { sha256 } from '../canonical-json.js';
import type { AuthoringContext } from './authoring-context.js';
import { authorInstructionsV3, theoryCommit, theoryPrinciples } from './instructions.js';

export const authorProtocolV3Descriptor = {
  authorProtocolVersion: 3,
  controlledFields: [
    'schemaVersion',
    'blueprintId',
    'snapshotFingerprint',
    'lifecycle',
    'authorProvenance',
    'decisionContext',
    'population',
    'claimRequirements',
  ],
  expectedStateProvided: false,
  mechanicalOracleProvided: false,
  pureJsonResponseRequired: true,
  skillContentIsUntrustedData: true,
} as const;

export const authorProtocolV3CompositionPolicy = {
  evidenceEndpointCardinality: 'AT_LEAST_ONE_CLAIM_AND_CONTRACT',
  evidencePairConsistency: 'EVERY_REQUIREMENT_CLAIM_IS_DECLARED_BY_EVERY_REQUIREMENT_CONTRACT',
  claimRequirementCardinality: 'ONE_TO_ONE',
  lifecyclePrecedence: ['ERROR', 'DRAFT', 'BLOCKED', 'READY'],
  missingEvidenceSemantics: 'INCONCLUSIVE_WHEN_ELIGIBLE_PATH_EVIDENCE_IS_MISSING',
  pathAssessmentInputCardinality: 'WHEN_PRESENT_AT_LEAST_ONE_OBSERVATION',
  pathDirectOnly: 'ALLOWED_WHEN_OBSERVATION_EXHAUSTS_PROPERTY',
  pathAssessmentOperator: 'ALL',
  pathObservationOperator: 'ALL',
  pathOperator: 'ANY',
  policyMissingEvidenceAuthority: 'EVIDENCE_REQUIREMENT_ONLY',
  semanticIdentity: 'CONTENT_INSTRUMENT_CONTEXT_CONDITION_SNAPSHOT_PACKET',
  systemControlledClaimFields: ['mandatory', 'decisionCritical', 'populationScopeIds', 'status'],
  version: 4,
} as const;

export interface AuthorProtocolV3Condition {
  model: 'gpt-5.6-luna' | 'gpt-5.6-terra';
  reasoningEffort: 'max' | 'xhigh';
}

export interface AuthorProtocolV3ProvenanceDerivation {
  authorInstrumentFingerprint: string;
  authoringContextFingerprint: string;
  authoringContextSchemaDigest: string;
  candidateSchemaDigest: string;
  compositionPolicyDigest: string;
  conditionFingerprint: string;
  instructionDigest: string;
  protocolDigest: string;
  schemaDigest: string;
  theoryDigest: string;
}

export function deriveAuthorProtocolV3Provenance(
  condition: AuthorProtocolV3Condition,
  authoringContext: AuthoringContext,
  candidateSchema: unknown,
): AuthorProtocolV3ProvenanceDerivation {
  const authoringContextSchemaDigest = sha256(authoringContextSchema);
  const candidateSchemaDigest = sha256(candidateSchema);
  const compositionPolicyDigest = sha256(authorProtocolV3CompositionPolicy);
  const instructionDigest = sha256(authorInstructionsV3);
  const protocolDigest = sha256(authorProtocolV3Descriptor);
  const schemaDigest = sha256(blueprintSchema3);
  const theoryDigest = sha256({ commit: theoryCommit, principles: theoryPrinciples });
  const conditionFingerprint = sha256({
    authoringContextSchemaDigest,
    candidateSchemaDigest,
    instructionDigest,
    model: condition.model,
    protocolDigest,
    reasoningEffort: condition.reasoningEffort,
    theoryDigest,
  });
  return {
    authorInstrumentFingerprint: sha256({ compositionPolicyDigest, conditionFingerprint, schemaDigest }),
    authoringContextFingerprint: sha256(authoringContext),
    authoringContextSchemaDigest,
    candidateSchemaDigest,
    compositionPolicyDigest,
    conditionFingerprint,
    instructionDigest,
    protocolDigest,
    schemaDigest,
    theoryDigest,
  };
}
