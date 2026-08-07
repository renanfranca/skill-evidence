export interface Counter {
  readonly value: number;
}

export const increment = (counter: Counter): Counter => ({ value: counter.value + 1 });
