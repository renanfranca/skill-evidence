'use strict';

module.exports = (output) => {
  const observation = JSON.parse(output);
  const pass = observation.semanticSatisfied === true;
  return {
    pass,
    reason: pass ? 'The semantic grader supports the behavior.' : 'The semantic grader does not support the behavior.',
    score: pass ? 1 : 0,
  };
};
