import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute } from '../src/route-parser.ts';

test('parses supported routes into explicit variants', () => {
  assert.deepEqual(parseRoute('/workspaces/main'), { kind: 'workspace', workspaceId: 'main' });
  assert.deepEqual(parseRoute('/jobs/export-7'), { kind: 'job', jobId: 'export-7' });
  assert.deepEqual(parseRoute('/unknown'), { kind: 'missing' });
});
