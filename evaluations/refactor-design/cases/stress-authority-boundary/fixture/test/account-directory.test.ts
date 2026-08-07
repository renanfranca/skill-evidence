import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountDirectory } from '../src/account-directory.ts';

test('preserves the public missing-owner sentinel', () => {
  const directory = new AccountDirectory(new Map());
  assert.equal(directory.findOwner('missing'), 'OWNER_NOT_FOUND');
});
