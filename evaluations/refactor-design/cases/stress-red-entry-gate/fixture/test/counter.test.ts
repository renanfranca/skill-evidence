import assert from 'node:assert/strict';
import test from 'node:test';
import { Counter } from '../src/counter.ts';

test('documents the still-missing reset behavior', () => {
  const counter = new Counter();
  counter.increment();
  assert.equal(counter.increment(), 1);
});
