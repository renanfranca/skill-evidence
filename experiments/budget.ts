import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson } from './canonical.js';
import type { ExperimentKind } from './configuration.js';

interface BudgetLedger {
  campaignId: string;
  started: Array<{ attempt: 1; kind: ExperimentKind; startedAt: string }>;
  version: 1;
}

export interface ReserveProviderInvocationInput {
  artifactRoot: string;
  campaignId: string;
  kind: ExperimentKind;
}

export interface ProviderInvocationReservation {
  attempt: 1;
  totalStarted: number;
}

async function readLedger(path: string, campaignId: string): Promise<BudgetLedger> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as BudgetLedger;
  } catch (error) {
    if (isMissingFile(error)) {
      return { campaignId, started: [], version: 1 };
    }
    throw error;
  }
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export async function reserveProviderInvocation(input: ReserveProviderInvocationInput): Promise<ProviderInvocationReservation> {
  const directory = join(input.artifactRoot, 'campaigns', input.campaignId);
  const ledgerPath = join(directory, 'budget-ledger.json');
  const ledger = await readLedger(ledgerPath, input.campaignId);
  if (ledger.campaignId !== input.campaignId || ledger.version !== 1) {
    throw new Error('invalid budget ledger');
  }
  if (ledger.started.some((entry) => entry.kind === input.kind)) {
    throw new Error(`provider invocation for ${input.kind} already started; retries are forbidden`);
  }
  if (ledger.started.length >= 3) {
    throw new Error('provider invocation budget exhausted');
  }
  ledger.started.push({ attempt: 1, kind: input.kind, startedAt: new Date().toISOString() });
  await mkdir(directory, { recursive: true });
  await writeFile(ledgerPath, `${canonicalJson(ledger)}\n`);
  return { attempt: 1, totalStarted: ledger.started.length };
}
