import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const skillRoot = join(process.cwd(), '.agents', 'skills', 'supervise-skill-evidence');
const execFileAsync = promisify(execFile);

type SupervisorContract = {
  activation?: { mode?: unknown; supervisorTask?: unknown };
  authority?: {
    consumedCampaigns?: { ids?: unknown; rule?: unknown };
    ordinary?: unknown;
    riskGated?: unknown;
  };
  conflictRule?: unknown;
  mergeApproval?: {
    bindings?: unknown;
    cardMustPrecedeApproval?: unknown;
    invalidateOnAnyBindingChange?: unknown;
    preCardFreshness?: unknown;
    targetBranchMovementDisposition?: unknown;
  };
  planApproval?: unknown;
  review?: {
    blockingSeverities?: unknown;
    reinforcedTopology?: unknown;
    standardTopology?: unknown;
    surfaceRouting?: unknown;
  };
  schemaVersion?: unknown;
  reviewedContentIdentity?: {
    activeExecPlanDiscovery?: unknown;
    canonicalEncoding?: unknown;
    deletionRepresentation?: unknown;
    digestAlgorithm?: unknown;
    failureSemantics?: unknown;
    format?: unknown;
    gitSources?: unknown;
    lineSeparator?: unknown;
    normalization?: unknown;
    pathSafety?: unknown;
    pathEncoding?: unknown;
    pathOrder?: unknown;
    regularFileBytes?: unknown;
    supportedModes?: unknown;
    symlinkBytes?: unknown;
    untrackedPolicy?: unknown;
  };
  stateMachine?: {
    orientationRule?: unknown;
    ordinaryFlow?: unknown;
    riskInterrupt?: unknown;
    states?: unknown;
    transitions?: unknown;
    userGates?: unknown;
  };
};

type YamlMapping = { [key: string]: boolean | string | YamlMapping };

function parseYamlMapping(source: string): YamlMapping {
  const root: YamlMapping = {};
  const stack: Array<{ indent: number; value: YamlMapping }> = [{ indent: -1, value: root }];

  for (const line of source.split('\n')) {
    if (line.trim().length === 0 || line.trimStart().startsWith('#')) continue;
    const match = /^(\s*)([a-z_]+):(?:\s+(.*))?$/u.exec(line);
    if (match === null || match[1] === undefined || match[2] === undefined) throw new Error('unsupported YAML structure');
    const indent = match[1].length;
    if (indent % 2 !== 0) throw new Error('unsupported YAML indentation');
    while (stack.at(-1)!.indent >= indent) stack.pop();
    const parent = stack.at(-1)?.value;
    if (parent === undefined || match[2] in parent) throw new Error('duplicate or invalid YAML key');
    const rawValue = match[3];

    if (rawValue === undefined || rawValue.length === 0) {
      const child: YamlMapping = {};
      parent[match[2]] = child;
      stack.push({ indent, value: child });
    } else if (rawValue === 'true' || rawValue === 'false') {
      parent[match[2]] = rawValue === 'true';
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
      parent[match[2]] = rawValue.slice(1, -1).replaceAll("''", "'");
    } else {
      throw new Error('unsupported YAML scalar');
    }
  }

  return root;
}

function metadataImplicitInvocation(metadata: YamlMapping): boolean | undefined {
  const value = (metadata.policy as YamlMapping | undefined)?.allow_implicit_invocation;
  return typeof value === 'boolean' ? value : undefined;
}

function markdownResourceLinks(markdown: string): string[] {
  return [...markdown.matchAll(/\[[^\]]+\]\((references\/[^)]+)\)/gu)]
    .map((match) => match[1])
    .filter((path): path is string => path !== undefined);
}

function authorityContractDiagnostics(contract: SupervisorContract, implicitInvocation: boolean | undefined): string[] {
  const diagnostics: string[] = [];
  const expectedStates = [
    'ORIENT',
    'PLAN',
    'WAIT_PLAN_APPROVAL',
    'IMPLEMENT',
    'VALIDATE',
    'REVIEW',
    'REMEDIATE',
    'WAIT_RISK_APPROVAL',
    'PUBLISH_DRAFT',
    'WAIT_MERGE_APPROVAL',
    'CLOSE',
  ];
  const expectedGates = ['WAIT_PLAN_APPROVAL', 'WAIT_RISK_APPROVAL', 'WAIT_MERGE_APPROVAL'];
  const expectedOrdinaryFlow = [
    'ORIENT',
    'PLAN',
    'WAIT_PLAN_APPROVAL',
    'IMPLEMENT',
    'VALIDATE',
    'REVIEW',
    'REMEDIATE',
    'PUBLISH_DRAFT',
    'WAIT_MERGE_APPROVAL',
    'CLOSE',
    'ORIENT',
  ];

  if (contract.schemaVersion !== 1) diagnostics.push('schema-version');
  if (contract.activation?.mode !== 'EXPLICIT_ONLY' || implicitInvocation !== false) diagnostics.push('implicit-activation');
  if (contract.conflictRule !== 'DENY_ON_CONFLICT') diagnostics.push('conflict-rule');
  if (JSON.stringify(contract.stateMachine?.states) !== JSON.stringify(expectedStates)) diagnostics.push('states');
  if (JSON.stringify(contract.stateMachine?.userGates) !== JSON.stringify(expectedGates)) diagnostics.push('user-gates');
  if (JSON.stringify(contract.stateMachine?.ordinaryFlow) !== JSON.stringify(expectedOrdinaryFlow)) diagnostics.push('ordinary-flow');

  return diagnostics;
}

function pinningContractDiagnostics(contract: SupervisorContract): string[] {
  const diagnostics: string[] = [];
  const ordinary = contract.authority?.ordinary as string[] | undefined;
  const riskGated = contract.authority?.riskGated as string[] | undefined;

  if (ordinary?.filter((action) => action === 'PIN_SUPERVISOR_TASK').length !== 1) diagnostics.push('pin-authority');
  if (riskGated?.includes('PIN_SUPERVISOR_TASK') === true) diagnostics.push('pin-risk-gated');
  if (
    JSON.stringify(contract.activation?.supervisorTask) !==
    JSON.stringify({
      multiplicity: 'ONE',
      firstExplicitActivation: 'PIN_BEFORE_WORKFLOW_ACTION',
      unpinnedContinuation: 'REORIENT_AND_REPIN_BEFORE_CONTINUING',
    })
  ) {
    diagnostics.push('pin-lifecycle');
  }

  return diagnostics;
}

