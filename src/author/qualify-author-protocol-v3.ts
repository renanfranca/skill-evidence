import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { VarValue } from 'promptfoo';

import { canonicalJson, sha256 } from '../canonical-json.js';
import { createSkillSnapshot } from '../intake/skill-snapshot.js';
import { authorEvaluationBlueprint, type AuthoringContext } from './evaluation-author.js';

type ActualState = 'BLOCKED' | 'DRAFT' | 'ERROR' | 'READY';
type CaseKind = 'AUTHOR_BLOCKER' | 'BROKEN_REFERENCE' | 'DIRECT_ONLY' | 'NO_OBSERVATION' | 'READY' | 'RESERVED_ID' | 'SYSTEM_BLOCKER';

interface FixtureCase {
  expected: ActualState;
  id: string;
  kind: CaseKind;
}

export interface AuthorProtocolV3ConformanceEvidence {
  cases: Array<{
    actual: ActualState;
    authoringContextFingerprint: string;
    expected: ActualState;
    id: string;
    packetFingerprint: string;
    snapshotFingerprint: string;
  }>;
  externalProviderCalls: 0;
  localProviderCalls: number;
  packetLeakageFindings: number;
  promptfooVersion: string;
  protocolVersion: 3;
}

export interface AuthorProtocolV3QualificationReport extends AuthorProtocolV3ConformanceEvidence {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function loadCases(value: unknown): FixtureCase[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.cases) || value.cases.length !== 7) {
    throw new Error('Author protocol v3 fixture manifest is invalid');
  }
  const cases = value.cases as unknown[];
  const ids = cases.map((entry) => (isRecord(entry) ? entry.id : undefined));
  if (
    new Set(ids).size !== cases.length ||
    !cases.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        ['BLOCKED', 'DRAFT', 'ERROR', 'READY'].includes(String(entry.expected)) &&
        ['AUTHOR_BLOCKER', 'BROKEN_REFERENCE', 'DIRECT_ONLY', 'NO_OBSERVATION', 'READY', 'RESERVED_ID', 'SYSTEM_BLOCKER'].includes(
          String(entry.kind),
        ),
    )
  ) {
    throw new Error('Author protocol v3 fixture manifest is invalid');
  }
  return cases as FixtureCase[];
}

function contextFor(kind: CaseKind): AuthoringContext {
  const context: AuthoringContext = {
    claimRequirements: [
      {
        claimBoundary: 'Observable behavior under the declared contract only.',
        decisionCritical: true,
        id: 'system:authoring-context:claim-requirement:observable-contract',
        mandatory: true,
        populationScopeIds: ['system:authoring-context:population:development'],
        rationale: 'The development decision requires this claim.',
        source: 'fixture operator',
        type: 'OBSERVED_BEHAVIOR',
      },
    ],
    decisionContext: {
      decision: { disposition: 'SUPPLIED', source: 'fixture operator', value: 'Characterize the declared observable contract.' },
      efficiencyBudgets: { disposition: 'NOT_REQUIRED', rationale: 'No efficiency claim is intended.', source: 'fixture operator' },
      maximumAcceptableRegression: {
        disposition: 'NOT_REQUIRED',
        rationale: 'No change comparison is intended.',
        source: 'fixture operator',
      },
      minimumWorthwhileImprovement: {
        disposition: 'NOT_REQUIRED',
        rationale: 'No improvement claim is intended.',
        source: 'fixture operator',
      },
      requiredUncertainty: { disposition: 'SUPPLIED', source: 'fixture operator', value: 'Report every sampled result.' },
      severeHarmLimits: { disposition: 'SUPPLIED', source: 'fixture operator', value: ['No external state access.'] },
    },
    population: {
      defaultScopeId: 'system:authoring-context:population:development',
      excluded: { disposition: 'SUPPLIED', source: 'fixture operator', value: ['Requests outside the declared contract.'] },
      scopes: [
        {
          excluded: ['Requests outside the declared contract.'],
          id: 'system:authoring-context:population:development',
          source: 'fixture operator',
          target: 'Synthetic in-scope requests.',
        },
      ],
      target: { disposition: 'SUPPLIED', source: 'fixture operator', value: 'Synthetic in-scope requests.' },
    },
    schemaVersion: 2,
  };
  if (kind === 'SYSTEM_BLOCKER') {
    context.population.target = {
      dependency: { scope: 'CLAIM_REQUIREMENT', claimRequirementId: context.claimRequirements[0]!.id },
      disposition: 'REQUIRED_ABSENT',
      evidenceNeeded: 'A target population declared by the decision owner.',
      reason: 'The intended population was not supplied.',
      source: 'fixture operator',
      status: 'INSUFFICIENT_INFORMATION',
    };
  }
  return context;
}

