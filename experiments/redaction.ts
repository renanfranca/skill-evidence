const secretKeyPattern = /(?:api[_-]?key|authorization|secret|password|credential)s?$|(?:^|[_-])token$|(?:access|refresh|id)token$/i;

function mustRedact(key: string, value: unknown): boolean {
  const normalized = key.toLowerCase();
  if (secretKeyPattern.test(key) || normalized === 'raw' || normalized === 'rawcontent') {
    return true;
  }
  return normalized.includes('reasoning') && typeof value !== 'number';
}

export function sanitizeForPersistence(value: unknown, externalCodexHome?: string): unknown {
  if (typeof value === 'string') {
    return externalCodexHome === undefined ? value : value.replaceAll(externalCodexHome, '<EXTERNAL_CODEX_HOME>');
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForPersistence(item, externalCodexHome));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        mustRedact(key, item) ? '<REDACTED>' : sanitizeForPersistence(item, externalCodexHome),
      ]),
    );
  }
  return value;
}
