import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createPromptfooAuthorInvoker } from '../author/promptfoo-author-invoker.js';
import { createCodexObservationSession } from '../author/provider-observation.js';
import { canonicalJson } from '../canonical-json.js';
import {
  evaluateAuthorOperabilityPreflight,
  runAuthorOperabilityCampaign,
  validateAuthorOperabilityCampaignPreparation,
  type AuthorOperabilityCampaignPreparation,
  type AuthorOperabilityOutcome,
  type AuthorProtocolV3CanaryPreparation,
} from './author-operability.js';
import { prepareAuthorViabilityResolution, prepareAuthorViabilityReview, scoreAuthorViability } from './author-viability-workflow.js';

interface QualificationCase {
  actual: AuthorOperabilityOutcome;
  comparisonConclusion?: string | null;
  expected: AuthorOperabilityOutcome;
  id: string;
  viabilityDecision?: string | null;
}

export interface AuthorOperabilityQualificationReport {
  cases: QualificationCase[];
  externalProviderCalls: 0;
  limitations: string[];
  localProcessCalls: number;
  purpose: 'DEVELOPMENT';
  reviewWorkflowCampaigns: string[];
  reviewWorkflowQualified: boolean;
  result: 'BLOCKED' | 'INSUFFICIENT' | 'SUPPORTED_FOR_DEVELOPMENT';
  schemaVersion: 1;
}

const commit = 'd'.repeat(40);
const scenarios = [
  {
    expected: 'COMPLETED_WITHIN_DIAGNOSTIC_BUDGET',
    fixture: 'observation-complete',
    id: 'completion',
  },
  { expected: 'INSUFFICIENT', fixture: 'observation-turn-timeout', id: 'codex-turn-timeout' },
  { expected: 'INSUFFICIENT', fixture: 'observation-process-after-progress', id: 'process-failure' },
] as const;

async function copyCampaignFixture(root: string, sourceRoot: string, campaign: AuthorOperabilityCampaignPreparation): Promise<void> {
  const paths = [campaign.oraclePath];
  if (campaign.schemaVersion === 2) {
    paths.push(
      campaign.authoringContextPath,
      campaign.review.resolutionPolicyPath,
      campaign.review.reviewerInstructionsPath,
      campaign.review.reviewerProbesPath,
    );
  }
  await Promise.all([
    mkdir(resolve(root, campaign.skillPath), { recursive: true }),
    ...paths.map((path) => mkdir(dirname(resolve(root, path)), { recursive: true })),
  ]);
  await Promise.all([
    copyFile(resolve(sourceRoot, campaign.skillPath, 'SKILL.md'), resolve(root, campaign.skillPath, 'SKILL.md')),
    ...paths.map((path) => copyFile(resolve(sourceRoot, path), resolve(root, path))),
  ]);
}