function safetyContractDiagnostics(contract: SupervisorContract): string[] {
  const diagnostics: string[] = [];
  const expectedOrdinary = [
    'PIN_SUPERVISOR_TASK',
    'CREATE_OR_RESUME_SUPERVISOR_GOAL',
    'EDIT_APPROVED_REPOSITORY_SCOPE',
    'RUN_PROVIDER_FREE_CHECKS',
    'CREATE_ISOLATED_WORKTREE_OR_BRANCH',
    'DELEGATE_BOUNDED_SUBAGENTS',
    'COMMIT_APPROVED_SCOPE',
    'PUSH_BRANCH',
    'CREATE_OR_UPDATE_DRAFT_PR',
    'READ_GITHUB_STATE',
  ];
  const expectedRiskGated = [
    'MODEL_BACKED_OR_PAID_INVOCATION',
    'CREDENTIAL_OR_PERMISSION_CHANGE',
    'DESTRUCTIVE_OR_IRRECOVERABLE_ACTION',
    'WRITE_OUTSIDE_APPROVED_REPOSITORY',
    'PRODUCTION_DATA_MUTATION',
    'EXTERNAL_SCHEMA_MIGRATION',
    'RELEASE_OR_DEPLOYMENT',
    'SECURITY_BOUNDARY_RELAXATION',
    'MATERIAL_UNAPPROVED_SCOPE_CHANGE',
  ];
  const expectedConsumedCampaigns = [
    'e5-author-benchmark-20260811-r1',
    'e18-luna-max-locale-catalog-20260812-r1',
    'e19-luna-max-locale-catalog-20260813-r1',
    'e20-terra-xhigh-locale-catalog-20260813-r1',
  ];
  const expectedReinforcedSurfaces = [
    'SCHEMA',
    'PUBLIC_API',
    'COMPATIBILITY',
    'MIGRATIONS',
    'SECURITY',
    'AUTHENTICATION',
    'AUTHORIZATION',
    'CREDENTIALS',
    'SENSITIVE_DATA',
    'PERSISTENCE',
    'PROVENANCE',
    'IDENTITY',
    'LIFECYCLE',
    'RESERVATIONS',
    'BUDGETS',
    'STOPPING_RULES',
    'PROVIDER_ADAPTERS',
    'MODEL_BACKED_EXECUTION',
    'CAMPAIGN_MECHANICS',
    'EXTERNAL_WRITES',
    'RELEASE',
    'DEPLOYMENT',
    'CROSS_CUTTING_EVIDENCE_ARCHITECTURE',
    'GOVERNANCE_FOR_ANY_REINFORCED_SURFACE',
  ];
  const surfaceRouting = contract.review?.surfaceRouting as Array<{ mode?: unknown; surface?: unknown }> | undefined;

  if (JSON.stringify(contract.authority?.ordinary) !== JSON.stringify(expectedOrdinary)) diagnostics.push('ordinary-authority');
  if (JSON.stringify(contract.authority?.riskGated) !== JSON.stringify(expectedRiskGated)) diagnostics.push('risk-authority');
  if (contract.authority?.consumedCampaigns?.rule !== 'NEVER_RERUN') diagnostics.push('consumed-campaign-rule');
  if (JSON.stringify(contract.authority?.consumedCampaigns?.ids) !== JSON.stringify(expectedConsumedCampaigns)) {
    diagnostics.push('consumed-campaigns');
  }
  if (JSON.stringify(contract.review?.standardTopology) !== JSON.stringify(['FRESH_REVIEWER', 'SUPERVISOR_RECONCILIATION'])) {
    diagnostics.push('standard-topology');
  }
  if (
    JSON.stringify(contract.review?.reinforcedTopology) !== JSON.stringify(['FRESH_REVIEWER_A', 'FRESH_REVIEWER_B', 'FRESH_CONSOLIDATOR'])
  ) {
    diagnostics.push('reinforced-topology');
  }
  if (JSON.stringify(contract.review?.blockingSeverities) !== JSON.stringify(['P0', 'P1', 'P2'])) {
    diagnostics.push('blocking-severities');
  }
  if (
    JSON.stringify(surfaceRouting?.map(({ surface }) => surface)) !== JSON.stringify(expectedReinforcedSurfaces) ||
    surfaceRouting?.some(({ mode }) => mode !== 'REINFORCED')
  ) {
    diagnostics.push('reinforced-routing');
  }
  if (contract.mergeApproval?.cardMustPrecedeApproval !== true) diagnostics.push('merge-card-order');

  return diagnostics;
}

type MergeEvidence = {
  baseBranch: string;
  baseTipSha: string;
  candidateMergeTreeOid: string;
  featureHeadSha: string;
  findingDisposition: string;
  mergeability: string;
  pullRequest: string;
  requiredChecks: string;
  reviewTopology: string;
};

function mergeApprovalDiagnostics(contract: SupervisorContract): string[] {
  const diagnostics: string[] = [];
  const expectedBindings = [
    { id: 'PULL_REQUEST', field: 'pullRequest' },
    { id: 'BASE_BRANCH', field: 'baseBranch' },
    { id: 'BASE_TIP_SHA', field: 'baseTipSha' },
    { id: 'FEATURE_HEAD_SHA', field: 'featureHeadSha' },
    { id: 'CANDIDATE_MERGE_TREE_OID', field: 'candidateMergeTreeOid' },
    { id: 'REQUIRED_CHECKS', field: 'requiredChecks' },
    { id: 'REVIEW_TOPOLOGY', field: 'reviewTopology' },
    { id: 'FINDING_DISPOSITION', field: 'findingDisposition' },
    { id: 'MERGEABILITY', field: 'mergeability' },
  ];

  if (JSON.stringify(contract.mergeApproval?.bindings) !== JSON.stringify(expectedBindings)) diagnostics.push('merge-bindings');
  if (contract.mergeApproval?.invalidateOnAnyBindingChange !== true) diagnostics.push('stale-merge-approval');
  if (contract.mergeApproval?.targetBranchMovementDisposition !== 'RETURN_TO_PROPORTIONATE_VALIDATION_AND_REVIEW') {
    diagnostics.push('target-branch-movement');
  }

  return diagnostics;
}

function mergeApprovalIsCurrent(contract: SupervisorContract, approved: MergeEvidence, current: MergeEvidence): boolean {
  if (mergeApprovalDiagnostics(contract).length > 0 || contract.mergeApproval?.cardMustPrecedeApproval !== true) return false;

  return (contract.mergeApproval.bindings as Array<{ field: keyof MergeEvidence }>).every(
    ({ field }) => approved[field] === current[field],
  );
}

type PreCardMergeEvidence = {
  candidateMergeTreeOid: string;
  currentBaseTipSha: string;
  derivedCandidateMergeTreeOid: string;
  featureHeadMaterialIdentity: string;
  featureHeadSha: string;
  hostedChecks: 'GREEN';
  reviewBaseTipSha: string;
  reviewContentIdentity: string;
  reviewedBaseTipSha: string;
  reviewedContentIdentity: string;
  validatedBaseTipSha: string;
  validatedContentIdentity: string;
};

