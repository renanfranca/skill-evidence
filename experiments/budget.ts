import { mkdir, readdir, writeFile } from 'node:fs/promises';

import { campaignArtifactPath, campaignDirectory } from './campaign.js';
import { canonicalJson } from './canonical.js';
import type { ExperimentKind } from './configuration.js';

interface Reservation {
  attempt: 1;
  campaignId: string;
  kind: ExperimentKind;
  startedAt: string;
  version: 2;
}

export interface ProviderInvocationReservation {
  attempt: 1;
  totalStarted: number;
}

export interface ReserveProviderInvocationInput {
  artifactRoot: string;
  campaignId: string;
  kind: ExperimentKind;
}

async function writeLedger(input: ReserveProviderInvocationInput): Promise<number> {
  const reservationDirectory = campaignArtifactPath(input.artifactRoot, input.campaignId, 'reservations');
  const names = (await readdir(reservationDirectory)).filter((name) => name.endsWith('.json')).sort();
  const ledger = {
    campaignId: input.campaignId,
    reservations: names.map((name) => name.slice(0, -'.json'.length)),
    version: 2,
  };
  await writeFile(campaignArtifactPath(input.artifactRoot, input.campaignId, 'budget-ledger.json'), canonicalJson(ledger) + '\n', {
    mode: 0o600,
  });
  return names.length;
}

export async function reserveProviderInvocation(input: ReserveProviderInvocationInput): Promise<ProviderInvocationReservation> {
  const directory = campaignDirectory(input.artifactRoot, input.campaignId);
  const reservationDirectory = campaignArtifactPath(input.artifactRoot, input.campaignId, 'reservations');
  await mkdir(directory, { mode: 0o700, recursive: true });
  await mkdir(reservationDirectory, { mode: 0o700, recursive: true });
  const reservation: Reservation = {
    attempt: 1,
    campaignId: input.campaignId,
    kind: input.kind,
    startedAt: new Date().toISOString(),
    version: 2,
  };
  try {
    await writeFile(
      campaignArtifactPath(input.artifactRoot, input.campaignId, 'reservations', input.kind + '.json'),
      canonicalJson(reservation) + '\n',
      {
        flag: 'wx',
        mode: 0o600,
      },
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('provider invocation for ' + input.kind + ' already started; retries are forbidden');
    }
    throw error;
  }
  const totalStarted = await writeLedger(input);
  if (totalStarted > 3) {
    throw new Error('provider invocation budget exhausted');
  }
  return { attempt: 1, totalStarted };
}
