'use strict';

class ProtocolV3CandidateProvider {
  id() {
    return 'author-protocol-v3-local-candidate';
  }

  async callApi(_prompt, context) {
    const vars = context && context.vars ? context.vars : {};
    return { output: JSON.stringify(vars.candidate) };
  }
}

module.exports = ProtocolV3CandidateProvider;
