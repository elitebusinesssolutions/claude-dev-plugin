export function isTokenExpired(expiresAt: number): boolean {
  return expiresAt < Date.now();
}

export function refreshToken(
  oldToken: string,
  newToken: string,
  tokenStore: Map<string, string>
): void {
  tokenStore.delete(oldToken);
  tokenStore.set(newToken, "active");
}
