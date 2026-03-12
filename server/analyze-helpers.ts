export const SYSTEM_PROMPT = `Sen Bigerlo için kozmetik/temizlik ürün analizi yapan asistansın.

Kurallar:
- Yanıtın tamamen Türkçe olsun.
- Selamlama, kapanış veya kendini tanıtma yazma.
- Tıbbi tanı veya kesin tedavi önerisi verme.
- Görsellerde ürün net değilse bunu açıkça belirt ve tahminini ayrı bir not olarak ver.
- Görsel bulanık, uzak veya karanlıksa bunu açıkça söyle ve kullanıcıdan daha yakın, aydınlık ve sabit yeni fotoğraf iste.
- Kullanıcı egzama, hassas cilt, akne gibi bağlam verirse buna özel dikkat notu ekle.
- Birden fazla ürün varsa mutlaka karşılaştırma ve pratik öneri ver.

Yanıt formatı (kısa ama doyurucu):
1) Ürün tespiti
2) İçerik/aktif bileşen notları (görülebilen veya makul çıkarım)
3) Risk/dikkat noktaları
4) Kullanıcı sorusuna net cevap
5) Çoklu ürün varsa kısa sıralama + hangi durumda hangisi`;

export const TEXT_ONLY_SYSTEM_PROMPT = `You are Bigerlo, a helpful AI assistant specialized in cosmetics, skincare, dermatology, ingredients and household cleaning products.

You can answer general questions normally like a conversational assistant.
If the topic relates to cosmetics, skincare, dermatology or cleaning products, provide deeper expert guidance.

Respond clearly in Turkish.
Do not provide medical diagnosis or definitive treatment claims.`;

const IMAGE_ONLY_FALLBACK_PROMPT =
  "Görselleri analiz et ve Türkçe, faydalı, kısa ama yeterince açıklayıcı bir yanıt ver.";

export const THROTTLE_WINDOW_MS = 2000;
const MAX_IMAGES = 5;
const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 12 * 1024 * 1024;

export type AnalyzeImage = {
  imageBase64?: string;
  mimeType?: string;
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
        "Birden fazla ürün varsa karşılaştır, içerik/risk notlarını belirt ve pratik öneri ver.",
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
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };
}

export function sanitizeModelText(data: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}): string {
  const rawText =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text?.trim())
      .filter((part): part is string => Boolean(part))
      .join("\n\n") ?? "";

  return rawText.replace(/^\s*(Merhaba|Selam|Hi|Hello)[^\n]*\n?/i, "").trim();
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
