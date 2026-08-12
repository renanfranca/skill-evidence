import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { VarValue } from 'promptfoo';

import type { BlueprintCandidate } from '../blueprint/evaluation-blueprint.js';
import { canonicalJson } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { authorEvaluationBlueprint } from './evaluation-author.js';

type LifecycleState = 'BLOCKED' | 'DRAFT' | 'READY';
type LifecycleActualState = LifecycleState | 'ERROR';

interface LifecycleFixtureCase {
  expected: LifecycleState;
  id: string;
}

interface LifecycleFixtureManifest {
  cases: LifecycleFixtureCase[];
  schemaVersion: 1;
}

interface LifecycleCandidateProfile {
  claim: string;
  evidenceSource: string;
  grounding: { forbidden: string[]; required: string[]; sourceRequired: string[] };
  id: string;
  invalidMutation: string;
  omitEvidencePlan: boolean;
  oracleInvalid: string;
  oracleValid: string;
  precondition: string;
  prohibitedEffect: string;
  recovery: string;
  requiredEffect: string;
  skillName: string;
  stimulus: string;
  summary: string;
  unresolvedRequirements: NonNullable<BlueprintCandidate['unresolvedRequirements']>;
}

export interface AuthorLifecycleConformanceEvidence {
  cases: Array<{
    actual: LifecycleActualState;
    expected: LifecycleState;
    id: string;
    groundingValid: boolean;
    invalidMutationRejected: boolean;
    packetFingerprint: string;
    snapshotFingerprint: string;
  }>;
  externalProviderCalls: 0;
  groundingFindings: number;
  invalidMutationsAccepted: number;
  localProviderCalls: number;
  packetLeakageFindings: number;
  promptfooVersion: string;
  protocolVersion: 2;
}

export interface AuthorLifecycleQualificationReport extends AuthorLifecycleConformanceEvidence {
  limitations: string[];
  purpose: 'DEVELOPMENT';
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_FOR_DEVELOPMENT';
  schemaVersion: 1;
}

interface PromptfooResult {
  error?: string | null;
  response?: { output?: unknown };
  testCase: { metadata?: Record<string, unknown> };
}

interface PromptfooEvaluation {
  toEvaluateSummary: () => Promise<{ results: PromptfooResult[] }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function loadFixtureManifest(value: unknown): LifecycleFixtureManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.cases) || value.cases.length !== 8) {
    throw new Error('Author lifecycle fixture manifest is invalid');
  }
  const ids = value.cases.map((entry) => (isRecord(entry) ? entry.id : undefined));
  if (
    new Set(ids).size !== ids.length ||
    !value.cases.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.expected === 'string' &&
        ['BLOCKED', 'DRAFT', 'READY'].includes(entry.expected),
    )
  ) {
    throw new Error('Author lifecycle fixture manifest is invalid');
  }
  return value as unknown as LifecycleFixtureManifest;
}

function loadCandidateProfiles(value: unknown, fixtureIds: string[]): LifecycleCandidateProfile[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.profiles) || value.profiles.length !== 8) {
    throw new Error('Author lifecycle candidate profiles are invalid');
  }
  const profiles = value.profiles;
  const profileIds = profiles.map((entry) => (isRecord(entry) ? entry.id : undefined));
  const stringFields = [
    'claim',
    'evidenceSource',
    'id',
    'invalidMutation',
    'oracleInvalid',
    'oracleValid',
    'precondition',
    'prohibitedEffect',
    'recovery',
    'requiredEffect',
    'skillName',
    'stimulus',
    'summary',
  ];
  if (
    new Set(profileIds).size !== profiles.length ||
    profileIds.some((id) => typeof id !== 'string' || !fixtureIds.includes(id)) ||
    !profiles.every(
      (entry) =>
        isRecord(entry) &&
        stringFields.every((field) => typeof entry[field] === 'string' && entry[field].length > 0) &&
        typeof entry.omitEvidencePlan === 'boolean' &&
        Array.isArray(entry.unresolvedRequirements) &&
        isRecord(entry.grounding) &&
        Array.isArray(entry.grounding.required) &&
        entry.grounding.required.length > 0 &&
        entry.grounding.required.every((item) => typeof item === 'string') &&
        Array.isArray(entry.grounding.sourceRequired) &&
        entry.grounding.sourceRequired.length > 0 &&
        entry.grounding.sourceRequired.every((item) => typeof item === 'string') &&
        Array.isArray(entry.grounding.forbidden) &&
        entry.grounding.forbidden.length > 0 &&
        entry.grounding.forbidden.every((item) => typeof item === 'string') &&
        typeof entry.invalidMutation === 'string' &&
        entry.grounding.forbidden.includes(entry.invalidMutation),
    )
  ) {
    throw new Error('Author lifecycle candidate profiles are invalid');
  }
  return profiles as unknown as LifecycleCandidateProfile[];
}

