import assert from 'node:assert/strict';
import test from 'node:test';
import { findRoute, MISSING_ROUTE } from '../src/lookup.ts';

test('returns the exported sentinel for an absent route', () => {
  assert.equal(findRoute([], 'absent'), MISSING_ROUTE);
});
