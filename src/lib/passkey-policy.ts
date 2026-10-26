export function accessDestination(redirect: string): string {
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/";
  const pathname = redirect.split(/[?#]/)[0];
  return pathname === "/auth" || pathname.startsWith("/auth/") ? "/" : redirect;
}

export function validPasskeyChallenge(
  challenge: { origin: string; rp_id: string; expires_at: string } | null,
  expected: { origin: string; rpID: string },
  now: number,
): boolean {
  if (!challenge) return false;
  return challenge.origin === expected.origin && challenge.rp_id === expected.rpID && new Date(challenge.expires_at).getTime() > now;
}