function candidateFor(profile: LifecycleCandidateProfile): BlueprintCandidate {
  const claimId = 'claim-observable-result';
  const contractId = 'contract-observable-behavior';
  return {
    activationRegions: {
      nearBoundary: ['Requests with incomplete parcel inputs.'],
      negative: ['Requests unrelated to parcel records.'],
      positive: ['Explicit requests for the declared parcel transformation.'],
    },
    analysisPlan: {
      missingTrials: 'Report missing trials separately without imputation.',
      multiplicity: 'Report every prespecified measure.',
      primaryComparisons: ['Contract satisfaction across declared families.'],
      reportingRule: 'Preserve failures and incomplete executions.',
      subgroups: ['ordinary routes', 'malformed routes'],
    },
    claims: [
      {
        id: claimId,
        mandatory: true,
        statement: profile.claim,
        type: 'OBSERVED_BEHAVIOR',
      },
    ],
    contrasts: [
      {
        claimIds: [claimId],
        condition: 'Current skill behavior without causal attribution.',
        id: 'contrast-current-condition',
        rationale: 'Measure the declared behavior directly.',
      },
    ],
    contracts: [
      {
        acceptableDecisions: ['Produce the declared result or report a missing precondition.'],
        activationExpectation: 'Activate for explicit in-scope parcel requests.',
        authorityConstraints: ['Do not broaden authority beyond the skill and supplied context.'],
        claimIds: [claimId],
        evidenceRequired: ['The resulting record and terminal status.'],
        id: contractId,
        preconditions: [profile.precondition],
        prohibitedEffects: [profile.prohibitedEffect],
        recoveryBehavior: [profile.recovery],
        requiredEffects: [profile.requiredEffect],
        responsibilityBoundaries: ['External carrier and dispatch systems remain out of scope.'],
        stimulus: profile.stimulus,
        temporalConstraints: ['Validate inputs before returning the record.'],
      },
    ],
    decisionContext: {
      decision: 'Whether the declared parcel transformation satisfies its observable contract.',
      efficiencyBudgets: ['One execution per sampled case.'],
      maximumAcceptableRegression: 'No fabricated parcel data.',
      minimumWorthwhileImprovement: 'More contract-satisfying outputs than the prespecified comparison.',
      requiredUncertainty: 'Report incomplete and missing trials separately.',
      severeHarmLimits: ['No external dispatch or authority escalation.'],
    },
    evidencePlan: profile.omitEvidencePlan
      ? []
      : [
          {
            claimIds: [claimId],
            contractIds: [contractId],
            evidenceType: 'DIRECT',
            id: 'evidence-observable-result',
            required: true,
            source: profile.evidenceSource,
          },
        ],
    exclusions: [{ description: 'Live carrier operations and private customer data.', id: 'exclude-live-carriers' }],
    oracleQualificationPlan: {
      ambiguousAlternatives: ['Equivalent field ordering with identical parcel values.'],
      invalidBehaviors: [profile.oracleInvalid],
      leakageChecks: ['Keep expected case outcomes outside the Author packet.'],
      validBehaviors: [profile.oracleValid],
    },
    policies: {
      criticalViolationPrecedence: 'Fabrication or external dispatch overrides favorable aggregates.',
      expectationBlindness: 'Expected outcomes remain hidden from the evaluated condition.',
      missingEvidence: 'Missing mandatory output evidence blocks the dependent claim.',
      semanticEquivalence: 'Equivalent parcel records are accepted.',
    },
    population: { excluded: ['Live customer parcels.'], target: 'Synthetic parcel requests matching the declared interface.' },
    samplingPlan: {
      exclusionRules: ['Exclude malformed harness inputs and report them.'],
      inclusionRules: ['Include every prespecified valid execution.'],
      randomization: 'Freeze order before collection.',
      repetitions: 1,
      stressCount: 2,
      usageCount: 2,
    },
    skill: { name: profile.skillName, summary: profile.summary },
    stoppingConditions: [{ action: 'Stop and report.', condition: 'An external dispatch is attempted.', id: 'stop-external-dispatch' }],
    stressFamilies: [
      { contractIds: [contractId], description: 'Missing or malformed inputs at the declared boundary.', id: 'stress-boundary' },
    ],
    unresolvedRequirements: profile.unresolvedRequirements,
    untestedRisks: [
      { description: 'Behavior with unseen carrier formats remains untested.', id: 'risk-unseen-format', severity: 'MEDIUM' },
    ],
    usageFamilies: [
      { contractIds: [contractId], description: 'Ordinary request satisfying the declared preconditions.', id: 'usage-main' },
    ],
  };
}

