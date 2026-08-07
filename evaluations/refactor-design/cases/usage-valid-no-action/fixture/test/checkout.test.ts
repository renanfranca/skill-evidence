import assert from 'node:assert/strict';
import test from 'node:test';
import { submit } from '../src/checkout.ts';

test('submits a draft through the public transition', () => {
  const now = new Date('2026-08-06T12:00:00Z');
  assert.deepEqual(submit({ phase: 'draft', items: ['book'] }, now), { phase: 'submitted', items: ['book'], submittedAt: now });
});
