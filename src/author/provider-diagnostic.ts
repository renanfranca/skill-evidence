export type AuthorProviderFailureStage = 'EVALUATION' | 'OUTPUT' | 'RESULT';

export type AuthorProviderFailureCategory =
  'AUTHENTICATION' | 'CONFIGURATION' | 'MODEL_ACCESS' | 'PROCESS' | 'RATE_LIMIT' | 'TIMEOUT' | 'UNKNOWN';

export type AuthorProviderFailureCode =
  'ABORTED' | 'EXIT_NONZERO' | 'HTTP_401' | 'HTTP_403' | 'HTTP_404' | 'HTTP_429' | 'NO_RESULT' | 'NO_TEXT' | 'UNCLASSIFIED';

export interface AuthorProviderDiagnostic {
  category: AuthorProviderFailureCategory;
  code: AuthorProviderFailureCode;
  stage: AuthorProviderFailureStage;
}

export class AuthorProviderError extends Error {
  readonly diagnostic: AuthorProviderDiagnostic;

  constructor(diagnostic: AuthorProviderDiagnostic) {
    super('Author provider invocation failed');
    this.name = 'AuthorProviderError';
    this.diagnostic = diagnostic;
  }
}

export function diagnoseProviderFailure(stage: AuthorProviderFailureStage, message: string): AuthorProviderDiagnostic {
  const normalized = message.toLowerCase();
  const timedOut = /\b(?:abort(?:ed)?|timed?\s*out|timeout)\b/u.test(normalized);
  const rateLimited = /\b(?:429|rate[ -]?limit|quota|usage[ -]?limit)\b/u.test(normalized);
  const authenticationFailed = /\b(?:401|authentication|unauthenticated|unauthorized|login required)\b/u.test(normalized);
  const modelAccessFailed = /\bmodel\b/u.test(normalized) && /\b(?:access|denied|not found|unavailable|unsupported)\b/u.test(normalized);
  const configurationFailed =
    /\b(?:config(?:uration)?|working directory)\b/u.test(normalized) && /\b(?:failed|invalid|parse)\b/u.test(normalized);
  const processFailed = /\b(?:codex exec exited|enoent|signal|spawn)\b/u.test(normalized);

  const code: AuthorProviderFailureCode = timedOut
    ? 'ABORTED'
    : /\b(?:http\s*)?429\b/u.test(normalized)
      ? 'HTTP_429'
      : /\b(?:http\s*)?401\b/u.test(normalized)
        ? 'HTTP_401'
        : /\b(?:http\s*)?404\b/u.test(normalized)
          ? 'HTTP_404'
          : /\b(?:http\s*)?403\b/u.test(normalized)
            ? 'HTTP_403'
            : processFailed
              ? 'EXIT_NONZERO'
              : 'UNCLASSIFIED';
  const category: AuthorProviderFailureCategory = timedOut
    ? 'TIMEOUT'
    : rateLimited
      ? 'RATE_LIMIT'
      : authenticationFailed
        ? 'AUTHENTICATION'
        : modelAccessFailed
          ? 'MODEL_ACCESS'
          : configurationFailed
            ? 'CONFIGURATION'
            : processFailed
              ? 'PROCESS'
              : 'UNKNOWN';
  return { category, code, stage };
}

export function unknownProviderDiagnostic(): AuthorProviderDiagnostic {
  return { category: 'UNKNOWN', code: 'UNCLASSIFIED', stage: 'EVALUATION' };
}
