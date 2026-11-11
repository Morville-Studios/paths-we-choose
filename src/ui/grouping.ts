export interface CountedGroup<T> {
  item: T;
  count: number;
}

/** One-pass stable grouping for deck viewers and other repeated-card lists. */
export function groupByCount<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): CountedGroup<T>[] {
  const groups = new Map<string, CountedGroup<T>>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { item, count: 1 });
  }
  return Array.from(groups.values());
}
