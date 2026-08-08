import assert from 'node:assert/strict';
import test from 'node:test';
import { serialize } from '../src/serializer.ts';

test('serializes the required versioned record payload', () => {
  assert.equal(serialize({ id: 'record-7', title: 'Export' }), '{"type":"record","version":1,"id":"record-7","title":"Export"}');
});
