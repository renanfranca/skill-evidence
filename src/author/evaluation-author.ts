import blueprintSchema from '../../schemas/evaluation-blueprint.schema.json' with { type: 'json' };

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

export interface AuthorInvocationRequest {
  maxRetries: 0;
  model: 'gpt-5.6-terra';
  prompt: string;
  reasoningEffort: 'xhigh';
}

export interface AuthorInvocationResponse {
  observedModel: string | null;
  output: string;
}

export type AuthorInvoker = (request: AuthorInvocationRequest) => Promise<AuthorInvocationResponse>;

export interface AuthorInput {
  campaignId: string;
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
  conditionFingerprint: string;
  packetFingerprint: string;
  request: AuthorInvocationRequest;
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

function conditionDigests(): {
  conditionFingerprint: string;
  instructionDigest: string;
  protocolDigest: string;
  schemaDigest: string;
  theoryDigest: string;
} {
  const instructionDigest = sha256(authorInstructions);
  const protocolDigest = sha256({ authorProtocolVersion, response: 'PURE_JSON', systemControlledFields: true });
  const schemaDigest = sha256(blueprintSchema);
  const theoryDigest = sha256({ commit: theoryCommit, principles: theoryPrinciples });
  return {
    conditionFingerprint: sha256({
      instructionDigest,
      model: 'gpt-5.6-terra',
      protocolDigest,
      reasoningEffort: 'xhigh',
      schemaDigest,
      theoryDigest,
    }),
    instructionDigest,
    protocolDigest,
    schemaDigest,
    theoryDigest,
  };
}

export function prepareAuthorInvocation(snapshot: SkillSnapshot): PreparedAuthorInvocation {
  const packet = authorPacket(snapshot);
  const digests = conditionDigests();
  return {
    conditionFingerprint: digests.conditionFingerprint,
    packetFingerprint: sha256(packet),
    request: { maxRetries: 0, model: 'gpt-5.6-terra', prompt: canonicalJson(packet), reasoningEffort: 'xhigh' },
  };
}

function errorResult(code: 'CANDIDATE_STRUCTURALLY_INVALID' | 'INVALID_JSON', packetFingerprint: string): AuthorRunResult {
  return { error: { code }, invocationAttempts: 1, packetFingerprint, status: 'ERROR' };
}

function providerErrorResult(diagnostic: AuthorProviderDiagnostic, packetFingerprint: string): AuthorRunResult {
  return { error: { code: 'PROVIDER_ERROR', diagnostic }, invocationAttempts: 1, packetFingerprint, status: 'ERROR' };
}

export async function authorEvaluationBlueprint(input: AuthorInput): Promise<AuthorRunResult> {
  const prepared = prepareAuthorInvocation(input.snapshot);
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
  const digests = conditionDigests();
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
      reasoningEffort: 'xhigh',
      requestedModel: 'gpt-5.6-terra',
      schemaDigest: digests.schemaDigest,
      status: 'NOT_QUALIFIED',
      theoryDigest: digests.theoryDigest,
    },
    blueprintId: `ebp-${sha256(semanticIdentity)}`,
    lifecycle: { decisionEligible: false, scope: 'DEVELOPMENT_AUTHORING', state: lifecycle },
    schemaVersion: 1,
    snapshotFingerprint: input.snapshot.fingerprint,
  };
  return { blueprint, invocationAttempts: 1, packetFingerprint, status: 'COMPLETED' };
}
