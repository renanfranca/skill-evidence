import assert from 'node:assert/strict';
import test from 'node:test';
import { commandFor } from '../src/command-map.ts';

test('returns the typed command for each supported name', () => {
  assert.equal(commandFor('start'), 'service start');
  assert.equal(commandFor('stop'), 'service stop');
});
