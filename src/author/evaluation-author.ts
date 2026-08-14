import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };
import blueprintSchema2 from '../../schemas/evaluation-blueprint.schema-2.json' with { type: 'json' };
import blueprintSchema3 from '../../schemas/evaluation-blueprint.schema-3.json' with { type: 'json' };

import {
  deriveBlueprintLifecycle,
  deriveBlueprintLifecycleV3,
  deriveEvaluationBlueprintIdV3,
  evaluationBlueprintCandidateSchema,
  evaluationBlueprintCandidateSchemaV3,
  validateEvaluationBlueprint,
  validateEvaluationBlueprintV3,
  validateComposedEvaluationBlueprint,
  type BlueprintCandidate,
  type BlueprintCandidateV3,
  type EvaluationBlueprint,
  type EvaluationBlueprintV3,
} from '../blueprint/evaluation-blueprint.js';
import { canonicalFrozenCopy } from '../canonical-frozen.js';
import { canonicalJson, sha256, sha256Bytes } from '../canonical-json.js';
import type { SkillSnapshot } from '../intake/skill-snapshot.js';
import {
  deriveSystemAuthoringContextRequirements,
  isAuthoringContext,
  type AuthoringContext,
  type MissingFactStatus,
} from './authoring-context.js';
import { authorProtocolV3Descriptor, deriveAuthorProtocolV3Provenance } from './author-protocol-v3.js';
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

export type AuthorErrorCode = 'CANDIDATE_STRUCTURALLY_INVALID' | 'COMPOSED_BLUEPRINT_INVALID' | 'INVALID_JSON' | 'PROVIDER_ERROR';

interface AuthorRunEvidence {
  invocationAttempts: 1;
  packetFingerprint: string;
  providerObservation?: AuthorProviderObservation;
  providerLatencyMs: number | null;
  tokenUsage: AuthorTokenUsage | null;
}

type AuthorRunError =
  | { code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'COMPOSED_BLUEPRINT_INVALID' | 'INVALID_JSON' }
  | { code: 'PROVIDER_ERROR'; diagnostic: AuthorProviderDiagnostic };

type AuthorRunResultFor<TBlueprint extends EvaluationBlueprint> =
  | (AuthorRunEvidence & { blueprint: TBlueprint; error?: never; status: 'COMPLETED' })
  | (AuthorRunEvidence & { blueprint?: never; error: AuthorRunError; status: 'ERROR' });

export type AuthorRunResult = AuthorRunResultFor<EvaluationBlueprint>;
export type AuthorRunResultV3 = AuthorRunResultFor<EvaluationBlueprintV3>;

export interface PreparedAuthorInvocation {
  authorInstrumentFingerprint?: string;
  authoringContextFingerprint?: string;
  condition: AuthorConditionSpec;
  conditionFingerprint: string;
  digests: AuthorConditionDigests;
  packetFingerprint: string;
  preparedAuthoringContext?: AuthoringContext;
  preparedSnapshotFingerprint: string;
  protocolVersion: AuthorProtocolVersion;
  request: AuthorInvocationRequest;
  schemaVersion: 1 | 2 | 3;
}

function instructionsFor(protocolVersion: AuthorProtocolVersion): readonly string[] {
  return protocolVersion === 1 ? authorInstructions : protocolVersion === 2 ? authorInstructionsV2 : authorInstructionsV3;
}

function protocolDescriptor(protocolVersion: AuthorProtocolVersion): Record<string, unknown> {
  if (protocolVersion === 3) return authorProtocolV3Descriptor;
  return {
    authorProtocolVersion: protocolVersion,
    controlledFields: ['schemaVersion', 'blueprintId', 'snapshotFingerprint', 'lifecycle', 'authorProvenance'],
    expectedStateProvided: false,
    mechanicalOracleProvided: false,
    pureJsonResponseRequired: true,
    skillContentIsUntrustedData: true,
  };
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
    protocol: protocolDescriptor(protocolVersion),
    skillSnapshot: snapshot,
    theory: { commit: theoryCommit, principles: theoryPrinciples },
  };
}

