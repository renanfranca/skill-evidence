import type { Evidence } from './types.js';

export function renderEvidence(evidence: Evidence): string {
  const lines = [
    '# Skill Evidence Report',
    '',
    `Run: \`${evidence.runId}\`  `,
    `Created: ${evidence.createdAt}  `,
    `Recommendation: **${evidence.eligibility.confirm ? 'ELIGIBLE FOR CONFIRMATION' : 'NOT ELIGIBLE'}**`,
    '',
    '## Provenance',
    '',
    ...Object.entries(evidence.provenance)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `- ${key}: \`${String(value)}\``),
    '',
    '## Calibration',
    '',
    `Judge calibrated: ${evidence.calibration.passed ? 'yes' : 'no'}.`,
    '',
    '## Cases',
    '',
    '| Distribution | Case | Status | Direct violations |',
    '| --- | --- | --- | ---: |',
    ...evidence.cases.map(item => `| ${item.distribution} | ${item.id} | ${item.status} | ${item.directViolations.length} |`),
    '',
    '## Claims',
    '',
    '| Claim | Status |',
    '| --- | --- |',
    ...evidence.claims.map(claim => `| ${claim.id} | ${claim.status} |`),
    '',
    '## Eligibility',
    '',
    ...(evidence.eligibility.reasons.length === 0
      ? ['No blocking condition was observed.']
      : evidence.eligibility.reasons.map(reason => `- ${reason}`)),
    '',
    '## Usage',
    '',
    `Sessions: ${evidence.usage.sessions}; input tokens: ${evidence.usage.inputTokens}; output tokens: ${evidence.usage.outputTokens}.`,
    '',
    'This report is a deterministic projection of canonical `evidence.json`; it contains no raw events or private reasoning.',
    '',
  ];
  return lines.join('\n');
}
