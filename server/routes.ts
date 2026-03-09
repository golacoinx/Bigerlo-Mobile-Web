import type { Express } from "express";
import { createServer, type Server } from "node:http";

const SYSTEM_PROMPT = `Sen Bigerlo için kozmetik/temizlik ürün analizi yapan asistansın.\n\nKurallar:\n- Selamlama, kapanış veya kendini tanıtma yazma.\n- Yalnızca ürün analizi üret; genel sohbet metni üretme.\n- Görselde ürün okunmuyorsa bunu açıkça belirt ve tahmin yaptığını söyle.\n- Tıbbi tanı veya kesin tedavi önerisi verme.\n\nCevap formatı (başlıklarla, kısa ve net):\n1) Ürün türü\n2) Marka / görünen isim\n3) Etiket / içerik özeti\n4) Ne işe yarar\n5) Dikkat edilmesi gerekenler`;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent";

let lastGeminiCall = 0;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    const { message, imageBase64, mimeType } = req.body as {
      message?: string;
      imageBase64?: string;
      mimeType?: string;
    };

    if (typeof message !== "string") {
      res.status(400).json({ error: "message must be a string" });
      return;
    }

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const base64SizeBytes = (imageBase64.length * 3) / 4;
    if (base64SizeBytes > 3 * 1024 * 1024) {
      res.status(413).json({ error: "Fotoğraf çok büyük. Lütfen 3MB altında bir görsel gönderin." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const userParts: object[] = [];

    const resolvedMimeType = mimeType || "image/jpeg";

    if (imageBase64) {
      userParts.push({
        inlineData: {
          mimeType: resolvedMimeType,
          data: imageBase64,
        },
      });
    }

    userParts.push({
      text: message
        ? `Kullanıcı bağlamı: ${message}`
        : "Kullanıcı ek mesaj vermedi. Yalnızca görseldeki ürünü analiz et.",
    });

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    };

    const now = Date.now();
    if (now - lastGeminiCall < 2000) {
      return res.status(429).json({ error: "Çok hızlı istek. Lütfen bekleyin." });
    }
    lastGeminiCall = now;

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