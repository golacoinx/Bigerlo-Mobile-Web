function normalizeDomain(domain: string): string {
  const trimmed = domain.trim();
  return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getRequiredExpoPublicDomain(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;

  if (!raw || !raw.trim()) {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is missing. Set it to your API host (example: my-domain.com:5000).",
    );
  }

  return normalizeDomain(raw);
}