function candidateIsGrounded(profile: LifecycleCandidateProfile, candidate: BlueprintCandidate, source: string): boolean {
  const serialized = canonicalJson(candidate).toLowerCase();
  const normalizedSource = source.toLowerCase();
  return (
    profile.grounding.sourceRequired.every((fragment) => normalizedSource.includes(fragment.toLowerCase())) &&
    profile.grounding.required.every((fragment) => serialized.includes(fragment.toLowerCase())) &&
    profile.grounding.forbidden.every((fragment) => !serialized.includes(fragment.toLowerCase()))
  );
}

async function promptfooVersion(root: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8')) as unknown;
  return isRecord(manifest) && typeof manifest.version === 'string' ? manifest.version : 'UNAVAILABLE';
}

export async function runAuthorLifecycleConformance(root = process.cwd()): Promise<AuthorLifecycleConformanceEvidence> {
  const fixtureRoot = join(root, 'evaluations', 'refactor-design', 'e5-author-remediation');
  const manifest = loadFixtureManifest(JSON.parse(await readFile(join(fixtureRoot, 'cases.json'), 'utf8')) as unknown);
  const profiles = loadCandidateProfiles(
    JSON.parse(await readFile(join(fixtureRoot, 'candidate-profiles.json'), 'utf8')) as unknown,
    manifest.cases.map((fixture) => fixture.id),
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    {
      prompts: ['Return the deterministic lifecycle-remediation candidate supplied by the local development fixture.'],
      providers: [{ id: 'file://evaluations/refactor-design/e5-author-remediation/providers/lifecycle-candidate.cjs' }],
      sharing: false,
      tests: manifest.cases.map((fixture) => ({
        metadata: { fixtureId: fixture.id },
        vars: { candidate: candidateFor(profileById.get(fixture.id)!) as unknown as Record<string, VarValue> },
      })),
      writeLatestResults: false,
    },
    { cache: false, maxConcurrency: 1 },
  )) as PromptfooEvaluation;
  const summary = await evaluation.toEvaluateSummary();
  const outputById = new Map(
    summary.results.map((result) => [
      result.testCase.metadata?.fixtureId,
      result.error === null || result.error === undefined ? result.response?.output : undefined,
    ]),
  );
  let packetLeakageFindings = 0;
  let groundingFindings = 0;
  let invalidMutationsAccepted = 0;
  const cases: AuthorLifecycleConformanceEvidence['cases'] = [];
  for (const fixture of manifest.cases) {
    const output = outputById.get(fixture.id);
    const profile = profileById.get(fixture.id)!;
    const snapshot = await createSkillSnapshot({ rootDirectory: join(fixtureRoot, 'skills', fixture.id) });
    const snapshotSource = snapshot.includedFiles.find((file) => file.path === 'SKILL.md')?.content ?? '';
    const result = await authorEvaluationBlueprint({
      campaignId: `qualify-author-lifecycle-${fixture.id}`,
      invoke: (request) => {
        const packet = JSON.parse(request.prompt) as unknown;
        const serializedPacket = canonicalJson(packet);
        const instructions = isRecord(packet) && Array.isArray(packet.instructions) ? packet.instructions.join('\n') : '';
        if (
          serializedPacket.includes(fixture.id) ||
          serializedPacket.includes(profile.invalidMutation) ||
          serializedPacket.includes('expectedLifecycle') ||
          serializedPacket.includes('oracleAnswer') ||
          !isRecord(packet) ||
          !isRecord(packet.protocol) ||
          packet.protocol.authorProtocolVersion !== 2 ||
          !instructions.includes('does not by itself make the Blueprint incomplete') ||
          !instructions.includes('Do not invent missing policy, authority, expected answers, thresholds, or external state')
        ) {
          packetLeakageFindings += 1;
        }
        if (typeof output !== 'string') {
          return Promise.reject(new Error('local Promptfoo lifecycle fixture returned no output'));
        }
        return Promise.resolve({ observedModel: null, output });
      },
      protocolVersion: 2,
      snapshot,
    });
    const parsedCandidate = typeof output === 'string' ? (JSON.parse(output) as BlueprintCandidate) : {};
    const groundingValid = candidateIsGrounded(profile, parsedCandidate, snapshotSource);
    const invalidMutation = structuredClone(parsedCandidate);
    invalidMutation.skill = {
      name: invalidMutation.skill?.name ?? profile.skillName,
      summary: `${invalidMutation.skill?.summary ?? profile.summary} ${profile.invalidMutation}`,
    };
    const invalidMutationRejected = !candidateIsGrounded(profile, invalidMutation, snapshotSource);
    if (!groundingValid) groundingFindings += 1;
    if (!invalidMutationRejected) invalidMutationsAccepted += 1;
    cases.push({
      actual: result.status === 'COMPLETED' ? result.blueprint.lifecycle.state : 'ERROR',
      expected: fixture.expected,
      id: fixture.id,
      groundingValid,
      invalidMutationRejected,
      packetFingerprint: result.packetFingerprint,
      snapshotFingerprint: snapshot.fingerprint,
    });
  }
  return {
    cases,
    externalProviderCalls: 0,
    groundingFindings,
    invalidMutationsAccepted,
    localProviderCalls: summary.results.length,
    packetLeakageFindings,
    promptfooVersion: await promptfooVersion(root),
    protocolVersion: 2,
  };
}

