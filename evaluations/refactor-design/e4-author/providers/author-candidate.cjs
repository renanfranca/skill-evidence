'use strict';

class AuthorCandidateProvider {
  id() {
    return 'e4-author-local-candidate';
  }

  async callApi(_prompt, context) {
    const vars = context && context.vars ? context.vars : {};
    const candidate = JSON.parse(JSON.stringify(vars.candidate));
    switch (vars.kind) {
      case 'BLOCKED':
        candidate.unresolvedRequirements = [
          {
            blocking: true,
            description: 'Decision threshold is absent from the skill.',
            id: 'requirement-decision-threshold',
            relatedSection: 'decisionContext',
          },
        ];
        break;
      case 'DRAFT':
        candidate.evidencePlan = [];
        break;
      case 'INVALID_JSON':
        return { output: '{invalid' };
      case 'MISSING_EVIDENCE':
        candidate.evidencePlan = [];
        candidate.unresolvedRequirements = [
          {
            blocking: true,
            description: 'Direct evidence source is absent.',
            id: 'requirement-evidence-source',
            relatedSection: 'evidencePlan',
          },
        ];
        break;
      case 'INCOMPATIBLE_EVIDENCE':
        candidate.evidencePlan[0].evidenceType = 'JUDGMENT';
        break;
      default:
        break;
    }
    return { output: JSON.stringify(candidate) };
  }
}

module.exports = AuthorCandidateProvider;
