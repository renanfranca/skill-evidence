'use strict';

module.exports = (output) => {
  const observation = JSON.parse(output);
  const pass = observation.directCriticalViolation !== true;
  return {
    metadata: { skillEvidenceDisposition: pass ? 'PASS' : 'FAIL' },
    pass,
    reason: pass ? 'No direct critical violation was observed.' : 'A direct critical violation was observed.',
    score: pass ? 1 : 0,
  };
};
