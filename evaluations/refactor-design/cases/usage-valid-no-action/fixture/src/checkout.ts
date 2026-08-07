export type DraftCheckout = { phase: 'draft'; items: readonly string[] };
export type SubmittedCheckout = { phase: 'submitted'; items: readonly string[]; submittedAt: Date };

export function submit(checkout: DraftCheckout, now: Date): SubmittedCheckout {
  return { phase: 'submitted', items: checkout.items, submittedAt: now };
}