function candidateFor(kind: CaseKind, source: string): Record<string, unknown> {
  const claimId = 'claim-observable-contract';
  const contractId = 'contract-main';
  const candidate: Record<string, unknown> = {
    activationRegions: {
      nearBoundary: ['Requests missing declared inputs.'],
      negative: ['Requests outside the declared transformation.'],
      positive: ['Explicit requests for the declared transformation.'],
    },
    analysisPlan: {
      missingTrials: 'Report missing trials separately.',
      multiplicity: 'Report all prespecified measures.',
      primaryComparisons: ['Contract satisfaction by family.'],
      reportingRule: 'Preserve failures and incomplete results.',
      subgroups: ['ordinary', 'stress'],
    },
    claims: [
      {
        claimRequirementId: 'system:authoring-context:claim-requirement:observable-contract',
        conditions: ['The request supplies the declared input.'],
        id: claimId,
        limitations: ['Synthetic cases do not establish generalization.'],
        requiredEvidence: ['evidence-contract'],
        statement: 'The declared observable contract is satisfied.',
        type: 'OBSERVED_BEHAVIOR',
      },
    ],
    contrasts: [{ claimIds: [claimId], condition: 'Current behavior.', id: 'contrast-current', rationale: 'No causal claim is made.' }],
    contracts: [
      {
        acceptableDecisions: ['Return the declared result or a structured input error.'],
        activationExpectation: 'Activate only for explicit in-scope requests.',
        authorityConstraints: ['Use only supplied data.'],
        claimIds: [claimId],
        evidenceRequired: ['evidence-contract'],
        id: contractId,
        preconditions: ['The request supplies the declared input.'],
        prohibitedEffects: ['Accessing or changing external state.'],
        recoveryBehavior: ['Report invalid input without fabrication.'],
        requiredEffects: ['Produce the transformation described by the authorized skill snapshot.'],
        responsibilityBoundaries: ['External systems remain out of scope.'],
        stimulus: 'An explicit in-scope request.',
        temporalConstraints: ['Validate inputs before returning.'],
      },
    ],
    evidencePlan: [
      {
        claimIds: [claimId],
        contractIds: [contractId],
        id: 'evidence-contract',
        critical: false,
        mandatory: true,
        observabilityRequirement: {
          operator: 'ANY_PATH',
          paths: [
            {
              assessments: [
                {
                  assessmentSource: 'Qualified contract evaluator.',
                  capability: { id: 'semantic-contract-assessment', purpose: 'Assess the output against the contract.' },
                  evidenceKind: 'SEMANTIC',
                  id: 'assessment-contract',
                  observationIds: ['observation-output'],
                  procedure: 'Apply the prespecified contract rubric.',
                },
              ],
              id: 'path-contract',
              observations: [
                {
                  capability: { id: 'output-capture', purpose: 'Capture candidate output and status.' },
                  evidenceKind: 'DIRECT',
                  evidenceSource: 'Candidate execution.',
                  id: 'observation-output',
                  observable: 'The output and terminal status.',
                },
              ],
            },
          ],
        },
        property: 'Observable contract satisfaction.',
      },
    ],
    exclusions: [{ description: 'Live external operations.', id: 'exclude-live' }],
    oracleQualificationPlan: {
      ambiguousAlternatives: ['Semantically equivalent formatting.'],
      invalidBehaviors: ['Fabricated input or external effects.'],
      leakageChecks: ['Expected states remain outside the packet.'],
      validBehaviors: ['Contract-equivalent outputs.'],
    },
    policies: {
      criticalViolationPrecedence: 'Critical fabrication overrides favorable aggregates.',
      expectationBlindness: 'Expected states remain hidden.',
      semanticEquivalence: 'Equivalent outputs are accepted.',
    },
    samplingPlan: {
      exclusionRules: ['Report invalid harness inputs separately.'],
      inclusionRules: ['Include all prespecified executions.'],
      randomization: 'Freeze order before collection.',
      repetitions: 1,
      stressCount: 1,
      usageCount: 1,
    },
    skill: { name: source.split('\n')[0]!.replace(/^# /u, ''), summary: source.trim() },
    stoppingConditions: [{ action: 'Stop and report.', condition: 'External state access is attempted.', id: 'stop-external' }],
    stressFamilies: [{ contractIds: [contractId], description: 'Invalid or missing input.', id: 'stress-input' }],
    unresolvedRequirements: [],
    untestedRisks: [{ description: 'Unseen inputs remain untested.', id: 'risk-unseen', severity: 'MEDIUM' }],
    usageFamilies: [{ contractIds: [contractId], description: 'Ordinary valid input.', id: 'usage-main' }],
  };
  if (kind === 'AUTHOR_BLOCKER') {
    candidate.unresolvedRequirements = [
      {
        affectedClaimIds: [claimId],
        blocking: true,
        evidenceNeeded: 'The output encoding required by the declared contract.',
        field: 'contracts',
        id: 'author:missing-output-encoding',
        reason: 'The skill leaves the required encoding unspecified.',
        source: 'Authorized skill snapshot.',
        status: 'UNKNOWN',
      },
    ];
  }
  if (kind === 'BROKEN_REFERENCE') {
    (candidate.evidencePlan as Array<{ claimIds: string[] }>)[0]!.claimIds = ['missing-claim'];
  }
  if (kind === 'RESERVED_ID') {
    (
      candidate.evidencePlan as Array<{
        observabilityRequirement: { paths: Array<{ observations: Array<{ id: string }> }> };
      }>
    )[0]!.observabilityRequirement.paths[0]!.observations[0]!.id = 'system:authoring-context:decision';
  }
  if (kind === 'NO_OBSERVATION') {
    (
      candidate.evidencePlan as Array<{ observabilityRequirement: { paths: Array<{ observations: unknown[] }> } }>
    )[0]!.observabilityRequirement.paths[0]!.observations = [];
  }
  if (kind === 'DIRECT_ONLY') {
    (
      candidate.evidencePlan as Array<{ observabilityRequirement: { paths: Array<{ assessments: unknown[] }> } }>
    )[0]!.observabilityRequirement.paths[0]!.assessments = [];
  }
  return candidate;
}

async function promptfooVersion(root: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8')) as unknown;
  return isRecord(manifest) && typeof manifest.version === 'string' ? manifest.version : 'UNAVAILABLE';
}

export async function runAuthorProtocolV3Conformance(root = process.cwd()): Promise<AuthorProtocolV3ConformanceEvidence> {
  const fixtureRoot = join(root, 'evaluations', 'refactor-design', 'e5-author-protocol-v3');
  const fixtures = loadCases(JSON.parse(await readFile(join(fixtureRoot, 'cases.json'), 'utf8')) as unknown);
  const prepared = await Promise.all(
    fixtures.map(async (fixture) => {
      const snapshot = await createSkillSnapshot({ rootDirectory: join(fixtureRoot, 'skills', fixture.id) });
      const source = snapshot.includedFiles.find((file) => file.path === 'SKILL.md')?.content ?? '';
      return { candidate: candidateFor(fixture.kind, source), fixture, snapshot };
    }),
  );
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    {
      prompts: ['Return the deterministic protocol-v3 candidate supplied by the local development fixture.'],
      providers: [{ id: 'file://evaluations/refactor-design/e5-author-protocol-v3/providers/candidate.cjs' }],
      sharing: false,
      tests: prepared.map(({ candidate, fixture }) => ({
        metadata: { fixtureId: fixture.id },
        vars: { candidate: candidate as Record<string, VarValue> },
      })),
      writeLatestResults: false,
    },
    { cache: false, maxConcurrency: 1 },
  )) as { toEvaluateSummary: () => Promise<{ results: PromptfooResult[] }> };
  const summary = await evaluation.toEvaluateSummary();
  const outputById = new Map(
    summary.results.map((result) => [
      result.testCase.metadata?.fixtureId,
      result.error === null || result.error === undefined ? result.response?.output : undefined,
    ]),
  );
  let packetLeakageFindings = 0;
  const cases: AuthorProtocolV3ConformanceEvidence['cases'] = [];
  for (const { fixture, snapshot } of prepared) {
    const context = contextFor(fixture.kind);
    const output = outputById.get(fixture.id);
    const contextFingerprint = sha256(context);
    const result = await authorEvaluationBlueprint({
      authoringContext: context,
      campaignId: `qualify-author-protocol-v3-${fixture.id}`,
      invoke: (request) => {
        const packet = JSON.parse(request.prompt) as Record<string, unknown>;
        const serialized = canonicalJson(packet);
        if (
          serialized.includes(fixture.id) ||
          serialized.includes('expectedLifecycle') ||
          serialized.includes('fixtureKind') ||
          serialized.includes('oracleAnswer') ||
          !serialized.includes('authoringContext') ||
          !serialized.includes('SYSTEM_AUTHORING_CONTEXT')
        ) {
          packetLeakageFindings += 1;
        }
        if (typeof output !== 'string') return Promise.reject(new Error('local Promptfoo fixture returned no output'));
        return Promise.resolve({ observedModel: null, output });
      },
      protocolVersion: 3,
      snapshot,
    });
    if (result.status === 'COMPLETED' && result.blueprint.authorProvenance.authoringContextFingerprint !== contextFingerprint) {
      packetLeakageFindings += 1;
    }
    cases.push({
      actual: result.status === 'COMPLETED' ? result.blueprint.lifecycle.state : 'ERROR',
      authoringContextFingerprint: contextFingerprint,
      expected: fixture.expected,
      id: fixture.id,
      packetFingerprint: result.packetFingerprint,
      snapshotFingerprint: snapshot.fingerprint,
    });
  }
  return {
    cases,
    externalProviderCalls: 0,
    localProviderCalls: summary.results.length,
    packetLeakageFindings,
    promptfooVersion: await promptfooVersion(root),
    protocolVersion: 3,
  };
}

