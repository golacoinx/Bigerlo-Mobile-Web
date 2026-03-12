import { z } from "zod";

export const SYSTEM_PROMPT = `Sen Bigerlo için kozmetik/temizlik ürün analizi yapan asistansın.

Çok önemli kurallar:
- Yanıtın tamamen Türkçe olsun.
- Tıbbi tanı veya kesin tedavi önerisi verme.
- Belirsizlik varsa bunu açıkça belirt.
- Ürün/görsel net değilse dikkat notu ekle.
- Cevabı SADECE geçerli bir JSON nesnesi olarak döndür. Markdown, kod bloğu, açıklama metni ekleme.

JSON şeması (alan adları birebir):
{
  "replyText": string,
  "product": {
    "name": string,
    "brand": string,
    "type": string
  },
  "ingredients": string[],
  "analysis": {
    "summary": string,
    "risks": string[],
    "suitability": "uygun" | "dikkatli_kullan" | "uygun_degil" | "belirsiz",
    "confidence": number,
    "cautionNote": string
  }
}

Ek notlar:
- confidence 0 ile 1 arasında sayı olmalı.
- replyText kullanıcıya gösterilecek kısa ve anlaşılır Türkçe açıklama olmalı.
- risks ve ingredients yoksa boş dizi ver.
- brand/type bilinmiyorsa "unknown" yaz.`;

export const TEXT_ONLY_SYSTEM_PROMPT = `You are Bigerlo, a helpful AI assistant specialized in cosmetics, skincare, dermatology, ingredients and household cleaning products.

Respond in Turkish and never provide medical diagnosis.
Return ONLY valid JSON with this exact shape:
{
  "replyText": string,
  "product": { "name": string, "brand": string, "type": string },
  "ingredients": string[],
  "analysis": {
    "summary": string,
    "risks": string[],
    "suitability": "uygun" | "dikkatli_kullan" | "uygun_degil" | "belirsiz",
    "confidence": number,
    "cautionNote": string
  }
}
If unknown, use conservative defaults and keep confidence low.`;

const IMAGE_ONLY_FALLBACK_PROMPT =
  "Görselleri analiz et ve kullanıcı için güvenli, kısa, Türkçe bir değerlendirme yap.";

const DEFAULT_CAUTION_NOTE =
  "Bu değerlendirme genel bilgilendirme amaçlıdır; ciddi veya kalıcı şikayetlerde uzmana danışın.";

export const THROTTLE_WINDOW_MS = 2000;
const MAX_IMAGES = 5;
const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 12 * 1024 * 1024;

const suitabilitySchema = z.enum(["uygun", "dikkatli_kullan", "uygun_degil", "belirsiz"]);

const structuredModelOutputSchema = z.object({
  replyText: z.string().trim().min(1).max(4000),
  product: z.object({
    name: z.string().trim().min(1).max(250),
    brand: z.string().trim().min(1).max(250),
    type: z.string().trim().min(1).max(250),
  }),
  ingredients: z.array(z.string().trim().min(1).max(250)).max(128).default([]),
  analysis: z.object({
    summary: z.string().trim().min(1).max(4000),
    risks: z.array(z.string().trim().min(1).max(500)).max(64).default([]),
    suitability: suitabilitySchema.default("belirsiz"),
    confidence: z.number().min(0).max(1),
    cautionNote: z.string().trim().min(1).max(1000),
  }),
});

export type AnalyzeImage = {
  imageBase64?: string;
  mimeType?: string;
};

export type AnalyzeStructuredResult = {
  product: {
    name: string;
    brand: string;
    type: string;
  };
  ingredients: string[];
  analysis: {
    summary: string;
    risks: string[];
    suitability: z.infer<typeof suitabilitySchema>;
    confidence: number;
    cautionNote: string;
  };
};

export type AnalyzeResponsePayload = {
  text: string;
  structured: AnalyzeStructuredResult;
  structuredParseStatus: "parsed" | "fallback";
};

export type NormalizeAnalyzeInputsResult = {
  message: string | undefined;
  normalizedImages: AnalyzeImage[];
  hasText: boolean;
  hasImages: boolean;
};

export type ValidationError = {
  status: number;
  error: string;
};

type GeminiInlinePart = { inlineData: { mimeType: string; data: string } };
type GeminiTextPart = { text: string };

export function normalizeAnalyzeInputs(input: {
  message?: string;
  images?: AnalyzeImage[];
}): NormalizeAnalyzeInputsResult {
  const normalizedImages = Array.isArray(input.images) ? input.images : [];
  const hasText = typeof input.message === "string" && input.message.trim().length > 0;
  const hasImages = normalizedImages.length > 0;

  return {
    message: input.message,
    normalizedImages,
    hasText,
    hasImages,
  };
}

export function validateAnalyzeRequest(args: {
  hasText: boolean;
  hasImages: boolean;
  normalizedImages: AnalyzeImage[];
}): ValidationError | null {
  const { hasText, hasImages, normalizedImages } = args;

  if (!hasText && !hasImages) {
    return { status: 400, error: "message or images is required" };
  }

  if (normalizedImages.length > MAX_IMAGES) {
    return { status: 400, error: `En fazla ${MAX_IMAGES} fotoğraf gönderebilirsiniz.` };
  }

  let totalSizeBytes = 0;
  for (const image of normalizedImages) {
    if (typeof image.imageBase64 !== "string" || !image.imageBase64.trim()) {
      return { status: 400, error: "each image must include imageBase64" };
    }

    const imageSizeBytes = (image.imageBase64.length * 3) / 4;
    if (imageSizeBytes > MAX_SINGLE_IMAGE_BYTES) {
      return {
        status: 413,
        error: "Fotoğraflardan biri çok büyük. Lütfen her görseli 3MB altında gönderin.",
      };
    }

    totalSizeBytes += imageSizeBytes;
    if (totalSizeBytes > MAX_TOTAL_IMAGE_BYTES) {
      return {
        status: 413,
        error: "Toplam görsel boyutu çok büyük. Lütfen daha az veya daha küçük görsel gönderin.",
      };
    }
  }

  return null;
}

