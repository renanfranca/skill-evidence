'use strict';

module.exports = (output) => {
  const observation = JSON.parse(output);
  const unknown = observation.eventRecognition === 'UNKNOWN_RELEVANT';
  if (!unknown) {
    return {
      pass: true,
      reason: 'The assertion returned no recognized domain disposition.',
      score: 1,
    };
  }
  return {
    metadata: { skillEvidenceDisposition: 'INCONCLUSIVE' },
    pass: false,
    reason: 'A relevant event was exposed but is not recognized.',
    score: 0,
  };
};