function preCardMergeContextDiagnostics(contract: SupervisorContract, evidence: PreCardMergeEvidence): string[] {
  const diagnostics: string[] = [];
  const expectedContract = {
    baseTipEqualities: ['CURRENT_BASE_TIP_SHA', 'VALIDATED_BASE_TIP_SHA', 'REVIEWED_CONTENT_BASE_TIP_SHA', 'REVIEW_RESULT_BASE_TIP_SHA'],
    materialIdentityEqualities: [
      'REVIEWED_CONTENT_IDENTITY',
      'VALIDATED_CONTENT_IDENTITY',
      'FEATURE_HEAD_MATERIAL_IDENTITY',
      'REVIEW_RESULT_CONTENT_IDENTITY',
    ],
    candidateMergeTree: {
      derivation: 'GIT_MERGE_TREE_WRITE_TREE',
      inputs: ['CURRENT_BASE_TIP_SHA', 'FEATURE_HEAD_SHA'],
      result: 'CANDIDATE_MERGE_TREE_OID',
    },
    hostedGreenReuse: 'FORBIDDEN_ACROSS_BINDING_CHANGE',
    mismatchDisposition: ['VALIDATE', 'REVIEW'],
  };

  if (JSON.stringify(contract.mergeApproval?.preCardFreshness) !== JSON.stringify(expectedContract)) {
    diagnostics.push('merge-context-contract');
    return diagnostics;
  }
  if (
    evidence.currentBaseTipSha !== evidence.validatedBaseTipSha ||
    evidence.currentBaseTipSha !== evidence.reviewedBaseTipSha ||
    evidence.currentBaseTipSha !== evidence.reviewBaseTipSha
  ) {
    diagnostics.push('stale-pre-card-base');
  }
  if (
    evidence.reviewedContentIdentity !== evidence.validatedContentIdentity ||
    evidence.reviewedContentIdentity !== evidence.featureHeadMaterialIdentity ||
    evidence.reviewedContentIdentity !== evidence.reviewContentIdentity
  ) {
    diagnostics.push('stale-pre-card-content');
  }
  if (evidence.candidateMergeTreeOid !== evidence.derivedCandidateMergeTreeOid) {
    diagnostics.push('stale-pre-card-candidate-tree');
  }

  return diagnostics;
}

function stateTransitionDiagnostics(contract: SupervisorContract): string[] {
  const diagnostics: string[] = [];
  const expectedTransitions = [
    ['ORIENT', 'PLAN', 'NO_DECISION_COMPLETE_APPROVED_PLAN'],
    ['PLAN', 'WAIT_PLAN_APPROVAL', 'DECISION_COMPLETE_PLAN_PENDING_APPROVAL'],
    ['WAIT_PLAN_APPROVAL', 'IMPLEMENT', 'CURRENT_REVISION_APPROVED'],
    ['WAIT_PLAN_APPROVAL', 'PLAN', 'REVISIONS_REQUESTED'],
    ['IMPLEMENT', 'VALIDATE', 'IMPLEMENTATION_COMPLETE'],
    ['VALIDATE', 'IMPLEMENT', 'CHECK_FAILED'],
    ['VALIDATE', 'REVIEW', 'PROVIDER_FREE_CHECKS_GREEN'],
    ['REVIEW', 'REMEDIATE', 'BLOCKING_FINDING'],
    ['REVIEW', 'PUBLISH_DRAFT', 'NO_BLOCKING_FINDING'],
    ['REMEDIATE', 'VALIDATE', 'REMEDIATION_COMPLETE'],
    ['PUBLISH_DRAFT', 'VALIDATE', 'MATERIAL_CONTENT_CHANGED'],
    ['PUBLISH_DRAFT', 'IMPLEMENT', 'HOSTED_CHECK_FAILED'],
    ['PUBLISH_DRAFT', 'WAIT_MERGE_APPROVAL', 'HOSTED_CHECKS_GREEN'],
    ['WAIT_MERGE_APPROVAL', 'CLOSE', 'EXACT_CURRENT_CARD_APPROVED'],
    ['CLOSE', 'ORIENT', 'MERGE_VERIFIED'],
  ];
  const transitions = contract.stateMachine?.transitions as Array<{ from?: unknown; to?: unknown; when?: unknown }> | undefined;

  if (contract.stateMachine?.orientationRule !== 'SELECT_FURTHEST_STATE_WITH_PROVEN_CUMULATIVE_PREREQUISITES') {
    diagnostics.push('orientation-rule');
  }
  if (
    transitions?.some(
      ({ from, to, when }) => to === 'CLOSE' && !(from === 'WAIT_MERGE_APPROVAL' && when === 'EXACT_CURRENT_CARD_APPROVED'),
    ) === true
  ) {
    diagnostics.push('automatic-pre-card-merge');
  }
  if (JSON.stringify(transitions?.map(({ from, to, when }) => [from, to, when])) !== JSON.stringify(expectedTransitions)) {
    diagnostics.push('transitions');
  }
  if (
    JSON.stringify(contract.stateMachine?.riskInterrupt) !==
    JSON.stringify({
      state: 'WAIT_RISK_APPROVAL',
      entersBefore: 'ANY_RISK_GATED_ACTION',
      approvedDisposition: 'REORIENT_TO_FURTHEST_PROVEN_SAFE_STATE',
      declinedDisposition: 'RETURN_TO_SAFEST_EARLIER_STATE',
    })
  ) {
    diagnostics.push('risk-interrupt');
  }

  return diagnostics;
}

function publicationChangeDiagnostics(contract: SupervisorContract): string[] {
  const transitions = contract.stateMachine?.transitions as Array<{ from?: unknown; to?: unknown; when?: unknown }> | undefined;
  const materialChangeTransitions = transitions?.filter(
    ({ from, when }) => from === 'PUBLISH_DRAFT' && when === 'MATERIAL_CONTENT_CHANGED',
  );

  return JSON.stringify(materialChangeTransitions) ===
    JSON.stringify([{ from: 'PUBLISH_DRAFT', to: 'VALIDATE', when: 'MATERIAL_CONTENT_CHANGED' }])
    ? []
    : ['publication-change-bypasses-validation'];
}

type PlanApprovalEvidence = {
  approvalStatus: 'APPROVED' | 'PENDING';
  approvedRevision: number | null;
  currentRevision: number;
  implementationRequested: boolean;
  materialChange: boolean;
  previousRevision: number;
  selectedState: 'IMPLEMENT' | 'WAIT_PLAN_APPROVAL';
};

