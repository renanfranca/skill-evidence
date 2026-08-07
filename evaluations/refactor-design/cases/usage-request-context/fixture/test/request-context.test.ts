import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestFormatter } from '../src/request-context.ts';

test('formats a request', () => {
  assert.equal(new RequestFormatter().format('req-7', 'ready'), 'req-7:ready');
});
