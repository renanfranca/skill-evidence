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
  await Promise.all([
    mkdir(resolve(root, campaign.skillPath), { recursive: true }),
    mkdir(dirname(resolve(root, campaign.oraclePath)), { recursive: true }),
  ]);
  await Promise.all([
    copyFile(resolve(sourceRoot, campaign.skillPath, 'SKILL.md'), resolve(root, campaign.skillPath, 'SKILL.md')),
    copyFile(resolve(sourceRoot, campaign.oraclePath), resolve(root, campaign.oraclePath)),
  ]);
}

export async function qualifyAuthorOperabilityRunner(root = process.cwd()): Promise<AuthorOperabilityQualificationReport> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-author-operability-'));
  const fakeExecutable = join(temporaryRoot, 'codex');
  const ledger = join(temporaryRoot, 'calls.log');
  const preparationValues = await Promise.all(
    ['luna-max-canary-r1', 'luna-max-viability-r1', 'terra-xhigh-controlled-r1'].map(
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
            SKILL_EVIDENCE_FAKE_CODEX_OUTPUT: JSON.stringify(candidate),
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
          const prepared = await prepareAuthorViabilityReview({ preparation: campaign, repositoryRoot });
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
            campaign.campaignId === 'e19-luna-max-locale-catalog-20260813-r1' ? 'VIABLE_CANDIDATE' : 'TERRA_PASSES_CURRENT_INSTRUMENT';
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
  const expectedReviewCampaigns = ['e19-luna-max-locale-catalog-20260813-r1', 'e20-terra-xhigh-locale-catalog-20260813-r1'];
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
      'The E19 timeout process exits immediately; it validates classification without simulating 30 minutes of wall time.',
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
