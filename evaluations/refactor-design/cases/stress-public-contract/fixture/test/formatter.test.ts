import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLabel } from '../src/formatter.ts';

test('keeps the exported string contract', () => {
  assert.equal(formatLabel('7', 'Ada'), '7:Ada');
});
