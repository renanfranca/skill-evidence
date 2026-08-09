'use strict';

module.exports = (namedScores) => {
  const direct = namedScores['direct-critical'] ?? 0;
  const semantic = namedScores.semantic ?? 0;
  const pass = direct === 1 && semantic === 1;
  return {
    pass,
    reason: direct === 0 ? 'Direct critical evidence is authoritative.' : 'All mandatory evidence passed.',
    score: pass ? 1 : 0,
  };
};
