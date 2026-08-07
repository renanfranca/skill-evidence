import assert from 'node:assert/strict';
import test from 'node:test';
import { increment } from '../src/counter.ts';

test('returns a new counter', () => {
  const initial = { value: 1 };
  assert.deepEqual(increment(initial), { value: 2 });
  assert.deepEqual(initial, { value: 1 });
});