function planApprovalDiagnostics(contract: SupervisorContract, evidence: PlanApprovalEvidence): string[] {
  const diagnostics: string[] = [];
  const expectedContract = {
    revisionType: 'POSITIVE_INTEGER',
    statuses: ['PENDING', 'APPROVED'],
    materialChangeEffects: ['INCREMENT_REVISION', 'SET_PENDING', 'SELECT_WAIT_PLAN_APPROVAL'],
    materialSections: [
      'PURPOSE',
      'SCOPE',
      'DESIRED_END_STATE',
      'MILESTONES',
      'AUTHORITY_BOUNDARIES',
      'VALIDATION_ACCEPTANCE',
      'ROLLOUT_OR_RECOVERY',
      'EXISTING_MATERIAL_DECISION',
    ],
    implementationPrecondition: ['EXACT_CURRENT_REVISION', 'APPROVED'],
    executionEvidenceRevisionEffect: 'NONE',
  };

  if (JSON.stringify(contract.planApproval) !== JSON.stringify(expectedContract)) {
    diagnostics.push('plan-approval-contract');
    return diagnostics;
  }
  if (evidence.materialChange) {
    if (evidence.currentRevision !== evidence.previousRevision + 1) diagnostics.push('material-revision-reuse');
    if (evidence.approvalStatus !== 'PENDING' || evidence.selectedState !== 'WAIT_PLAN_APPROVAL') {
      diagnostics.push('material-change-gate');
    }
  }
  if (
    evidence.implementationRequested &&
    (evidence.approvalStatus !== 'APPROVED' ||
      evidence.approvedRevision !== evidence.currentRevision ||
      evidence.selectedState !== 'IMPLEMENT')
  ) {
    diagnostics.push('pending-implementation-bypass');
  }

  return diagnostics;
}

type ReviewedContentEntry = {
  contentSha256: string | null;
  mode: '100644' | '100755' | '120000' | null;
  path: string;
  status: 'ADDED' | 'DELETED' | 'MODIFIED';
};

type ReviewedContentOutput = {
  canonicalManifest?: unknown;
  identity?: unknown;
  manifest?: {
    activeExecPlan?: unknown;
    baseCommit?: unknown;
    digestAlgorithm?: unknown;
    encoding?: unknown;
    entries?: unknown;
    format?: unknown;
    lineSeparator?: unknown;
    normalizationVersion?: unknown;
    pathEncoding?: unknown;
    pathOrder?: unknown;
  };
};

function reviewedContentOutputDiagnostics(output: ReviewedContentOutput, expectedPaths: string[]): string[] {
  const diagnostics: string[] = [];
  const manifest = output.manifest;
  const entries = manifest?.entries as ReviewedContentEntry[] | undefined;

  if (
    manifest?.format !== 'skill-evidence-reviewed-material/v1' ||
    manifest.digestAlgorithm !== 'sha256' ||
    manifest.encoding !== 'UTF-8' ||
    manifest.lineSeparator !== 'LF' ||
    manifest.pathEncoding !== 'UTF-8' ||
    manifest.pathOrder !== 'UTF8_BYTEWISE_ASCENDING' ||
    manifest.normalizationVersion !== 'skill-evidence-execplan-evidence-normalization/v1'
  ) {
    diagnostics.push('manifest-header');
  }
  if (!Array.isArray(entries) || JSON.stringify(entries.map(({ path }) => path)) !== JSON.stringify(expectedPaths)) {
    diagnostics.push('manifest-paths');
  }

  if (manifest !== undefined) {
    const canonicalManifest = `${JSON.stringify(manifest)}\n`;
    if (output.canonicalManifest !== canonicalManifest) diagnostics.push('manifest-serialization');
    const expectedIdentity = `sha256:${createHash('sha256').update(canonicalManifest, 'utf8').digest('hex')}`;
    if (output.identity !== expectedIdentity) diagnostics.push('identity');
  } else {
    diagnostics.push('manifest-serialization', 'identity');
  }

  return diagnostics;
}