interface AuthorConditionDigests {
  authoringContextSchemaDigest?: string;
  candidateSchemaDigest?: string;
  compositionPolicyDigest?: string;
  conditionFingerprint: string;
  instructionDigest: string;
  protocolDigest: string;
  schemaDigest: string;
  theoryDigest: string;
}

function historicalConditionDigests(
  condition: AuthorConditionSpec,
  schema: unknown,
  protocolVersion: Exclude<AuthorProtocolVersion, 3>,
): AuthorConditionDigests {
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
  const selectedCondition: AuthorConditionSpec = canonicalFrozenCopy(condition ?? defaultAuthorCondition);
  assertSupportedCondition(selectedCondition);
  const schema = protocolVersion === 3 ? blueprintSchema3 : condition === undefined ? blueprintSchema : blueprintSchema2;
  const preparedSnapshot = canonicalFrozenCopy(snapshot);
  const preparedAuthoringContext = authoringContext === undefined ? undefined : canonicalFrozenCopy(authoringContext);
  const packet = authorPacket(preparedSnapshot, protocolVersion, preparedAuthoringContext);
  let protocolV3Provenance: ReturnType<typeof deriveAuthorProtocolV3Provenance> | undefined;
  let digests: AuthorConditionDigests;
  if (protocolVersion === 3) {
    protocolV3Provenance = deriveAuthorProtocolV3Provenance(
      selectedCondition,
      preparedAuthoringContext!,
      evaluationBlueprintCandidateSchemaV3,
    );
    digests = protocolV3Provenance;
  } else {
    digests = historicalConditionDigests(selectedCondition, schema, protocolVersion);
  }
  const prompt = canonicalJson(packet);
  const authorInstrumentFingerprint = protocolV3Provenance?.authorInstrumentFingerprint;
  return {
    ...(authorInstrumentFingerprint === undefined ? {} : { authorInstrumentFingerprint }),
    ...(preparedAuthoringContext === undefined
      ? {}
      : { authoringContextFingerprint: protocolV3Provenance!.authoringContextFingerprint, preparedAuthoringContext }),
    condition: selectedCondition,
    conditionFingerprint: digests.conditionFingerprint,
    digests,
    packetFingerprint: protocolVersion === 3 ? sha256Bytes(new TextEncoder().encode(prompt)) : sha256(packet),
    preparedSnapshotFingerprint: preparedSnapshot.fingerprint,
    protocolVersion,
    request: {
      maxRetries: 0,
      model: selectedCondition.model,
      prompt,
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
  code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'COMPOSED_BLUEPRINT_INVALID' | 'INVALID_JSON',
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
  const requirements = new Map(authoringContext.claimRequirements.map((requirement) => [requirement.id, requirement]));
  const claims = (candidate.claims ?? []).map((claim) => {
    const requirement = claim.claimRequirementId === undefined ? undefined : requirements.get(claim.claimRequirementId);
    return {
      ...claim,
      decisionCritical: requirement?.decisionCritical ?? false,
      mandatory: requirement?.mandatory ?? false,
      populationScopeIds: [...(requirement?.populationScopeIds ?? [authoringContext.population.defaultScopeId])].sort(),
      status: 'NOT_EVALUATED' as const,
    };
  });
  return {
    ...candidate,
    claimRequirements: authoringContext.claimRequirements,
    claims,
    decisionContext: authoringContext.decisionContext,
    evidencePlan: (candidate.evidencePlan ?? []).map((requirement) => ({
      ...requirement,
      missingEvidenceSemantics: 'INCONCLUSIVE_WHEN_ELIGIBLE_PATH_EVIDENCE_IS_MISSING' as const,
    })),
    population: authoringContext.population,
    unresolvedRequirements: [
      ...(candidate.unresolvedRequirements ?? []).map((requirement) => ({ ...requirement, origin: 'AUTHOR' as const })),
      ...deriveSystemAuthoringContextRequirements(authoringContext, claims),
    ],
  };
}

export function authorEvaluationBlueprint(
  input: AuthorInput & { authoringContext: AuthoringContext; protocolVersion: 3 },
): Promise<AuthorRunResultV3>;
export function authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult>;
export async function authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult> {
  const prepared = prepareAuthorInvocation(input.snapshot, input.condition, input.protocolVersion, input.authoringContext);
  const preparedCampaignId = canonicalFrozenCopy(input.campaignId);
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
  const validation =
    prepared.protocolVersion === 3
      ? validateEvaluationBlueprintV3(parsed, prepared.preparedAuthoringContext)
      : validateEvaluationBlueprint(parsed);
  if (!validation.structurallyValid) {
    return errorResult('CANDIDATE_STRUCTURALLY_INVALID', packetFingerprint, response);
  }
  const candidate = parsed as BlueprintCandidate;
  const selectedCondition = prepared.condition;
  const digests = prepared.digests;
  const composedCandidate =
    prepared.protocolVersion === 3
      ? composeProtocolV3Candidate(parsed as BlueprintCandidateV3, prepared.preparedAuthoringContext!)
      : (candidate as Record<string, unknown>);
  const lifecycle =
    prepared.protocolVersion === 3
      ? deriveBlueprintLifecycleV3(validation.diagnostics, composedCandidate.unresolvedRequirements as ComposedRequirementV3[])
      : deriveBlueprintLifecycle(candidate, validation);
  const blueprintId =
    prepared.protocolVersion === 3
      ? deriveEvaluationBlueprintIdV3(composedCandidate, {
          authorInstrumentFingerprint: prepared.authorInstrumentFingerprint!,
          authoringContextFingerprint: prepared.authoringContextFingerprint!,
          conditionFingerprint: digests.conditionFingerprint,
          packetFingerprint: prepared.packetFingerprint,
          snapshotFingerprint: prepared.preparedSnapshotFingerprint,
        })
      : `ebp-${sha256({
          candidate: composedCandidate,
          conditionFingerprint: digests.conditionFingerprint,
          snapshotFingerprint: prepared.preparedSnapshotFingerprint,
        })}`;
  const blueprintValue: Record<string, unknown> = {
    ...composedCandidate,
    authorProvenance: {
      ...(prepared.authorInstrumentFingerprint === undefined ? {} : { authorInstrumentFingerprint: prepared.authorInstrumentFingerprint }),
      ...(prepared.authoringContextFingerprint === undefined ? {} : { authoringContextFingerprint: prepared.authoringContextFingerprint }),
      ...(digests.authoringContextSchemaDigest === undefined ? {} : { authoringContextSchemaDigest: digests.authoringContextSchemaDigest }),
      campaignId: preparedCampaignId,
      ...(digests.candidateSchemaDigest === undefined ? {} : { candidateSchemaDigest: digests.candidateSchemaDigest }),
      ...(digests.compositionPolicyDigest === undefined ? {} : { compositionPolicyDigest: digests.compositionPolicyDigest }),
      conditionFingerprint: digests.conditionFingerprint,
      instructionDigest: digests.instructionDigest,
      observedModel: response.observedModel,
      ...(prepared.protocolVersion === 3
        ? { packetEvidenceKind: 'AUTHOR_INVOKER_REQUEST_PROMPT' as const, packetFingerprint: prepared.packetFingerprint }
        : {}),
      protocolDigest: digests.protocolDigest,
      reasoningEffort: selectedCondition.reasoningEffort,
      requestedModel: selectedCondition.model,
      schemaDigest: digests.schemaDigest,
      status: 'NOT_QUALIFIED',
      theoryDigest: digests.theoryDigest,
    },
    blueprintId,
    lifecycle: { decisionEligible: false, scope: 'DEVELOPMENT_AUTHORING', state: lifecycle },
    schemaVersion: prepared.schemaVersion,
    snapshotFingerprint: prepared.preparedSnapshotFingerprint,
  };
  if (!validateComposedEvaluationBlueprint(blueprintValue).valid) {
    return errorResult('COMPOSED_BLUEPRINT_INVALID', packetFingerprint, response);
  }
  const blueprint = blueprintValue as unknown as EvaluationBlueprint;
  return { blueprint, invocationAttempts: 1, packetFingerprint, ...responseEvidence(response), status: 'COMPLETED' };
}
