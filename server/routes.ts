import type { Express } from "express";
import { createServer, type Server } from "node:http";

const SYSTEM_PROMPT = `Sen Bigerlo için kozmetik/temizlik ürün analizi yapan asistansın.

Kurallar:
- Yanıtın tamamen Türkçe olsun.
- Selamlama, kapanış veya kendini tanıtma yazma.
- Tıbbi tanı veya kesin tedavi önerisi verme.
- Görsellerde ürün net değilse bunu açıkça belirt ve tahminini ayrı bir not olarak ver.
- Kullanıcı egzama, hassas cilt, akne gibi bağlam verirse buna özel dikkat notu ekle.
- Birden fazla ürün varsa mutlaka karşılaştırma ve pratik öneri ver.

Yanıt formatı (kısa ama doyurucu):
1) Ürün tespiti
2) İçerik/aktif bileşen notları (görülebilen veya makul çıkarım)
3) Risk/dikkat noktaları
4) Kullanıcı sorusuna net cevap
5) Çoklu ürün varsa kısa sıralama + hangi durumda hangisi`;

const TEXT_ONLY_SYSTEM_PROMPT = `Sen Bigerlo'sun. Kozmetik, temizlik ürünleri, cilt güvenliği ve genel sorularda yardımcı olan bir asistansın.

Kurallar:
- Yanıtın tamamen Türkçe olsun.
- Kısa, net ve pratik cevap ver.
- Kullanıcı bağlamına göre (ör. hassas cilt, egzama, akne) dikkat notları ekle.
- Tıbbi tanı veya kesin tedavi önerisi verme.`;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const THROTTLE_WINDOW_MS = 2000;
const MAX_IMAGES = 5;
const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 12 * 1024 * 1024;
const lastGeminiCallByClient = new Map<string, number>();

type AnalyzeImage = {
  imageBase64?: string;
  mimeType?: string;
};

function getClientThrottleKey(req: {
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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    const { message, images } = req.body as {
      message?: string;
      images?: AnalyzeImage[];
    };

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message is required and must be a non-empty string" });
      return;
    }

    const normalizedImages = Array.isArray(images) ? images : [];

    if (normalizedImages.length > MAX_IMAGES) {
      res.status(400).json({ error: `En fazla ${MAX_IMAGES} fotoğraf gönderebilirsiniz.` });
      return;
    }

    let totalSizeBytes = 0;
    for (const image of normalizedImages) {
      if (typeof image.imageBase64 !== "string" || !image.imageBase64.trim()) {
        res.status(400).json({ error: "each image must include imageBase64" });
        return;
      }

      const imageSizeBytes = (image.imageBase64.length * 3) / 4;
      if (imageSizeBytes > MAX_SINGLE_IMAGE_BYTES) {
        res.status(413).json({ error: "Fotoğraflardan biri çok büyük. Lütfen her görseli 3MB altında gönderin." });
        return;
      }

      totalSizeBytes += imageSizeBytes;
      if (totalSizeBytes > MAX_TOTAL_IMAGE_BYTES) {
        res.status(413).json({ error: "Toplam görsel boyutu çok büyük. Lütfen daha az veya daha küçük görsel gönderin." });
        return;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

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
        `Kullanıcı sorusu: ${message.trim()}\n` +
        `Toplam görsel sayısı: ${normalizedImages.length}. ` +
        "Görsel yoksa normal metin asistanı gibi cevapla; çoklu ürün varsa karşılaştır.",
    });

    const body = {
      systemInstruction: {
        parts: [
          {
            text:
              normalizedImages.length > 0
                ? SYSTEM_PROMPT
                : TEXT_ONLY_SYSTEM_PROMPT,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    const clientKey = getClientThrottleKey(req);
    const now = Date.now();
    const lastCall = lastGeminiCallByClient.get(clientKey) ?? 0;

    if (now - lastCall < THROTTLE_WINDOW_MS) {
      return res.status(429).json({ error: "Çok hızlı istek. Lütfen bekleyin." });
    }
    lastGeminiCallByClient.set(clientKey, now);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API error:", errText);
        if (response.status === 429) {
          return res.status(429).json({ error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyip tekrar deneyin." });
        }
        return res.status(502).json({ error: "API isteği başarısız oldu. Lütfen tekrar deneyin." });
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const rawText =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text?.trim())
          .filter((part): part is string => Boolean(part))
          .join("\n\n") ?? "";

      const text = rawText
        .replace(/^\s*(Merhaba|Selam|Hi|Hello)[^\n]*\n?/i, "")
        .trim();

      if (!text) {
        return res.status(502).json({ error: "Modelden geçerli bir yanıt alınamadı." });
      }

      return res.json({ text });
    } catch (err) {
      console.error("Gemini fetch error:", err);
      return res.status(502).json({ error: "API isteği başarısız oldu. Lütfen tekrar deneyin." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
