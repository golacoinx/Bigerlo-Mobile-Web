export type InputIntent = "general-chat" | "product-analysis" | "unclear";

export type InputClassifierPayload = {
  type: "text" | "image" | "text+image";
  text?: string;
  imageUri?: string;
};

const GENERAL_PHRASES = new Set([
  "selam",
  "merhaba",
  "nasılsın",
  "naber",
  "teşekkürler",
  "teşekkür ederim",
  "sağ ol",
  "tamam",
  "ok",
  "iyi geceler",
  "günaydın",
  "iyi akşamlar",
]);

const PRODUCT_KEYWORDS = [
  "ürün",
  "içerik",
  "ingredient",
  "sivilce",
  "akne",
  "cilt",
  "uygun",
  "zararlı",
  "risk",
  "kıyas",
  "karşılaştır",
  "marka",
  "fiyat",
  "spf",
  "serum",
  "krem",
  "cleanser",
  "moisturizer",
];

function normalizeText(text?: string): string {
  return text?.trim().toLowerCase() ?? "";
}

export function isGeneralConversation(text?: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (GENERAL_PHRASES.has(normalized)) {
    return true;
  }

  return normalized.split(" ").length <= 3 && GENERAL_PHRASES.has(normalized.replace(/[!?.,]/g, ""));
}

export function hasUsableProductSignal(input: InputClassifierPayload): boolean {
  if (input.type === "image" || input.type === "text+image" || Boolean(input.imageUri)) {
    return true;
  }

  const normalized = normalizeText(input.text);
  if (!normalized) return false;

  return PRODUCT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isLikelyProductAnalysisRequest(input: InputClassifierPayload): boolean {
  if (input.type === "image" || input.type === "text+image") {
    return true;
  }

  if (!input.text?.trim()) {
    return false;
  }

  return hasUsableProductSignal(input);
}

export function classifyUserInput(input: InputClassifierPayload): InputIntent {
  if (isLikelyProductAnalysisRequest(input)) {
    return "product-analysis";
  }

  if (isGeneralConversation(input.text)) {
    return "general-chat";
  }

  return "unclear";
}