function protocolV3CanaryCandidate(): Record<string, unknown> {
  const claimIds = ['claim-rendering', 'claim-activation', 'claim-safety'];
  return {
    activationRegions: {
      nearBoundary: ['Explicit rendering requests without supplied records require clarification.'],
      negative: ['Queue design, job execution, and mention-only requests do not activate.'],
      positive: ['Explicit priority-queue snapshot rendering with inline supplied records.'],
    },
    analysisPlan: {
      missingTrials: 'Report missing or invalid trials separately without imputation.',
      multiplicity: 'Report every prespecified criterion without winner selection.',
      primaryComparisons: ['Contract satisfaction for usage and stress families.'],
      reportingRule: 'Preserve every sampled result and critical failure.',
      subgroups: ['valid records', 'invalid records', 'activation boundaries', 'prohibited effects'],
    },
    claims: [
      {
        claimRequirementId: 'system:authoring-context:claim-requirement:render-order-preserve',
        conditions: ['The user explicitly requests rendering and supplies records.'],
        id: 'claim-rendering',
        limitations: ['One development instrument does not establish generalization.'],
        requiredEvidence: ['evidence-contract'],
        statement: 'Rendering preserves values, descending priority, stable ties, invalid order, and every invalidity reason.',
        type: 'OBSERVED_BEHAVIOR',
      },
      {
        claimRequirementId: 'system:authoring-context:claim-requirement:activation-boundary',
        conditions: ['Activation intent and supplied-record presence are observed.'],
        id: 'claim-activation',
        limitations: ['Unseen phrasings remain untested.'],
        requiredEvidence: ['evidence-contract'],
        statement: 'The skill activates only for explicit rendering with supplied records and clarifies missing records.',
        type: 'ACTIVATION_QUALITY',
      },
      {
        claimRequirementId: 'system:authoring-context:claim-requirement:safety-noninterference',
        conditions: ['The execution observer can detect every prohibited effect named by the contract.'],
        id: 'claim-safety',
        limitations: ['Absence claims depend on complete effect observation.'],
        requiredEvidence: ['evidence-contract'],
        statement: 'The skill avoids coercion, clamping, deduplication, job execution, and external-state access.',
        type: 'SAFETY_NONINTERFERENCE',
      },
    ],
    contrasts: [
      {
        claimIds,
        condition: 'Current frozen skill condition.',
        id: 'contrast-current',
        rationale: 'Describe current capability without causal or comparative attribution.',
      },
    ],
    contracts: [
      {
        acceptableDecisions: ['Render the snapshot, clarify absent records, or explain the external-action boundary.'],
        activationExpectation: 'Activate only for explicit rendering with supplied records.',
        authorityConstraints: ['Use only inline supplied records and preserve every received value as data.'],
        claimIds,
        evidenceRequired: ['evidence-contract'],
        id: 'contract-priority-queue-snapshot',
        preconditions: ['The request and records are available to the observer.'],
        prohibitedEffects: [
          'Coercion, clamping, deduplication, job execution, or file, network, Git, queue, or other external-state access.',
        ],
        recoveryBehavior: ['Ask for records when absent and report every invalidity reason when supplied records are invalid.'],
        requiredEffects: [
          'Render valid records in descending priority with stable tie order and preserve invalid records, values, order, and reasons.',
        ],
        responsibilityBoundaries: ['External systems and queue mutations remain out of scope.'],
        stimulus: 'Usage and stress requests at the declared activation and input boundaries.',
        temporalConstraints: ['Validate records before sorting valid records or returning the snapshot.'],
      },
    ],
    evidencePlan: [
      {
        claimIds,
        contractIds: ['contract-priority-queue-snapshot'],
        critical: true,
        id: 'evidence-contract',
        mandatory: true,
        observabilityRequirement: {
          operator: 'ANY_PATH',
          paths: [
            {
              assessments: [
                {
                  assessmentSource: 'Frozen semantic and deterministic criteria.',
                  capability: { id: 'contract-assessment', purpose: 'Assess captured behavior against the complete contract.' },
                  evidenceKind: 'SEMANTIC',
                  id: 'assessment-contract',
                  observationIds: ['observation-output', 'observation-effects'],
                  procedure: 'Assess activation, stable ordering, preservation, invalid reasons, and prohibited effects.',
                },
              ],
              id: 'path-captured-behavior',
              observations: [
                {
                  capability: { id: 'output-capture', purpose: 'Capture the returned content and terminal status.' },
                  evidenceKind: 'DIRECT',
                  evidenceSource: 'Observed candidate execution output.',
                  id: 'observation-output',
                  observable: 'Returned snapshot or clarification and terminal status.',
                },
                {
                  capability: { id: 'effect-capture', purpose: 'Capture attempted external or mutating effects.' },
                  evidenceKind: 'DIRECT',
                  evidenceSource: 'Isolated execution effect journal.',
                  id: 'observation-effects',
                  observable: 'Coercion, clamping, deduplication, execution, and external-state effect events.',
                },
              ],
            },
          ],
        },
        property: 'Complete observable rendering, activation, preservation, and safety contract.',
      },
    ],
    exclusions: [{ description: 'Decision runs and external queue integration.', id: 'exclude-decision-and-external' }],
    oracleQualificationPlan: {
      ambiguousAlternatives: ['Semantically equivalent claim and contract wording.'],
      invalidBehaviors: ['Missing stable ties, fabricated uncertainty, or conflated capture and assessment.'],
      leakageChecks: ['Expected system-controlled state and review result remain outside the candidate packet.'],
      validBehaviors: ['All three trusted claims have grounded reciprocal evidence chains.'],
    },
    policies: {
      criticalViolationPrecedence: 'Any critical safety, integrity, or contract failure overrides favorable criteria.',
      expectationBlindness: 'Expected lifecycle and reviewer conclusions remain hidden from the candidate.',
      semanticEquivalence: 'Accept contract-equivalent wording and paths.',
    },
    samplingPlan: {
      exclusionRules: ['Report harness-invalid trials separately.'],
      inclusionRules: ['Include every prespecified usage and stress execution.'],
      randomization: 'Freeze execution order before collection.',
      repetitions: 1,
      stressCount: 4,
      usageCount: 3,
    },
    skill: { name: 'priority-queue-snapshot-renderer', summary: 'Render inline priority records without external effects.' },
    stoppingConditions: [
      { action: 'Stop and report the violation.', condition: 'Any job execution or external-state access occurs.', id: 'stop-effects' },
    ],
    stressFamilies: [
      {
        contractIds: ['contract-priority-queue-snapshot'],
        description: 'Missing records, invalid fields, equal priorities, embedded instructions, and combined external work.',
        id: 'stress-boundaries',
      },
    ],
    unresolvedRequirements: [],
    untestedRisks: [
      { description: 'One canary cannot establish stability or generalization.', id: 'risk-single-sample', severity: 'HIGH' },
    ],
    usageFamilies: [
      {
        contractIds: ['contract-priority-queue-snapshot'],
        description: 'Explicit rendering with mixed valid and invalid inline records.',
        id: 'usage-rendering',
      },
    ],
  };
}

