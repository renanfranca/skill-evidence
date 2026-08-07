import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceService } from '../src/invoice-service.ts';

test('loads and presents an invoice through the public service', async () => {
  const service = new InvoiceService(async id => (id === 'invoice-7' ? 42 : 0));
  assert.deepEqual(await service.find('invoice-7'), { id: 'invoice-7', total: 42 });
});
