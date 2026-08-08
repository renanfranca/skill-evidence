import assert from 'node:assert/strict';
import test from 'node:test';
import { AlertPresenter } from '../src/alert-presenter.ts';

test('loads and presents an alert through the public presenter', async () => {
  const presenter = new AlertPresenter(async id => ({ id, message: 'Export complete' }));

  assert.deepEqual(await presenter.present('alert-7'), { id: 'alert-7', message: 'Export complete' });
});