function blockedEvidence(): AuthorLifecycleConformanceEvidence {
  return {
    cases: [],
    externalProviderCalls: 0,
    groundingFindings: 0,
    invalidMutationsAccepted: 0,
    localProviderCalls: 0,
    packetLeakageFindings: 0,
    promptfooVersion: 'UNAVAILABLE',
    protocolVersion: 2,
  };
}

export async function qualifyAuthorLifecycle(
  launch: () => Promise<AuthorLifecycleConformanceEvidence>,
): Promise<AuthorLifecycleQualificationReport> {
  let evidence: AuthorLifecycleConformanceEvidence;
  try {
    evidence = await launch();
  } catch {
    evidence = blockedEvidence();
  }
  const wellFormed =
    evidence.promptfooVersion === '0.122.0' &&
    evidence.externalProviderCalls === 0 &&
    evidence.localProviderCalls === 8 &&
    evidence.packetLeakageFindings === 0 &&
    evidence.cases.length === 8;
  const matches =
    wellFormed &&
    evidence.groundingFindings === 0 &&
    evidence.invalidMutationsAccepted === 0 &&
    evidence.cases.every((fixture) => fixture.actual === fixture.expected && fixture.groundingValid && fixture.invalidMutationRejected);
  return {
    ...evidence,
    limitations: [
      'This adaptable corpus is not blind decision evidence and does not qualify Author protocol v2 on a model.',
      'Deterministic local providers do not qualify Terra, Luna, or automatic authorship.',
      'Grounding checks qualify curated fixture candidates and known-invalid mutations, not model interpretation of skill content.',
      'This qualifier verifies protocol-v2 packet construction, fixture grounding, and lifecycle mechanics only.',
    ],
    purpose: 'DEVELOPMENT',
    result: !wellFormed ? 'BLOCKED' : matches ? 'SUPPORTED_FOR_DEVELOPMENT' : 'INSUFFICIENT',
    schemaVersion: 1,
  };
}

export function renderAuthorLifecycleQualification(report: AuthorLifecycleQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyAuthorLifecycle(runAuthorLifecycleConformance);
  process.stdout.write(renderAuthorLifecycleQualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
