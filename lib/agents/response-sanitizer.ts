const DEFAULT_FALLBACK = "Şu an net bir yanıt üretemedim. Soruyu biraz daha detaylandırabilir misiniz?";

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function extractMessageFromJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as unknown;

    if (typeof parsed === "string") {
      return parsed.trim() || null;
    }

    if (parsed && typeof parsed === "object") {
      const candidates = ["response", "message", "text", "reply", "content"];
      for (const key of candidates) {
        const value = (parsed as Record<string, unknown>)[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function sanitizeAssistantText(rawText?: unknown): string {
  const text = typeof rawText === "string" ? rawText.trim() : "";

  if (!text) {
    return DEFAULT_FALLBACK;
  }

  if (looksLikeJson(text)) {
    const extracted = extractMessageFromJson(text);
    if (extracted) {
      return extracted;
    }

    return DEFAULT_FALLBACK;
  }

  return text;
}
