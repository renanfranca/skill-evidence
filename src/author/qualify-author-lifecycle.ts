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
  kind: 'AUTHORITY_BLOCKER' | 'BEHAVIOR_BLOCKER' | 'CONTEXT_BLOCKER' | 'DRAFT' | 'NONBLOCKING' | 'READY';
}

interface LifecycleFixtureManifest {
  cases: LifecycleFixtureCase[];
  schemaVersion: 1;
}

export interface AuthorLifecycleConformanceEvidence {
  cases: Array<{
    actual: LifecycleActualState;
    expected: LifecycleState;
    id: string;
    packetFingerprint: string;
    snapshotFingerprint: string;
  }>;
  externalProviderCalls: 0;
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
  const kinds = ['AUTHORITY_BLOCKER', 'BEHAVIOR_BLOCKER', 'CONTEXT_BLOCKER', 'DRAFT', 'NONBLOCKING', 'READY'];
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
        typeof entry.kind === 'string' &&
        kinds.includes(entry.kind) &&
        typeof entry.expected === 'string' &&
        ['BLOCKED', 'DRAFT', 'READY'].includes(entry.expected),
    )
  ) {
    throw new Error('Author lifecycle fixture manifest is invalid');
  }
  return value as unknown as LifecycleFixtureManifest;
}

function baseCandidate(): BlueprintCandidate {
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
        id: 'claim-parcel-result',
        mandatory: true,
        statement: 'The observable parcel result follows the supplied inputs.',
        type: 'OBSERVED_BEHAVIOR',
      },
    ],
    contrasts: [
      {
        claimIds: ['claim-parcel-result'],
        condition: 'Current skill behavior without causal attribution.',
        id: 'contrast-current-condition',
        rationale: 'Measure the declared behavior directly.',
      },
    ],
    contracts: [
      {
        acceptableDecisions: ['Produce the declared result or report a missing precondition.'],
        activationExpectation: 'Activate for explicit in-scope parcel requests.',
        authorityConstraints: ['Do not perform an external dispatch.'],
        claimIds: ['claim-parcel-result'],
        evidenceRequired: ['The resulting record and terminal status.'],
        id: 'contract-parcel-transform',
        preconditions: ['Required case inputs are supplied.'],
        prohibitedEffects: ['Inventing a route, policy, or authorization.'],
        recoveryBehavior: ['Name the missing input without fabricating a result.'],
        requiredEffects: ['Return an independently inspectable parcel record.'],
        responsibilityBoundaries: ['External carrier and dispatch systems remain out of scope.'],
        stimulus: 'An explicit request containing the declared parcel inputs.',
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
    evidencePlan: [
      {
        claimIds: ['claim-parcel-result'],
        contractIds: ['contract-parcel-transform'],
        evidenceType: 'DIRECT',
        id: 'evidence-parcel-record',
        required: true,
        source: 'Observable output records collected during the future evaluation.',
      },
    ],
    exclusions: [{ description: 'Live carrier operations and private customer data.', id: 'exclude-live-carriers' }],
    oracleQualificationPlan: {
      ambiguousAlternatives: ['Equivalent field ordering with identical parcel values.'],
      invalidBehaviors: ['Fabricated parcel fields or external side effects.'],
      leakageChecks: ['Keep expected case outcomes outside the Author packet.'],
      validBehaviors: ['A record preserving all supplied values or a precise missing-input report.'],
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
    skill: { name: 'Parcel transformation', summary: 'Produces an inspectable parcel result from supplied values.' },
    stoppingConditions: [{ action: 'Stop and report.', condition: 'An external dispatch is attempted.', id: 'stop-external-dispatch' }],
    stressFamilies: [
      { contractIds: ['contract-parcel-transform'], description: 'Missing or malformed parcel inputs.', id: 'stress-parcel-inputs' },
    ],
    unresolvedRequirements: [],
    untestedRisks: [
      { description: 'Behavior with unseen carrier formats remains untested.', id: 'risk-unseen-format', severity: 'MEDIUM' },
    ],
    usageFamilies: [
      { contractIds: ['contract-parcel-transform'], description: 'Ordinary complete parcel request.', id: 'usage-complete-parcel' },
    ],
  };
}

function candidateFor(kind: LifecycleFixtureCase['kind']): BlueprintCandidate {
  const candidate = structuredClone(baseCandidate());
  if (kind === 'NONBLOCKING') {
    candidate.unresolvedRequirements = [
      {
        blocking: false,
        description: 'The future evaluation harness must supply its prespecified depot mapping.',
        id: 'requirement-future-depot-map',
        relatedSection: 'contracts',
      },
    ];
  } else if (kind === 'AUTHORITY_BLOCKER') {
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'The skill does not define who may authorize sending a dispatch request.',
        id: 'requirement-dispatch-authority',
        relatedSection: 'contracts',
      },
    ];
  } else if (kind === 'BEHAVIOR_BLOCKER') {
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'The required result and recovery behavior for a parcel exception are absent.',
        id: 'requirement-exception-contract',
        relatedSection: 'contracts',
      },
    ];
  } else if (kind === 'CONTEXT_BLOCKER') {
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'The approved-carrier policy needed to define a valid selection is absent.',
        id: 'requirement-carrier-policy',
        relatedSection: 'decisionContext',
      },
    ];
  } else if (kind === 'DRAFT') {
    candidate.evidencePlan = [];
  }
  return candidate;
}

