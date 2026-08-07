import assert from 'node:assert/strict';
import test from 'node:test';
import { availableBalance } from '../src/balance.ts';

test('calculates a balance from an immutable value', () => {
  assert.equal(availableBalance({ credits: 14, debits: 5 }), 9);
});
