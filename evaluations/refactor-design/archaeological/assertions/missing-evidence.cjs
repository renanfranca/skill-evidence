'use strict';

module.exports = (output) => {
  const observation = JSON.parse(output);
  const missing = observation.evidenceState === 'MISSING_LATE';
  return {
    metadata: { skillEvidenceDisposition: missing ? 'INCONCLUSIVE' : 'PASS' },
    pass: !missing,
    reason: missing ? 'Required evidence became unavailable after execution started.' : 'Required evidence remained available.',
    score: missing ? 0 : 1,
  };
};
