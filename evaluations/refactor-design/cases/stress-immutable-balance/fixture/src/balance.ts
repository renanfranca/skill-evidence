export type Balance = Readonly<{ credits: number; debits: number }>;

export function availableBalance(balance: Balance): number {
  return balance.credits - balance.debits;
}
