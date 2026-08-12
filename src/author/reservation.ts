import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson } from '../canonical-json.js';

export interface AuthorReservationInput {
  campaignId: string;
  commit: string;
  conditionFingerprint: string;
  packetFingerprint: string;
  snapshotFingerprint: string;
}

export interface AuthorReservation extends AuthorReservationInput {
  invocationBudget: 1;
  status: 'RESERVED';
}

export class AuthorReservationError extends Error {
  readonly code: 'CAMPAIGN_ALREADY_RESERVED' | 'CAMPAIGN_ID_INVALID';

  constructor(code: AuthorReservationError['code'], message: string) {
    super(message);
    this.name = 'AuthorReservationError';
    this.code = code;
  }
}

export async function reserveAuthorInvocation(input: {
  repositoryRoot: string;
  reservation: AuthorReservationInput;
}): Promise<AuthorReservation> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(input.reservation.campaignId)) {
    throw new AuthorReservationError('CAMPAIGN_ID_INVALID', 'campaign id must be a path-safe identifier');
  }
  const directory = join(input.repositoryRoot, '.skill-evidence', 'author-reservations');
  await mkdir(directory, { recursive: true });
  const reservation: AuthorReservation = { ...input.reservation, invocationBudget: 1, status: 'RESERVED' };
  let handle;
  try {
    handle = await open(join(directory, `${input.reservation.campaignId}.json`), 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new AuthorReservationError('CAMPAIGN_ALREADY_RESERVED', 'campaign already has an Author invocation reservation');
    }
    throw error;
  }
  try {
    await handle.writeFile(`${canonicalJson(reservation)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
  return reservation;
}