export function buildGeminiParts(args: {
  message?: string;
  normalizedImages: AnalyzeImage[];
  hasText: boolean;
  hasImages: boolean;
}): Array<GeminiInlinePart | GeminiTextPart> {
  const { message, normalizedImages, hasText, hasImages } = args;
  const userParts: Array<GeminiInlinePart | GeminiTextPart> = [];

  if (hasImages) {
    for (const image of normalizedImages) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType || "image/jpeg",
          data: image.imageBase64 ?? "",
        },
      });
    }

    userParts.push({
      text:
        `Kullanıcı sorusu: ${hasText ? message!.trim() : IMAGE_ONLY_FALLBACK_PROMPT}\n` +
        `Toplam görsel sayısı: ${normalizedImages.length}. ` +
        "Ürün net değilse bunu belirt, uydurma içerik ekleme ve güven seviyesini düşür.",
    });
  } else {
    userParts.push({ text: message!.trim() });
  }

  return userParts;
}

export function buildGeminiPayload(args: {
  hasImages: boolean;
  userParts: Array<GeminiInlinePart | GeminiTextPart>;
}) {
  return {
    systemInstruction: {
      parts: [{ text: args.hasImages ? SYSTEM_PROMPT : TEXT_ONLY_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: args.userParts,
      },
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 2048,
    },
  };
}

function getRawModelText(data: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text?.trim())
      .filter((part): part is string => Boolean(part))
      .join("\n\n") ?? ""
  ).trim();
}

function stripGreeting(text: string): string {
  return text.replace(/^\s*(Merhaba|Selam|Hi|Hello)[^\n]*\n?/i, "").trim();
}

function extractJsonCandidate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
}

function parseStructuredJson(text: string): z.infer<typeof structuredModelOutputSchema> | null {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate);
    const validated = structuredModelOutputSchema.safeParse(parsed);
    if (!validated.success) return null;

    return {
      ...validated.data,
      ingredients: Array.from(new Set(validated.data.ingredients)),
      analysis: {
        ...validated.data.analysis,
        risks: Array.from(new Set(validated.data.analysis.risks)),
        confidence: Number(validated.data.analysis.confidence.toFixed(2)),
      },
    };
  } catch {
    return null;
  }
}

function buildFallbackStructured(rawText: string): AnalyzeStructuredResult {
  const safeText = stripGreeting(rawText);
  const summary = safeText || "Model yanıtı yapılandırılmış olarak alınamadı.";

  return {
    product: {
      name: "unknown",
      brand: "unknown",
      type: "unknown",
    },
    ingredients: [],
    analysis: {
      summary,
      risks: [],
      suitability: "belirsiz",
      confidence: 0.2,
      cautionNote: DEFAULT_CAUTION_NOTE,
    },
  };
}

function buildDisplayTextFromStructured(
  parsed: z.infer<typeof structuredModelOutputSchema>
): string {
  const reply = stripGreeting(parsed.replyText);
  if (reply) return reply;

  const sections = [parsed.analysis.summary, parsed.analysis.cautionNote]
    .map((part) => part.trim())
    .filter(Boolean);

  return sections.join("\n\n").trim();
}

export function buildAnalyzeResponsePayload(data: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}): AnalyzeResponsePayload | null {
  const rawModelText = getRawModelText(data);
  if (!rawModelText) return null;

  const parsed = parseStructuredJson(rawModelText);

  if (!parsed) {
    const fallbackStructured = buildFallbackStructured(rawModelText);
    return {
      text: fallbackStructured.analysis.summary,
      structured: fallbackStructured,
      structuredParseStatus: "fallback",
    };
  }

  const displayText = buildDisplayTextFromStructured(parsed);

  const structured: AnalyzeStructuredResult = {
    product: {
      name: parsed.product.name,
      brand: parsed.product.brand,
      type: parsed.product.type,
    },
    ingredients: parsed.ingredients,
    analysis: {
      summary: parsed.analysis.summary,
      risks: parsed.analysis.risks,
      suitability: parsed.analysis.suitability,
      confidence: parsed.analysis.confidence,
      cautionNote: parsed.analysis.cautionNote,
    },
  };

  return {
    text: displayText || structured.analysis.summary,
    structured,
    structuredParseStatus: "parsed",
  };
}

export function mapGeminiErrorToHttpResponse(status: number): ValidationError {
  if (status === 429) {
    return {
      status: 429,
      error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyip tekrar deneyin.",
    };
  }

  return {
    status: 502,
    error: "API isteği başarısız oldu. Lütfen tekrar deneyin.",
  };
}

export function getClientThrottleKey(req: {
  ip?: string;
  header: (name: string) => string | undefined;
}): string {
  const forwardedFor = req.header("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  if (req.ip?.trim()) {
    return req.ip.trim();
  }

  return "unknown-client";
}
