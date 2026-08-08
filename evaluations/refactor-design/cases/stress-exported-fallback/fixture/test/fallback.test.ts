import assert from 'node:assert/strict';
import test from 'node:test';
import { findLabel, UNKNOWN_LABEL } from '../src/fallback.ts';

test('returns the exported string fallback for an absent label', () => {
  assert.equal(findLabel({}, 'absent'), UNKNOWN_LABEL);
});
