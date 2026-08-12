'use strict';

class LifecycleCandidateProvider {
  id() {
    return 'author-lifecycle-v2-local-candidate';
  }

  async callApi(_prompt, context) {
    const vars = context && context.vars ? context.vars : {};
    return { output: JSON.stringify(vars.candidate) };
  }
}

module.exports = LifecycleCandidateProvider;
