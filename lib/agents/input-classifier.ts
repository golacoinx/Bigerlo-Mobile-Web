export type InputIntent = "general-chat" | "general-knowledge" | "product-analysis" | "unclear";

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

const PRODUCT_ENTITY_KEYWORDS = [
  "bu ürün",
  "bu krem",
  "bu serum",
  "bu temizleyici",
  "bu güneş kremi",
  "ürün adı",
  "içerik listesi",
  "inci",
  "ingredients",
  "marka",
  "model",
  "spf",
  "ml",
  "gram",
  "krem",
  "serum",
  "cleanser",
  "moisturizer",
  "sunscreen",
];

const ANALYSIS_ACTION_KEYWORDS = [
  "analiz",
  "değerlendir",
  "incele",
  "karşılaştır",
  "kıyasla",
  "uygun mu",
  "sivilce yapar mı",
  "komedojenik",
  "risk",
];

const GENERAL_KNOWLEDGE_KEYWORDS = [
  "egzema",
  "akne hakkında",
  "hassas cilt",
  "hangi içerikler",
  "hangi maddeler",
  "bilgisi ver",
  "bilgi ver",
  "nedir",
  "neden olur",
  "nasıl geçer",
  "nasıl azaltılır",
  "artırır",
];

function normalizeText(text?: string): string {
  return text?.trim().toLowerCase() ?? "";
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isGeneralConversation(text?: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (GENERAL_PHRASES.has(normalized)) {
    return true;
  }

  return (
    normalized.split(" ").length <= 3 &&
    GENERAL_PHRASES.has(normalized.replace(/[!?.,]/g, ""))
  );
}

export function hasUsableProductSignal(input: InputClassifierPayload): boolean {
  if (input.type === "image" || input.type === "text+image" || Boolean(input.imageUri)) {
    return true;
  }

  const normalized = normalizeText(input.text);
  if (!normalized) return false;

  const hasEntitySignal = hasAnyKeyword(normalized, PRODUCT_ENTITY_KEYWORDS);
  const hasAnalysisAction = hasAnyKeyword(normalized, ANALYSIS_ACTION_KEYWORDS);

  return hasEntitySignal || (hasAnalysisAction && normalized.includes("bu "));
}

export function isGeneralKnowledge(text?: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const hasKnowledgeKeyword = hasAnyKeyword(normalized, GENERAL_KNOWLEDGE_KEYWORDS);
  const hasProductSignal = hasAnyKeyword(normalized, PRODUCT_ENTITY_KEYWORDS);

  return hasKnowledgeKeyword && !hasProductSignal;
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

  if (isGeneralKnowledge(input.text)) {
    return "general-knowledge";
  }

  return "unclear";
}
