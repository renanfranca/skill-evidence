import assert from 'node:assert/strict';
import test from 'node:test';
import { JobPresenter } from '../src/job-presenter.ts';

test('loads and presents a job through the public presenter', async () => {
  const presenter = new JobPresenter(async id => ({ id, title: 'Export report' }));

  assert.deepEqual(await presenter.present('job-7'), { id: 'job-7', title: 'Export report' });
});
