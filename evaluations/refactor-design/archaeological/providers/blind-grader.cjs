'use strict';

const forbiddenValues = ['expectedstatus', 'known-valid', 'known-invalid', 'label-derived-identifier'];

module.exports = class ArchaeologicalBlindGrader {
  constructor(options = {}) {
    this.providerId = options.id ?? 'local:archaeological-blind-grader';
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt) {
    const leakedValue = forbiddenValues.find((value) => prompt.toLowerCase().includes(value));
    const pass = leakedValue === undefined;
    return {
      output: JSON.stringify({
        pass,
        reason: pass ? 'The evaluator-visible packet is expectation-blind.' : `The packet leaked forbidden value ${leakedValue}.`,
        score: pass ? 1 : 0,
      }),
    };
  }
};