async function promptfooVersion(root: string): Promise<string> {
  const manifest = JSON.parse(await readFile(join(root, 'node_modules', 'promptfoo', 'package.json'), 'utf8')) as unknown;
  return isRecord(manifest) && typeof manifest.version === 'string' ? manifest.version : 'UNAVAILABLE';
}

export async function runAuthorLifecycleConformance(root = process.cwd()): Promise<AuthorLifecycleConformanceEvidence> {
  const fixtureRoot = join(root, 'evaluations', 'refactor-design', 'e5-author-remediation');
  const manifest = loadFixtureManifest(JSON.parse(await readFile(join(fixtureRoot, 'cases.json'), 'utf8')) as unknown);
  const { evaluate } = await import('promptfoo');
  const evaluation = (await evaluate(
    {
      prompts: ['Return the deterministic lifecycle-remediation candidate supplied by the local development fixture.'],
      providers: [{ id: 'file://evaluations/refactor-design/e5-author-remediation/providers/lifecycle-candidate.cjs' }],
      sharing: false,
      tests: manifest.cases.map((fixture) => ({
        metadata: { fixtureId: fixture.id },
        vars: { candidate: candidateFor(fixture.kind) as unknown as Record<string, VarValue> },
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
  const cases: AuthorLifecycleConformanceEvidence['cases'] = [];
  for (const fixture of manifest.cases) {
    const output = outputById.get(fixture.id);
    const snapshot = await createSkillSnapshot({ rootDirectory: join(fixtureRoot, 'skills', fixture.id) });
    const result = await authorEvaluationBlueprint({
      campaignId: `qualify-author-lifecycle-${fixture.id}`,
      invoke: (request) => {
        const packet = JSON.parse(request.prompt) as unknown;
        const serializedPacket = canonicalJson(packet);
        const instructions = isRecord(packet) && Array.isArray(packet.instructions) ? packet.instructions.join('\n') : '';
        if (
          serializedPacket.includes(fixture.id) ||
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
    cases.push({
      actual: result.status === 'COMPLETED' ? result.blueprint.lifecycle.state : 'ERROR',
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
    protocolVersion: 2,
  };
}

function blockedEvidence(): AuthorLifecycleConformanceEvidence {
  return {
    cases: [],
    externalProviderCalls: 0,
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
  const matches = wellFormed && evidence.cases.every((fixture) => fixture.actual === fixture.expected);
  return {
    ...evidence,
    limitations: [
      'This adaptable corpus is not blind decision evidence and does not qualify Author protocol v2 on a model.',
      'Deterministic local providers do not qualify Terra, Luna, or automatic authorship.',
      'This qualifier verifies protocol-v2 packet construction and lifecycle mechanics only.',
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
