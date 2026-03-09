function normalizeDomain(domain: string): string {
  const trimmed = domain.trim();
  return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getExpoPublicDomain(): string | null {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;

  if (!raw || !raw.trim()) {
    return null;
  }

  return normalizeDomain(raw);
}
