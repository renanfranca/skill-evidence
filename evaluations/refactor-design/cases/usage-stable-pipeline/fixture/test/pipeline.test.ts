import assert from 'node:assert/strict';
import test from 'node:test';
import { processValue } from '../src/pipeline.ts';

test('normalizes valid input', () => {
  assert.equal(processValue(' Ready '), 'ready');
});
