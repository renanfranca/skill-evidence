export const UNKNOWN_LABEL = 'unknown';

export function findLabel(labels: Readonly<Record<string, string>>, id: string): string {
  return labels[id] ?? UNKNOWN_LABEL;
}
