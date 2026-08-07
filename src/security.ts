const secretPatterns = [
  /\b(?:sk|sess)-[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[opusr]_[A-Za-z0-9]{20,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:OPENAI_API_KEY|CODEX_API_KEY|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*\S+/gi,
];

export function containsSecret(value: string): boolean {
  return secretPatterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function sanitize(value: string): string {
  let result = value;
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function assertArchiveSafe(value: string, maxBytes = 5_000_000): void {
  if (Buffer.byteLength(value) > maxBytes) throw new Error(`Artifact exceeds ${maxBytes} bytes`);
  if (containsSecret(value)) throw new Error('Credential-like content detected');
  if (/"type"\s*:\s*"reasoning"/.test(value) || /"itemType"\s*:\s*"reasoning"/.test(value))
    throw new Error('Private reasoning must not be archived');
}