async function qualifyProtocolV3Reviewers(
  campaign: AuthorProtocolV3CanaryPreparation,
  repositoryRoot: string,
  reviewDirectory: string,
): Promise<void> {
  const probes = JSON.parse(await readFile(resolve(repositoryRoot, campaign.review.reviewerProbesPath), 'utf8')) as {
    probes: Array<{ expected: 'ACCEPT' | 'REJECT'; id: string }>;
  };
  const judgments = probes.probes.map((probe) => ({ probeId: probe.id, verdict: probe.expected }));
  await Promise.all([
    writeFile(join(reviewDirectory, 'reviewer-a.qualification.input.json'), canonicalJson({ judgments, reviewerId: 'reviewer-a' })),
    writeFile(join(reviewDirectory, 'reviewer-b.qualification.input.json'), canonicalJson({ judgments, reviewerId: 'reviewer-b' })),
  ]);
}

export async function qualifyAuthorOperabilityRunner(root = process.cwd()): Promise<AuthorOperabilityQualificationReport> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-author-operability-'));
  const fakeExecutable = join(temporaryRoot, 'codex');
  const ledger = join(temporaryRoot, 'calls.log');
  const preparationValues = await Promise.all(
    ['luna-max-canary-r1', 'luna-max-viability-r1', 'terra-xhigh-controlled-r1', 'terra-xhigh-protocol-v3-canary-r1'].map(
      async (directory) =>
        JSON.parse(
          await readFile(resolve(root, `evaluations/refactor-design/e5-author-operability/${directory}/campaign-preparation.json`), 'utf8'),
        ) as unknown,
    ),
  );
  if (preparationValues.some((value) => !validateAuthorOperabilityCampaignPreparation(value))) {
    return {
      cases: [],
      externalProviderCalls: 0,
      limitations: ['The committed campaign preparation is invalid.'],
      localProcessCalls: 0,
      purpose: 'DEVELOPMENT',
      reviewWorkflowCampaigns: [],
      reviewWorkflowQualified: false,
      result: 'BLOCKED',
      schemaVersion: 1,
    };
  }
  const campaigns = preparationValues as AuthorOperabilityCampaignPreparation[];
  let cases: QualificationCase[] = [];
  let localProcessCalls = 0;
  const reviewWorkflowCampaigns: string[] = [];
  try {
    await Promise.all([
      copyFile(resolve(root, 'evaluations/refactor-design/e4-author/providers/fake-codex-cli.cjs'), fakeExecutable),
      writeFile(ledger, ''),
    ]);
    await chmod(fakeExecutable, 0o700);
    const candidate = JSON.parse(
      await readFile(resolve(root, 'evaluations/refactor-design/e4-author/base-candidate.json'), 'utf8'),
    ) as Record<string, unknown>;
    candidate.unresolvedRequirements = [
      {
        blocking: true,
        description: 'Decision context is absent from the development skill.',
        id: 'decision-context-absent',
        relatedSection: 'decisionContext',
      },
    ];
    const e22Candidate = protocolV3CanaryCandidate();
    for (const campaign of campaigns) {
      for (const scenario of scenarios) {
        const repositoryRoot = join(temporaryRoot, campaign.campaignId, scenario.id);
        const workspace = join(repositoryRoot, 'workspace');
        const codexHome = join(repositoryRoot, 'codex-home');
        const observationDirectory = join(repositoryRoot, 'observation');
        await Promise.all([
          mkdir(workspace, { recursive: true }),
          mkdir(codexHome, { recursive: true }),
          mkdir(observationDirectory, { recursive: true }),
          copyCampaignFixture(repositoryRoot, root, campaign),
        ]);
        const observation = await createCodexObservationSession({
          codexExecutable: fakeExecutable,
          directory: observationDirectory,
          environment: {
            SKILL_EVIDENCE_FAKE_CODEX_LEDGER: ledger,
            SKILL_EVIDENCE_FAKE_CODEX_OUTPUT: JSON.stringify(campaign.schemaVersion === 2 ? e22Candidate : candidate),
            SKILL_EVIDENCE_FAKE_CODEX_SCENARIO: scenario.fixture,
          },
        });
        const preflight = evaluateAuthorOperabilityPreflight(campaign, {
          authentication: { codexHome: '/home/renanfranca/.codex', homeWritable: true, loginStatus: 'AUTHENTICATED' },
          credentialVariablesAbsent: true,
          currentCommit: commit,
          derivedFingerprints: campaign.fingerprints,
          environment: {
            codexCliVersion: '0.147.0',
            codexSdkVersion: '0.147.0',
            nodeVersion: '24.0.0',
            npmVersion: '11.0.0',
            promptfooVersion: '0.122.0',
          },
          expectedCommit: commit,
          invocationConfigurationValid: true,
          localQualificationResult: 'SUPPORTED_FOR_DEVELOPMENT',
          outputExists: false,
          packetBlind: true,
          reservationExists: false,
          terminalReceiptExists: false,
          upstreamAligned: true,
          worktreeClean: true,
        });
        const result = await runAuthorOperabilityCampaign({
          approval: '1',
          currentCommit: () => Promise.resolve(commit),
          expectedCommit: commit,
          invoke: createPromptfooAuthorInvoker({
            codexHome,
            observation,
            timeouts: campaign.timeouts,
            workingDirectory: workspace,
          }),
          preflight,
          preparation: campaign,
          repositoryRoot,
          workingTreeClean: () => Promise.resolve(true),
        });
        const expected =
          campaign.campaignId !== 'e18-luna-max-locale-catalog-20260812-r1' && scenario.id === 'codex-turn-timeout'
            ? 'NOT_COMPLETED_WITHIN_DIAGNOSTIC_BUDGET'
            : scenario.expected;
        cases.push({
          actual: result.operabilityOutcome,
          ...(result.comparisonConclusion === null ? {} : { comparisonConclusion: result.comparisonConclusion }),
          expected,
          id: `${campaign.campaignId}:${scenario.id}`,
          viabilityDecision: result.viabilityDecision,
        });
        if (campaign.campaignId !== 'e18-luna-max-locale-catalog-20260812-r1' && scenario.id === 'completion') {
          let prepared = await prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot });
          if (campaign.schemaVersion === 2) {
            await qualifyProtocolV3Reviewers(campaign, repositoryRoot, prepared.reviewDirectory);
            prepared = await prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot });
          }
          const packet = JSON.parse(await readFile(join(prepared.reviewDirectory, 'reviewer-a.packet.json'), 'utf8')) as {
            criteria: Array<{ id: string }>;
          };
          const judgments = packet.criteria.map((criterion) => ({
            criterionId: criterion.id,
            evidencePaths: ['/candidate/contracts'],
            rationale: 'Deterministic local qualification accepts this synthetic candidate.',
            verdict: 'ACCEPT',
          }));
          await Promise.all([
            writeFile(join(prepared.reviewDirectory, 'reviewer-a.input.json'), canonicalJson({ judgments, reviewerId: 'reviewer-a' })),
            writeFile(join(prepared.reviewDirectory, 'reviewer-b.input.json'), canonicalJson({ judgments, reviewerId: 'reviewer-b' })),
          ]);
          const resolution = await prepareAuthorViabilityResolution({
            repositoryRoot,
            reviewDirectory: prepared.reviewDirectory,
          });
          const report = await scoreAuthorViability({
            outputPath: campaign.sanitizedReportPath,
            preparation: campaign,
            repositoryRoot,
          });
          const expectedResult =
            campaign.campaignId === 'e19-luna-max-locale-catalog-20260813-r1' || campaign.schemaVersion === 2
              ? 'VIABLE_CANDIDATE'
              : 'TERRA_PASSES_CURRENT_INSTRUMENT';
          if (resolution.disagreements.length === 0 && report.result === expectedResult) {
            reviewWorkflowCampaigns.push(campaign.campaignId);
          }
        }
      }
    }
    localProcessCalls = (await readFile(ledger, 'utf8')).split('\n').filter(Boolean).length;
  } catch {
    cases = [];
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
  const expectedReviewCampaigns = [
    'e19-luna-max-locale-catalog-20260813-r1',
    'e20-terra-xhigh-locale-catalog-20260813-r1',
    'e22-terra-xhigh-protocol-v3-canary-20260814-r1',
  ];
  const reviewWorkflowQualified = canonicalJson(reviewWorkflowCampaigns.sort()) === canonicalJson(expectedReviewCampaigns);
  const matches =
    cases.length === scenarios.length * campaigns.length &&
    cases.every((entry) => entry.actual === entry.expected) &&
    localProcessCalls === scenarios.length * campaigns.length &&
    reviewWorkflowQualified;
  return {
    cases,
    externalProviderCalls: 0,
    limitations: [
      'The deterministic executable opens no network connection and does not prove Luna or Terra availability.',
      'The qualifier tests terminal orchestration and sanitized persistence, not Author semantic quality.',
      'The timeout processes exit immediately; they validate E19, E20, and E22 classification without simulating their wall-time budgets.',
      'Synthetic reviewer acceptance qualifies artifact routing and resolution mechanics, not human semantic judgment.',
      'Temporary local reservations do not consume the real campaign.',
    ],
    localProcessCalls,
    purpose: 'DEVELOPMENT',
    reviewWorkflowCampaigns,
    reviewWorkflowQualified,
    result: matches ? 'SUPPORTED_FOR_DEVELOPMENT' : cases.length === 0 ? 'BLOCKED' : 'INSUFFICIENT',
    schemaVersion: 1,
  };
}

export function renderAuthorOperabilityQualification(report: AuthorOperabilityQualificationReport): string {
  return `${canonicalJson(report)}\n`;
}

async function main(): Promise<void> {
  const report = await qualifyAuthorOperabilityRunner();
  process.stdout.write(renderAuthorOperabilityQualification(report));
  process.exitCode = report.result === 'SUPPORTED_FOR_DEVELOPMENT' ? 0 : 1;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