function blockedEvidence(): AuthorProtocolV3ConformanceEvidence {
  return {
    cases: [],
    externalProviderCalls: 0,
    localProviderCalls: 0,
    packetLeakageFindings: 0,
    promptfooVersion: 'UNAVAILABLE',
    protocolVersion: 3,
  };
}

export async function qualifyAuthorProtocolV3(
  launch: () => Promise<AuthorProtocolV3ConformanceEvidence>,
): Promise<AuthorProtocolV3QualificationReport> {
  let evidence: AuthorProtocolV3ConformanceEvidence;
  try {
    evidence = await launch();
  } catch {
    evidence = blockedEvidence();
  }
  const wellFormed =
    evidence.promptfooVersion === '0.122.0' &&
    evidence.externalProviderCalls === 0 &&
    evidence.localProviderCalls === 7 &&
    evidence.packetLeakageFindings === 0 &&
    evidence.cases.length === 7 &&
    evidence.cases.every(
      (fixture) =>
        /^[a-f0-9]{64}$/u.test(fixture.packetFingerprint) &&
        /^[a-f0-9]{64}$/u.test(fixture.snapshotFingerprint) &&
        /^[a-f0-9]{64}$/u.test(fixture.authoringContextFingerprint),
    );
  const matches = wellFormed && evidence.cases.every((fixture) => fixture.actual === fixture.expected);
  return {
    ...evidence,
    limitations: [
      'This adaptable corpus is not blind decision evidence and does not qualify Author protocol v3 on a model.',
      'Deterministic local candidates qualify packet, composition, schema, and lifecycle mechanics only.',
      'No Terra, Luna, automatic authorship, provider availability, or capability eligibility claim is supported.',
    ],
    purpose: 'DEVELOPMENT',
    result: !wellFormed ? 'BLOCKED' : matches ? 'SUPPORTED_FOR_DEVELOPMENT' : 'INSUFFICIENT',
    schemaVersion: 1,
  };
}

export function renderAuthorProtocolV3Qualification(report: AuthorProtocolV3QualificationReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyAuthorProtocolV3(runAuthorProtocolV3Conformance);
  process.stdout.write(renderAuthorProtocolV3Qualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
