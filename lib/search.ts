export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-CA')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesSearchQuery(query: string, values: Array<string | null | undefined>) {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = normalizeSearchText(values.filter(Boolean).join(' '));
  return terms.every((term) => searchableText.includes(term));
}
