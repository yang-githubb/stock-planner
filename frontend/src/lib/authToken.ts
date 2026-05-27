let tokenGetter: (() => string | null) | null = null;

export function setAccessTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

export function getAccessToken(): string | null {
  return tokenGetter?.() ?? null;
}
