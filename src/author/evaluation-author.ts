import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };
import blueprintSchema2 from '../../schemas/evaluation-blueprint.schema-2.json' with { type: 'json' };
import blueprintSchema3 from '../../schemas/evaluation-blueprint.schema-3.json' with { type: 'json' };

import {
  deriveBlueprintLifecycle,
  evaluationBlueprintCandidateSchema,
  evaluationBlueprintCandidateSchemaV3,
  validateEvaluationBlueprint,
  validateEvaluationBlueprintV3,
  type BlueprintCandidate,
  type BlueprintCandidateV3,
  type EvaluationBlueprint,
} from '../blueprint/evaluation-blueprint.js';
import { canonicalJson, sha256 } from '../canonical-json.js';
import type { SkillSnapshot } from '../intake/skill-snapshot.js';
import {
  deriveSystemAuthoringContextRequirements,
  isAuthoringContext,
  type AuthoringContext,
  type MissingFactStatus,
} from './authoring-context.js';
import {
  authorInstructions,
  authorInstructionsV2,
  authorInstructionsV3,
  authorProtocolVersion,
  theoryCommit,
  theoryPrinciples,
} from './instructions.js';
import {
  AuthorProviderError,
  unknownProviderDiagnostic,
  type AuthorProviderDiagnostic,
  type AuthorProviderObservation,
} from './provider-diagnostic.js';

export type { AuthoringContext } from './authoring-context.js';

export type AuthorConditionSpec = { model: 'gpt-5.6-luna'; reasoningEffort: 'max' } | { model: 'gpt-5.6-terra'; reasoningEffort: 'xhigh' };
export type AuthorProtocolVersion = 1 | 2 | 3;

const defaultAuthorCondition = { model: 'gpt-5.6-terra', reasoningEffort: 'xhigh' } as const;

function assertSupportedCondition(condition: AuthorConditionSpec): void {
  const supported =
    (condition.model === 'gpt-5.6-terra' && condition.reasoningEffort === 'xhigh') ||
    (condition.model === 'gpt-5.6-luna' && condition.reasoningEffort === 'max');
  if (!supported) {
    throw new Error('UNSUPPORTED_AUTHOR_CONDITION');
  }
}

