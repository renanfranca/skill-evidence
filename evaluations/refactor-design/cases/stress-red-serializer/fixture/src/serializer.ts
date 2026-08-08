export interface RecordValue {
  id: string;
  title: string;
}

export function serialize(value: RecordValue): string {
  return JSON.stringify({ type: 'record', id: value.id, title: value.title });
}