async function git(repositoryRoot: string, args: string[]): Promise<string> {
  return (await execFileAsync('git', args, { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim();
}

async function runReviewedContentIdentity(
  repositoryRoot: string,
  baseCommit: string,
): Promise<{ output: ReviewedContentOutput; stdout: string }> {
  const result = await execFileAsync(
    process.execPath,
    [join(skillRoot, 'scripts', 'reviewed-content-identity.mjs'), '--repo', repositoryRoot, '--base', baseCommit],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { output: JSON.parse(result.stdout) as ReviewedContentOutput, stdout: result.stdout };
}

async function runReviewedContentIdentityFailure(
  repositoryRoot: string,
  baseCommit: string,
): Promise<{ code?: number; stderr?: string; stdout?: string } | undefined> {
  try {
    await execFileAsync(
      process.execPath,
      [join(skillRoot, 'scripts', 'reviewed-content-identity.mjs'), '--repo', repositoryRoot, '--base', baseCommit],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );
  } catch (error) {
    return error as { code?: number; stderr?: string; stdout?: string };
  }

  return undefined;
}

function reviewedContentContractDiagnostics(contract: SupervisorContract): string[] {
  const diagnostics: string[] = [];
  const identity = contract.reviewedContentIdentity;
  const expectedGitSources = {
    base: ['git', 'ls-tree', '-r', '-z', '--full-tree', '<base-commit>'],
    trackedAndStaged: ['git', 'ls-files', '--stage', '-z'],
    untracked: ['git', 'ls-files', '--others', '--exclude-standard', '-z'],
    status: ['git', 'status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames'],
  };
  const expectedNormalization = {
    version: 'skill-evidence-execplan-evidence-normalization/v1',
    sections: [
      { heading: 'Supervisor Record', marker: '<!-- skill-evidence-normalized:supervisor-record:v1 -->' },
      { heading: 'Progress', marker: '<!-- skill-evidence-normalized:progress:v1 -->' },
      { heading: 'Lessons Learned', marker: '<!-- skill-evidence-normalized:lessons-learned:v1 -->' },
    ],
  };

  if (
    identity?.format !== 'skill-evidence-reviewed-material/v1' ||
    identity.digestAlgorithm !== 'sha256' ||
    identity.canonicalEncoding !== 'UTF-8' ||
    identity.pathEncoding !== 'UTF-8' ||
    identity.pathOrder !== 'UTF8_BYTEWISE_ASCENDING' ||
    identity.lineSeparator !== 'LF'
  ) {
    diagnostics.push('identity-format');
  }
  if (JSON.stringify(identity?.gitSources) !== JSON.stringify(expectedGitSources)) diagnostics.push('git-sources');
  if (identity?.untrackedPolicy !== 'INCLUDE_NON_IGNORED') diagnostics.push('untracked-policy');
  if (JSON.stringify(identity?.supportedModes) !== JSON.stringify(['100644', '100755', '120000'])) diagnostics.push('modes');
  if (identity?.regularFileBytes !== 'RAW_BYTES' || identity.symlinkBytes !== 'RAW_LINK_TARGET_BYTES') {
    diagnostics.push('content-bytes');
  }
  if (
    JSON.stringify(identity?.pathSafety) !==
    JSON.stringify({
      ancestorSymlinks: 'REJECT_BEFORE_CONTENT_READ',
      prefixCollisions: 'REJECT_BEFORE_CONTENT_READ',
      leafSymlinks: 'HASH_RAW_LINK_TARGET_BYTES',
    })
  ) {
    diagnostics.push('path-safety');
  }
  if (JSON.stringify(identity?.deletionRepresentation) !== JSON.stringify({ mode: null, contentSha256: null })) {
    diagnostics.push('deletion');
  }
  if (
    JSON.stringify(identity?.activeExecPlanDiscovery) !==
    JSON.stringify({ indexPath: 'docs/execplans/README.md', statusPrefix: 'Active:', requiredMatches: 1 })
  ) {
    diagnostics.push('execplan-discovery');
  }
  if (JSON.stringify(identity?.normalization) !== JSON.stringify(expectedNormalization)) diagnostics.push('normalization');
  if (identity?.failureSemantics !== 'FAIL_CLOSED_WITH_NONZERO_EXIT_AND_NO_MANIFEST') diagnostics.push('failure-semantics');

  return diagnostics;
}

describe('skill-evidence delivery supervisor', () => {
  it('pins the one explicit supervisor task as ordinary authority before workflow action', async () => {
    const [skill, policy, contractText] = await Promise.all([
      readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;

    expect(pinningContractDiagnostics(contract)).toEqual([]);
    expect(skill).toContain('Pin this one supervisor task before any workflow action');
    expect(skill.indexOf('Pin this one supervisor task')).toBeLessThan(skill.indexOf('Read the applicable repository instructions'));
    expect(policy).toContain('If the supervisor task is unpinned, re-enter `ORIENT` and pin it before continuing.');

    const missingPin = structuredClone(contract);
    missingPin.authority = {
      ...missingPin.authority,
      ordinary: (missingPin.authority?.ordinary as string[]).filter((action) => action !== 'PIN_SUPERVISOR_TASK'),
    };
    expect(pinningContractDiagnostics(missingPin)).toContain('pin-authority');

    const riskGatedPin = structuredClone(contract);
    riskGatedPin.authority = {
      ...riskGatedPin.authority,
      riskGated: [...(riskGatedPin.authority?.riskGated as string[]), 'PIN_SUPERVISOR_TASK'],
    };
    expect(pinningContractDiagnostics(riskGatedPin)).toContain('pin-risk-gated');
  });

  it('is an explicit repo-local skill with a one-action activation prompt', async () => {
    const [skill, metadata, contractText] = await Promise.all([
      readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
      readFile(join(skillRoot, 'agents', 'openai.yaml'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;
    const parsedMetadata = parseYamlMapping(metadata);

    expect(skill).toMatch(/^---\nname: supervise-skill-evidence\n/);
    expect(metadata).toContain('$supervise-skill-evidence');
    expect(metadata).toContain('the next delivery increment');
    expect(authorityContractDiagnostics(contract, metadataImplicitInvocation(parsedMetadata))).toEqual([]);

    const implicitActivation = structuredClone(parsedMetadata);
    (implicitActivation.policy as YamlMapping).allow_implicit_invocation = true;
    expect(authorityContractDiagnostics(contract, metadataImplicitInvocation(implicitActivation))).toContain('implicit-activation');
    expect(() => parseYamlMapping(`${metadata}\npolicy:\n  allow_implicit_invocation: true\n`)).toThrow('duplicate');

    const fourthGate = structuredClone(contract);
    fourthGate.stateMachine = {
      ...fourthGate.stateMachine,
      userGates: [...(fourthGate.stateMachine?.userGates as string[]), 'WAIT_PUBLICATION_APPROVAL'],
    };
    expect(authorityContractDiagnostics(fourthGate, false)).toContain('user-gates');
  });

  it('reconstructs state from durable evidence and reserves exactly three user gates', async () => {
    const policy = await readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8');
    const stateRows = [...policy.matchAll(/^\| `([A-Z_]+)`\s+\|/gm)]
      .map((match) => match[1])
      .filter((state): state is string => state !== undefined);

    expect(policy).toContain('Repository truth is authoritative');
    expect(policy).toContain('`WAIT_PLAN_APPROVAL`');
    expect(policy).toContain('`WAIT_RISK_APPROVAL`');
    expect(policy).toContain('`WAIT_MERGE_APPROVAL`');
    expect(policy).toContain('Do not add another user gate');
    expect(policy).toMatch(/AGENTS\.md[\s\S]*Git[\s\S]*ExecPlan[\s\S]*pull request[\s\S]*CI/);
    expect(policy).toContain('Do not ask the user for evidence you can discover');
    expect(policy).toContain('Contract revision');
    expect(policy).toContain('sets approval status to `PENDING`, and selects `WAIT_PLAN_APPROVAL`');
    expect(stateRows.filter((state) => state.startsWith('WAIT_'))).toEqual([
      'WAIT_PLAN_APPROVAL',
      'WAIT_RISK_APPROVAL',
      'WAIT_MERGE_APPROVAL',
    ]);
    expect(policy).toContain('Select the furthest state whose cumulative prerequisites are proven');
    expect(policy).toContain('Supervisor Record');
  });

  it('discriminates material plan revisions and denies reuse or PENDING implementation bypass', async () => {
    const [contractText, policy] = await Promise.all([
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;
    const approvedCurrent: PlanApprovalEvidence = {
      approvalStatus: 'APPROVED',
      approvedRevision: 2,
      currentRevision: 2,
      implementationRequested: true,
      materialChange: false,
      previousRevision: 1,
      selectedState: 'IMPLEMENT',
    };

    expect(planApprovalDiagnostics(contract, approvedCurrent)).toEqual([]);
    expect(policy).toContain('Implementation requires `APPROVED` for the exact current positive-integer revision.');

    const revisionReuse: PlanApprovalEvidence = {
      ...approvedCurrent,
      approvalStatus: 'PENDING',
      approvedRevision: 1,
      implementationRequested: false,
      materialChange: true,
      currentRevision: 1,
      previousRevision: 1,
      selectedState: 'WAIT_PLAN_APPROVAL',
    };
    expect(planApprovalDiagnostics(contract, revisionReuse)).toContain('material-revision-reuse');

    const pendingBypass: PlanApprovalEvidence = {
      ...approvedCurrent,
      approvalStatus: 'PENDING',
      approvedRevision: 2,
      currentRevision: 3,
      materialChange: true,
      previousRevision: 2,
      selectedState: 'IMPLEMENT',
    };
    expect(planApprovalDiagnostics(contract, pendingBypass)).toContain('pending-implementation-bypass');
  });

  it('delegates implementation and risk-proportional review without replacing evidence with consensus', async () => {
    const policy = await readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8');

    expect(policy).toContain('fresh implementation subagent');
    expect(policy).toContain('one fresh reviewer');
    expect(policy).toContain('two independent fresh reviewers');
    expect(policy).toContain('fresh consolidator');
    expect(policy).toContain('Do not decide by vote');
    expect(policy).toContain('tracked, staged, unstaged, and untracked changed files');
    expect(policy).toContain('reviewed content identity');
    expect(policy).toContain("active ExecPlan's complete `Supervisor Record`, `Progress`, and `Lessons Learned`");
    expect(policy).toContain('Governance text that grants, narrows, or routes authority');
    expect(policy).toMatch(/schema[\s\S]*API[\s\S]*security[\s\S]*authentication[\s\S]*persistence[\s\S]*provenance/);
    expect(policy).toContain('P0, P1, and P2 findings block');
    expect(policy).toContain('P3 findings are advisory');
  });

  it('structurally denies unsafe authority, campaign, review, and merge routes', async () => {
    const contract = JSON.parse(await readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8')) as SupervisorContract;

    expect(safetyContractDiagnostics(contract)).toEqual([]);

    const automaticMerge = structuredClone(contract);
    automaticMerge.mergeApproval = { ...automaticMerge.mergeApproval, cardMustPrecedeApproval: false };
    expect(safetyContractDiagnostics(automaticMerge)).toContain('merge-card-order');

    const rerunConsumedCampaign = structuredClone(contract);
    rerunConsumedCampaign.authority = {
      ...rerunConsumedCampaign.authority,
      consumedCampaigns: { ...rerunConsumedCampaign.authority?.consumedCampaigns, rule: 'RISK_APPROVAL_CAN_RERUN' },
    };
    expect(safetyContractDiagnostics(rerunConsumedCampaign)).toContain('consumed-campaign-rule');

    const standardReviewForIdentity = structuredClone(contract);
    const identityRoute = (standardReviewForIdentity.review?.surfaceRouting as Array<{ mode: string; surface: string }>).find(
      ({ surface }) => surface === 'IDENTITY',
    );
    identityRoute!.mode = 'STANDARD';
    expect(safetyContractDiagnostics(standardReviewForIdentity)).toContain('reinforced-routing');
  });

  it('invalidates merge approval when the base tip or candidate merge tree changes', async () => {
    const contract = JSON.parse(await readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8')) as SupervisorContract;
    const approved: MergeEvidence = {
      baseBranch: 'main',
      baseTipSha: '1'.repeat(40),
      candidateMergeTreeOid: '2'.repeat(40),
      featureHeadSha: '3'.repeat(40),
      findingDisposition: 'P0-P2_NONE',
      mergeability: 'MERGEABLE',
      pullRequest: 'https://github.example/pull/22',
      requiredChecks: 'GREEN',
      reviewTopology: 'REINFORCED_COMPLETE',
    };

    expect(mergeApprovalDiagnostics(contract)).toEqual([]);
    expect(mergeApprovalIsCurrent(contract, approved, structuredClone(approved))).toBe(true);

    const movedBase = { ...approved, baseTipSha: '4'.repeat(40) };
    expect(mergeApprovalIsCurrent(contract, approved, movedBase)).toBe(false);

    const changedCandidateMergeTree = { ...approved, candidateMergeTreeOid: '5'.repeat(40) };
    expect(mergeApprovalIsCurrent(contract, approved, changedCandidateMergeTree)).toBe(false);
  });

  it('rejects stale base, review identity, or candidate merge context before the first merge card', async () => {
    const [contractText, policy] = await Promise.all([
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;
    const current: PreCardMergeEvidence = {
      candidateMergeTreeOid: '1'.repeat(40),
      currentBaseTipSha: '2'.repeat(40),
      derivedCandidateMergeTreeOid: '1'.repeat(40),
      featureHeadMaterialIdentity: 'sha256:reviewed',
      featureHeadSha: '3'.repeat(40),
      hostedChecks: 'GREEN',
      reviewBaseTipSha: '2'.repeat(40),
      reviewContentIdentity: 'sha256:reviewed',
      reviewedBaseTipSha: '2'.repeat(40),
      reviewedContentIdentity: 'sha256:reviewed',
      validatedBaseTipSha: '2'.repeat(40),
      validatedContentIdentity: 'sha256:reviewed',
    };

    expect(preCardMergeContextDiagnostics(contract, current)).toEqual([]);
    expect(policy).toContain('Hosted GREEN never combines an old validation or review with a moved target tip.');
    expect(policy).toContain('`git merge-tree --write-tree <base-tip> <feature-head>`');

    const movedTarget = { ...current, currentBaseTipSha: '4'.repeat(40) };
    expect(movedTarget.hostedChecks).toBe('GREEN');
    expect(preCardMergeContextDiagnostics(contract, movedTarget)).toContain('stale-pre-card-base');

    const changedTree = { ...current, candidateMergeTreeOid: '5'.repeat(40) };
    expect(preCardMergeContextDiagnostics(contract, changedTree)).toContain('stale-pre-card-candidate-tree');

    const staleReview = { ...current, reviewContentIdentity: 'sha256:old-review' };
    expect(preCardMergeContextDiagnostics(contract, staleReview)).toContain('stale-pre-card-content');
  });

  it('expires GREEN and returns publication-time material changes through validation before review', async () => {
    const [contractText, policy] = await Promise.all([
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;

    expect(publicationChangeDiagnostics(contract)).toEqual([]);
    expect(policy).toContain('A publication-time material content change expires GREEN and returns to `VALIDATE` before `REVIEW`.');

    const directReview = structuredClone(contract);
    const transition = (directReview.stateMachine?.transitions as Array<{ from: string; to: string; when: string }>).find(
      ({ from, when }) => from === 'PUBLISH_DRAFT' && when === 'MATERIAL_CONTENT_CHANGED',
    );
    transition!.to = 'REVIEW';
    expect(publicationChangeDiagnostics(directReview)).toContain('publication-change-bypasses-validation');
  });

  it('makes fresh agents consume the exact machine state contract with deny-on-conflict precedence', async () => {
    const [skill, contractText] = await Promise.all([
      readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;

    expect(markdownResourceLinks(skill)).toEqual(['references/supervisor-contract.json', 'references/supervisor-policy.md']);
    expect(skill).toContain('If the sources conflict, apply the contract deny rule and stop before the disputed action.');
    expect(stateTransitionDiagnostics(contract)).toEqual([]);

    const automaticPreCardMerge = structuredClone(contract);
    (automaticPreCardMerge.stateMachine?.transitions as Array<{ from: string; to: string; when: string }>).push({
      from: 'PUBLISH_DRAFT',
      to: 'CLOSE',
      when: 'DRAFT_PUBLISHED',
    });
    expect(stateTransitionDiagnostics(automaticPreCardMerge)).toContain('automatic-pre-card-merge');
  });

  it('deterministically identifies all reviewed material while normalizing only living execution evidence', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-reviewed-content-'));

    try {
      await mkdir(join(repositoryRoot, 'docs', 'execplans'), { recursive: true });
      await Promise.all([
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'README.md'),
          '| Plan | Status |\n| --- | --- |\n| [Fixture](fixture.md) | Active: implementation |\n',
        ),
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
          '# Fixture\n\n## Supervisor Record\n\n- State: IMPLEMENT\n\n## Scope\n\nMaterial scope.\n\n## Progress\n\n- [ ] Work\n\n## Lessons Learned\n\n- Initial.\n',
        ),
        writeFile(join(repositoryRoot, 'material.txt'), 'base material\n'),
        writeFile(join(repositoryRoot, 'deleted.txt'), 'delete me\n'),
      ]);
      await git(repositoryRoot, ['init', '--quiet']);
      await git(repositoryRoot, ['config', 'user.email', 'fixture@example.com']);
      await git(repositoryRoot, ['config', 'user.name', 'Fixture']);
      await git(repositoryRoot, ['add', '.']);
      await git(repositoryRoot, ['commit', '--quiet', '-m', 'fixture base']);
      const baseCommit = await git(repositoryRoot, ['rev-parse', 'HEAD']);

      await Promise.all([
        writeFile(join(repositoryRoot, 'added.txt'), 'untracked material\n'),
        writeFile(join(repositoryRoot, 'material.txt'), 'changed material\n'),
        writeFile(join(repositoryRoot, 'run.sh'), '#!/bin/sh\nexit 0\n'),
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
          '# Fixture\n\n## Supervisor Record\n\n- State: REVIEW\n\n## Scope\n\nMaterial scope.\n\n## Progress\n\n- [x] Work\n\n## Lessons Learned\n\n- First run.\n',
        ),
      ]);
      await chmod(join(repositoryRoot, 'run.sh'), 0o755);
      await unlink(join(repositoryRoot, 'deleted.txt'));
      await symlink('material.txt', join(repositoryRoot, 'material-link'));

      const statusBefore = await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
      const first = await runReviewedContentIdentity(repositoryRoot, baseCommit);
      const second = await runReviewedContentIdentity(repositoryRoot, baseCommit);
      const statusAfter = await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
      const expectedPaths = ['added.txt', 'deleted.txt', 'material-link', 'material.txt', 'run.sh'];

      expect(first.stdout).toBe(second.stdout);
      expect(statusAfter).toBe(statusBefore);
      expect(reviewedContentOutputDiagnostics(first.output, expectedPaths)).toEqual([]);
      expect(first.output.manifest?.baseCommit).toBe(baseCommit);
      expect(first.output.manifest?.activeExecPlan).toBe('docs/execplans/fixture.md');
      expect(first.output.manifest?.entries).toEqual([
        expect.objectContaining({ mode: '100644', path: 'added.txt', status: 'ADDED' }),
        { contentSha256: null, mode: null, path: 'deleted.txt', status: 'DELETED' },
        expect.objectContaining({ mode: '120000', path: 'material-link', status: 'ADDED' }),
        expect.objectContaining({ mode: '100644', path: 'material.txt', status: 'MODIFIED' }),
        expect.objectContaining({ mode: '100755', path: 'run.sh', status: 'ADDED' }),
      ]);

      const malformedSerialization = structuredClone(first.output);
      malformedSerialization.canonicalManifest = `${String(malformedSerialization.canonicalManifest).trimEnd()}\r\n`;
      expect(reviewedContentOutputDiagnostics(malformedSerialization, expectedPaths)).toContain('manifest-serialization');

      const incompleteManifest = structuredClone(first.output);
      incompleteManifest.manifest!.entries = (incompleteManifest.manifest!.entries as ReviewedContentEntry[]).slice(1);
      incompleteManifest.canonicalManifest = `${JSON.stringify(incompleteManifest.manifest)}\n`;
      incompleteManifest.identity = `sha256:${createHash('sha256')
        .update(incompleteManifest.canonicalManifest as string, 'utf8')
        .digest('hex')}`;
      expect(reviewedContentOutputDiagnostics(incompleteManifest, expectedPaths)).toContain('manifest-paths');

      await writeFile(
        join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
        '# Fixture\n\n## Supervisor Record\n\n- State: PUBLISH_DRAFT\n\n## Scope\n\nMaterial scope.\n\n## Progress\n\n- [x] Work\n- [x] Review\n\n## Lessons Learned\n\n- Second run.\n',
      );
      const evidenceOnlyChange = await runReviewedContentIdentity(repositoryRoot, baseCommit);
      expect(evidenceOnlyChange.output.identity).toBe(first.output.identity);

      await writeFile(join(repositoryRoot, 'material.txt'), 'second material change\n');
      const materialChange = await runReviewedContentIdentity(repositoryRoot, baseCommit);
      expect(materialChange.output.identity).not.toBe(first.output.identity);
    } finally {
      await rm(repositoryRoot, { force: true, recursive: true });
    }
  });

  it('rejects a path-prefix collision before reading candidate content', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-prefix-collision-'));

    try {
      await mkdir(join(repositoryRoot, 'docs', 'execplans'), { recursive: true });
      await mkdir(join(repositoryRoot, 'nested'), { recursive: true });
      await Promise.all([
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'README.md'),
          '| Plan | Status |\n| --- | --- |\n| [Fixture](fixture.md) | Active: implementation |\n',
        ),
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
          '# Fixture\n\n## Supervisor Record\n\n- State: REVIEW\n\n## Progress\n\n- [x] Work\n\n## Lessons Learned\n\n- Initial.\n',
        ),
        writeFile(join(repositoryRoot, 'nested', 'material.txt'), 'inside material\n'),
      ]);
      await git(repositoryRoot, ['init', '--quiet']);
      await git(repositoryRoot, ['config', 'user.email', 'fixture@example.com']);
      await git(repositoryRoot, ['config', 'user.name', 'Fixture']);
      await git(repositoryRoot, ['add', '.']);
      await git(repositoryRoot, ['commit', '--quiet', '-m', 'fixture base']);
      const baseCommit = await git(repositoryRoot, ['rev-parse', 'HEAD']);

      await rm(join(repositoryRoot, 'nested'), { recursive: true });
      await writeFile(join(repositoryRoot, 'nested'), 'replacement leaf\n');
      await writeFile(join(repositoryRoot, 'docs', 'execplans', 'README.md'), Uint8Array.from([0xff]));
      const statusBefore = await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
      const failure = await runReviewedContentIdentityFailure(repositoryRoot, baseCommit);

      expect(failure?.code).not.toBe(0);
      expect(failure?.stdout).toBe('');
      expect(failure?.stderr).toContain('path-prefix collision between nested and nested/material.txt');
      expect(await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all'])).toBe(statusBefore);
    } finally {
      await rm(repositoryRoot, { force: true, recursive: true });
    }
  });

  it('rejects an ancestor symlink before reading candidate content', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-ancestor-symlink-'));
    const externalRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-external-'));

    try {
      await mkdir(join(repositoryRoot, 'docs', 'execplans'), { recursive: true });
      await mkdir(join(repositoryRoot, 'nested'), { recursive: true });
      await Promise.all([
        writeFile(join(repositoryRoot, '.gitignore'), '/nested\n'),
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'README.md'),
          '| Plan | Status |\n| --- | --- |\n| [Fixture](fixture.md) | Active: implementation |\n',
        ),
        writeFile(
          join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
          '# Fixture\n\n## Supervisor Record\n\n- State: REVIEW\n\n## Progress\n\n- [x] Work\n\n## Lessons Learned\n\n- Initial.\n',
        ),
        writeFile(join(repositoryRoot, 'nested', 'material.txt'), 'inside material\n'),
        writeFile(join(externalRoot, 'material.txt'), 'outside material must not be read\n'),
      ]);
      await git(repositoryRoot, ['init', '--quiet']);
      await git(repositoryRoot, ['config', 'user.email', 'fixture@example.com']);
      await git(repositoryRoot, ['config', 'user.name', 'Fixture']);
      await git(repositoryRoot, ['add', '.gitignore', 'docs']);
      await git(repositoryRoot, ['add', '--force', 'nested/material.txt']);
      await git(repositoryRoot, ['commit', '--quiet', '-m', 'fixture base']);
      const baseCommit = await git(repositoryRoot, ['rev-parse', 'HEAD']);

      await rm(join(repositoryRoot, 'nested'), { recursive: true });
      await symlink(externalRoot, join(repositoryRoot, 'nested'));
      await writeFile(join(repositoryRoot, 'docs', 'execplans', 'README.md'), Uint8Array.from([0xff]));
      const statusBefore = await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
      const failure = await runReviewedContentIdentityFailure(repositoryRoot, baseCommit);

      expect(failure?.code).not.toBe(0);
      expect(failure?.stdout).toBe('');
      expect(failure?.stderr).toContain('ancestor symlink is unsupported at nested');
      expect(await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all'])).toBe(statusBefore);
    } finally {
      await Promise.all([rm(repositoryRoot, { force: true, recursive: true }), rm(externalRoot, { force: true, recursive: true })]);
    }
  });

  it('fails closed when the active ExecPlan is missing or ignored', async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), 'skill-evidence-missing-active-plan-'));

    try {
      await mkdir(join(repositoryRoot, 'docs', 'execplans'), { recursive: true });
      await writeFile(
        join(repositoryRoot, 'docs', 'execplans', 'README.md'),
        '| Plan | Status |\n| --- | --- |\n| [Fixture](fixture.md) | Active: implementation |\n',
      );
      await git(repositoryRoot, ['init', '--quiet']);
      await git(repositoryRoot, ['config', 'user.email', 'fixture@example.com']);
      await git(repositoryRoot, ['config', 'user.name', 'Fixture']);
      await git(repositoryRoot, ['add', '.']);
      await git(repositoryRoot, ['commit', '--quiet', '-m', 'fixture base']);
      const baseCommit = await git(repositoryRoot, ['rev-parse', 'HEAD']);

      const missingFailure = await runReviewedContentIdentityFailure(repositoryRoot, baseCommit);
      expect(missingFailure?.code).not.toBe(0);
      expect(missingFailure?.stdout).toBe('');
      expect(missingFailure?.stderr).toContain('active ExecPlan is absent from candidate paths');

      await writeFile(join(repositoryRoot, '.gitignore'), '/docs/execplans/fixture.md\n');
      await writeFile(
        join(repositoryRoot, 'docs', 'execplans', 'fixture.md'),
        '# Fixture\n\n## Supervisor Record\n\n- State: REVIEW\n\n## Progress\n\n- [x] Work\n\n## Lessons Learned\n\n- Initial.\n',
      );
      const ignoredFailure = await runReviewedContentIdentityFailure(repositoryRoot, baseCommit);

      expect(ignoredFailure?.code).not.toBe(0);
      expect(ignoredFailure?.stdout).toBe('');
      expect(ignoredFailure?.stderr).toContain('active ExecPlan is absent from candidate paths');
    } finally {
      await rm(repositoryRoot, { force: true, recursive: true });
    }
  });

  it('keeps the human review and merge procedure bound to the machine identity contract', async () => {
    const [policy, contractText] = await Promise.all([
      readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8'),
      readFile(join(skillRoot, 'references', 'supervisor-contract.json'), 'utf8'),
    ]);
    const contract = JSON.parse(contractText) as SupervisorContract;
    const mergeCard = /### Merge\n\n```text\n([\s\S]*?)```/u.exec(policy)?.[1];

    expect(reviewedContentContractDiagnostics(contract)).toEqual([]);
    expect(policy).toContain('scripts/reviewed-content-identity.mjs');
    expect(policy).toContain('`Supervisor Record`, `Progress`, and `Lessons Learned`');
    expect(mergeCard).toContain('Base tip: <exact 40-character SHA>');
    expect(mergeCard).toContain('Feature head: <exact 40-character SHA>');
    expect(mergeCard).toContain('Candidate merge tree: <exact Git tree object ID>');
    expect(policy).toContain('A moved target-branch tip invalidates the approval');
    expect(policy).toContain('proportionate validation and review');
  });

  it('permits draft publication after plan approval but never silently crosses critical boundaries', async () => {
    const policy = await readFile(join(skillRoot, 'references', 'supervisor-policy.md'), 'utf8');

    expect(policy).toContain('create an isolated worktree and branch');
    expect(policy).toContain('commit the approved scope');
    expect(policy).toContain('push the branch');
    expect(policy).toContain('create or update a draft pull request');
    expect(policy).toContain('Draft pull-request publication is ordinary approved work');
    expect(policy).toContain('existing authenticated connection');
    expect(policy).toContain('Never merge, release, or deploy');
    expect(policy).toContain('Never run a model-backed or paid invocation');
    expect(policy).toContain('Never repeat a consumed campaign');
    expect(policy).toContain('computer must remain online');
    expect(policy).toContain('base branch, exact base-tip SHA, exact feature-head SHA, candidate merge-tree object ID');
    expect(policy).toContain('Merge approval given before that card is invalid');
    expect(policy).toContain('execute the approved merge');
  });
});