function assertSupportedProtocol(protocolVersion: number): asserts protocolVersion is AuthorProtocolVersion {
  if (protocolVersion !== 1 && protocolVersion !== 2 && protocolVersion !== 3) {
    throw new Error('UNSUPPORTED_AUTHOR_PROTOCOL');
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
  providerObservation?: AuthorProviderObservation;
  providerLatencyMs?: number | null;
  tokenUsage?: AuthorTokenUsage | null;
}

export interface AuthorTokenUsage {
  cachedInputTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  totalTokens: number | null;
}

export type AuthorInvoker = (request: AuthorInvocationRequest) => Promise<AuthorInvocationResponse>;

export interface AuthorInput {
  authoringContext?: AuthoringContext;
  campaignId: string;
  condition?: AuthorConditionSpec;
  invoke: AuthorInvoker;
  protocolVersion?: AuthorProtocolVersion;
  snapshot: SkillSnapshot;
}

export type AuthorErrorCode = 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON' | 'PROVIDER_ERROR';

interface AuthorRunEvidence {
  invocationAttempts: 1;
  packetFingerprint: string;
  providerObservation?: AuthorProviderObservation;
  providerLatencyMs: number | null;
  tokenUsage: AuthorTokenUsage | null;
}

type AuthorRunError =
  { code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON' } | { code: 'PROVIDER_ERROR'; diagnostic: AuthorProviderDiagnostic };

export type AuthorRunResult =
  | (AuthorRunEvidence & { blueprint: EvaluationBlueprint; error?: never; status: 'COMPLETED' })
  | (AuthorRunEvidence & { blueprint?: never; error: AuthorRunError; status: 'ERROR' });

export interface PreparedAuthorInvocation {
  authoringContextFingerprint?: string;
  condition: AuthorConditionSpec;
  conditionFingerprint: string;
  digests: AuthorConditionDigests;
  packetFingerprint: string;
  protocolVersion: AuthorProtocolVersion;
  request: AuthorInvocationRequest;
  schemaVersion: 1 | 2 | 3;
}

function instructionsFor(protocolVersion: AuthorProtocolVersion): readonly string[] {
  return protocolVersion === 1 ? authorInstructions : protocolVersion === 2 ? authorInstructionsV2 : authorInstructionsV3;
}

function authorPacket(
  snapshot: SkillSnapshot,
  protocolVersion: AuthorProtocolVersion,
  authoringContext?: AuthoringContext,
): Record<string, unknown> {
  return {
    candidateSchema: protocolVersion === 3 ? evaluationBlueprintCandidateSchemaV3 : evaluationBlueprintCandidateSchema,
    ...(protocolVersion === 3 ? { authoringContext } : {}),
    instructions: instructionsFor(protocolVersion),
    protocol: {
      authorProtocolVersion: protocolVersion,
      controlledFields:
        protocolVersion === 3
          ? ['schemaVersion', 'blueprintId', 'snapshotFingerprint', 'lifecycle', 'authorProvenance', 'decisionContext', 'population']
          : ['schemaVersion', 'blueprintId', 'snapshotFingerprint', 'lifecycle', 'authorProvenance'],
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

function conditionDigests(condition: AuthorConditionSpec, schema: unknown, protocolVersion: AuthorProtocolVersion): AuthorConditionDigests {
  const instructionDigest = sha256(instructionsFor(protocolVersion));
  const protocolDigest = sha256({ authorProtocolVersion: protocolVersion, response: 'PURE_JSON', systemControlledFields: true });
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

export function prepareAuthorInvocation(
  snapshot: SkillSnapshot,
  condition?: AuthorConditionSpec,
  protocolVersion: AuthorProtocolVersion = authorProtocolVersion,
  authoringContext?: AuthoringContext,
): PreparedAuthorInvocation {
  assertSupportedProtocol(protocolVersion);
  if (protocolVersion === 3 && authoringContext === undefined) throw new Error('AUTHORING_CONTEXT_REQUIRED');
  if (protocolVersion !== 3 && authoringContext !== undefined) throw new Error('AUTHORING_CONTEXT_UNSUPPORTED');
  if (authoringContext !== undefined && !isAuthoringContext(authoringContext)) throw new Error('AUTHORING_CONTEXT_INVALID');
  const selectedCondition: AuthorConditionSpec = { ...(condition ?? defaultAuthorCondition) };
  assertSupportedCondition(selectedCondition);
  const schema = protocolVersion === 3 ? blueprintSchema3 : condition === undefined ? blueprintSchema : blueprintSchema2;
  const packet = authorPacket(snapshot, protocolVersion, authoringContext);
  const digests = conditionDigests(selectedCondition, schema, protocolVersion);
  return {
    ...(authoringContext === undefined ? {} : { authoringContextFingerprint: sha256(authoringContext) }),
    condition: selectedCondition,
    conditionFingerprint: digests.conditionFingerprint,
    digests,
    packetFingerprint: sha256(packet),
    protocolVersion,
    request: {
      maxRetries: 0,
      model: selectedCondition.model,
      prompt: canonicalJson(packet),
      reasoningEffort: selectedCondition.reasoningEffort,
    },
    schemaVersion: protocolVersion === 3 ? 3 : condition === undefined ? 1 : 2,
  };
}

function responseEvidence(
  response: AuthorInvocationResponse | undefined,
  providerObservation = response?.providerObservation,
): Pick<AuthorRunEvidence, 'providerLatencyMs' | 'tokenUsage'> & {
  providerObservation?: AuthorProviderObservation;
} {
  return {
    ...(providerObservation === undefined ? {} : { providerObservation }),
    providerLatencyMs: response?.providerLatencyMs ?? null,
    tokenUsage: response?.tokenUsage ?? null,
  };
}

function errorResult(
  code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON',
  packetFingerprint: string,
  response: AuthorInvocationResponse,
): AuthorRunResult {
  return { error: { code }, invocationAttempts: 1, packetFingerprint, ...responseEvidence(response), status: 'ERROR' };
}

function providerErrorResult(
  diagnostic: AuthorProviderDiagnostic,
  packetFingerprint: string,
  providerObservation?: AuthorProviderObservation,
): AuthorRunResult {
  return {
    error: { code: 'PROVIDER_ERROR', diagnostic },
    invocationAttempts: 1,
    packetFingerprint,
    ...responseEvidence(undefined, providerObservation),
    status: 'ERROR',
  };
}

type ComposedRequirementV3 = {
  affectedClaimIds: string[];
  blocking: boolean;
  evidenceNeeded: string;
  field: string;
  id: string;
  origin: 'AUTHOR' | 'SYSTEM_AUTHORING_CONTEXT';
  reason: string;
  source: string;
  status: MissingFactStatus;
};

function composeProtocolV3Candidate(candidate: BlueprintCandidateV3, authoringContext: AuthoringContext): Record<string, unknown> {
  return {
    ...candidate,
    decisionContext: authoringContext.decisionContext,
    population: authoringContext.population,
    unresolvedRequirements: [
      ...(candidate.unresolvedRequirements ?? []).map((requirement) => ({ ...requirement, origin: 'AUTHOR' as const })),
      ...deriveSystemAuthoringContextRequirements(authoringContext),
    ],
  };
}

export async function authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult> {
  const prepared = prepareAuthorInvocation(input.snapshot, input.condition, input.protocolVersion, input.authoringContext);
  const packetFingerprint = prepared.packetFingerprint;
  let response: AuthorInvocationResponse;
  try {
    response = await input.invoke(prepared.request);
  } catch (error) {
    return providerErrorResult(
      error instanceof AuthorProviderError ? error.diagnostic : unknownProviderDiagnostic(),
      packetFingerprint,
      error instanceof AuthorProviderError ? error.providerObservation : undefined,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output) as unknown;
  } catch {
    return errorResult('INVALID_JSON', packetFingerprint, response);
  }
  const validation = prepared.protocolVersion === 3 ? validateEvaluationBlueprintV3(parsed) : validateEvaluationBlueprint(parsed);
  if (!validation.structurallyValid) {
    return errorResult('CANDIDATE_STRUCTURALLY_INVALID', packetFingerprint, response);
  }
  const candidate = parsed as BlueprintCandidate;
  const selectedCondition = prepared.condition;
  const digests = prepared.digests;
  const composedCandidate =
    prepared.protocolVersion === 3
      ? composeProtocolV3Candidate(parsed as BlueprintCandidateV3, input.authoringContext!)
      : (candidate as Record<string, unknown>);
  const lifecycle =
    prepared.protocolVersion === 3
      ? !validation.complete || validation.diagnostics.length > 0
        ? 'DRAFT'
        : (composedCandidate.unresolvedRequirements as ComposedRequirementV3[]).some((requirement) => requirement.blocking)
          ? 'BLOCKED'
          : 'READY'
      : deriveBlueprintLifecycle(candidate, validation);
  const semanticIdentity = {
    candidate: composedCandidate,
    conditionFingerprint: digests.conditionFingerprint,
    ...(prepared.authoringContextFingerprint === undefined ? {} : { authoringContextFingerprint: prepared.authoringContextFingerprint }),
    snapshotFingerprint: input.snapshot.fingerprint,
  };
  const blueprint: EvaluationBlueprint = {
    ...(composedCandidate as Required<BlueprintCandidate>),
    authorProvenance: {
      ...(prepared.authoringContextFingerprint === undefined ? {} : { authoringContextFingerprint: prepared.authoringContextFingerprint }),
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
  return { blueprint, invocationAttempts: 1, packetFingerprint, ...responseEvidence(response), status: 'COMPLETED' };
}
