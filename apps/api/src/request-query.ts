/** Framework route parameters must never enter the API's public filter schema. */
export function requestQuery(url: string | undefined) {
  const query: Record<string, string | string[]> = Object.create(null);
  for (const [key, value] of new URL(url ?? "/", "http://localhost")
    .searchParams) {
    const previous = query[key];
    query[key] =
      previous === undefined
        ? value
        : [...(Array.isArray(previous) ? previous : [previous]), value];
  }
  return query;
}
