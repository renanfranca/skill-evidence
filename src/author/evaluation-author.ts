import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };
import blueprintSchema2 from '../../schemas/evaluation-blueprint.schema-2.json' with { type: 'json' };

import {
  deriveBlueprintLifecycle,
  evaluationBlueprintCandidateSchema,
  validateEvaluationBlueprint,
  type BlueprintCandidate,
  type EvaluationBlueprint,
} from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import type { SkillSnapshot } from '../intake/skill-snapshot.js';
import { authorInstructions, authorProtocolVersion, theoryCommit, theoryPrinciples } from './instructions.js';
import { AuthorProviderError, unknownProviderDiagnostic, type AuthorProviderDiagnostic } from './provider-diagnostic.js';

export type AuthorConditionSpec = { model: 'gpt-5.6-luna'; reasoningEffort: 'max' } | { model: 'gpt-5.6-terra'; reasoningEffort: 'xhigh' };

const defaultAuthorCondition = { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' } as const;

function assertSupportedCondition(condition: AuthorConditionSpec): void {
  const supported =
    (condition.model === 'gpt-5.6-terra' && condition.reasoningEffort === 'xhigh') ||
    (condition.model === 'gpt-5.6-luna' && condition.reasoningEffort === 'max');
  if (!supported) {
    throw new Error('UNSUPPORTED_AUTHOR_CONDITION');
  }
}

export interface AuthorInvocationRequest {
  maxRetries: 0;
  model: AuthorConditionSpec['model'];
  prompt: string;
  reasoningEffort: AuthorConditionSpec['reasoningEffort'];
}

export interface AuthorInvocationResponse {
  observedModel: string | null;
  output: string;
}

export type AuthorInvoker = (request: AuthorInvocationRequest) => Promise<AuthorInvocationResponse>;

export interface AuthorInput {
  campaignId: string;
  condition?: AuthorConditionSpec;
  invoke: AuthorInvoker;
  snapshot: SkillSnapshot;
}

export type AuthorErrorCode = 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON' | 'PROVIDER_ERROR';

interface AuthorRunEvidence {
  invocationAttempts: 1;
  packetFingerprint: string;
}

type AuthorRunError =
  { code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON' } | { code: 'PROVIDER_ERROR'; diagnostic: AuthorProviderDiagnostic };

export type AuthorRunResult =
  | (AuthorRunEvidence & { blueprint: EvaluationBlueprint; error?: never; status: 'COMPLETED' })
  | (AuthorRunEvidence & { blueprint?: never; error: AuthorRunError; status: 'ERROR' });

export interface PreparedAuthorInvocation {
  condition: AuthorConditionSpec;
  conditionFingerprint: string;
  digests: AuthorConditionDigests;
  packetFingerprint: string;
  request: AuthorInvocationRequest;
  schemaVersion: 1 | 2;
}

function authorPacket(snapshot: SkillSnapshot): Record<string, unknown> {
  return {
    candidateSchema: evaluationBlueprintCandidateSchema,
    instructions: authorInstructions,
    protocol: {
      authorProtocolVersion,
      controlledFields: ['schemaVersion', 'blueprintId', 'snapshotFingerprint', 'lifecycle', 'authorProvenance'],
      expectedStateProvided: false,
      mechanicalOracleProvided: false,
      pureJsonResponseRequired: true,
      skillContentIsUntrustedData: true,
    },
    skillSnapshot: snapshot,
    theory: { commit: theoryCommit, principles: theoryPrinciples },
  };
}

interface AuthorConditionDigests {
  conditionFingerprint: string;
  instructionDigest: string;
  protocolDigest: string;
  schemaDigest: string;
  theoryDigest: string;
}

function conditionDigests(condition: AuthorConditionSpec, schema: unknown): AuthorConditionDigests {
  const instructionDigest = sha256(authorInstructions);
  const protocolDigest = sha256({ authorProtocolVersion, response: 'PURE_JSON', systemControlledFields: true });
  const schemaDigest = sha256(schema);
  const theoryDigest = sha256({ commit: theoryCommit, principles: theoryPrinciples });
  return {
    conditionFingerprint: sha256({
      instructionDigest,
      model: condition.model,
      protocolDigest,
      reasoningEffort: condition.reasoningEffort,
      schemaDigest,
      theoryDigest,
    }),
    instructionDigest,
    protocolDigest,
    schemaDigest,
    theoryDigest,
  };
}

export function prepareAuthorInvocation(snapshot: SkillSnapshot, condition?: AuthorConditionSpec): PreparedAuthorInvocation {
  const selectedCondition: AuthorConditionSpec = { ...(condition ?? defaultAuthorCondition) };
  assertSupportedCondition(selectedCondition);
  const schema = condition === undefined ? blueprintSchema : blueprintSchema2;
  const packet = authorPacket(snapshot);
  const digests = conditionDigests(selectedCondition, schema);
  return {
    condition: selectedCondition,
    conditionFingerprint: digests.conditionFingerprint,
    digests,
    packetFingerprint: sha256(packet),
    request: {
      maxRetries: 0,
      model: selectedCondition.model,
      prompt: canonicalJson(packet),
      reasoningEffort: selectedCondition.reasoningEffort,
    },
    schemaVersion: condition === undefined ? 1 : 2,
  };
}

function errorResult(code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON', packetFingerprint: string): AuthorRunResult {
  return { error: { code }, invocationAttempts: 1, packetFingerprint, status: 'ERROR' };
}

function providerErrorResult(diagnostic: AuthorProviderDiagnostic, packetFingerprint: string): AuthorRunResult {
  return { error: { code: 'PROVIDER_ERROR', diagnostic }, invocationAttempts: 1, packetFingerprint, status: 'ERROR' };
}

export async function authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult> {
  const prepared = prepareAuthorInvocation(input.snapshot, input.condition);
  const packetFingerprint = prepared.packetFingerprint;
  let response: AuthorInvocationResponse;
  try {
    response = await input.invoke(prepared.request);
  } catch (error) {
    return providerErrorResult(error instanceof AuthorProviderError ? error.diagnostic : unknownProviderDiagnostic(), packetFingerprint);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output) as unknown;
  } catch {
    return errorResult('INVALID_JSON', packetFingerprint);
  }
  const validation = validateEvaluationBlueprint(parsed);
  if (!validation.structurallyValid) {
    return errorResult('CANDIDATE_STRUCTURALLY_INVALID', packetFingerprint);
  }
  const candidate = parsed as BlueprintCandidate;
  const selectedCondition = prepared.condition;
  const digests = prepared.digests;
  const lifecycle = deriveBlueprintLifecycle(candidate, validation);
  const semanticIdentity = {
    candidate,
    conditionFingerprint: digests.conditionFingerprint,
    snapshotFingerprint: input.snapshot.fingerprint,
  };
  const blueprint: EvaluationBlueprint = {
    ...(candidate as Required<BlueprintCandidate>),
    authorProvenance: {
      campaignId: input.campaignId,
      conditionFingerprint: digests.conditionFingerprint,
      instructionDigest: digests.instructionDigest,
      observedModel: response.observedModel,
      protocolDigest: digests.protocolDigest,
      reasoningEffort: selectedCondition.reasoningEffort,
      requestedModel: selectedCondition.model,
      schemaDigest: digests.schemaDigest,
      status: 'NOT_QUALIFIED',
      theoryDigest: digests.theoryDigest,
    },
    blueprintId: `ebp-${sha256(semanticIdentity)}`,
    lifecycle: { decisionEligible: false, scope: 'DEVELOPMENT_AUTHORING', state: lifecycle },
    schemaVersion: prepared.schemaVersion,
    snapshotFingerprint: input.snapshot.fingerprint,
  };
  return { blueprint, invocationAttempts: 1, packetFingerprint, status: 'COMPLETED' };
}
