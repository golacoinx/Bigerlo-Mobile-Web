import type { Express } from "express";
import { createServer, type Server } from "node:http";

const SYSTEM_PROMPT =
  "Sen Bigerlo adında bir kozmetik ve temizlik ürünleri uzmanısın. Görüntüdeki ürünleri tanı, INCI içeriklerini oku ve kullanıcının sorusuna göre sade ve anlaşılır Türkçe analiz yap. Tıbbi teşhis koyma, sadece içerik bazlı bilgilendirme yap.";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    const { message, imageBase64, mimeType } = req.body as {
      message: string;
      imageBase64?: string;
      mimeType?: string;
    };

    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const userParts: object[] = [
      { text: `${SYSTEM_PROMPT}\n\nKullanıcı mesajı: ${message}` },
    ];

    if (imageBase64 && mimeType) {
      userParts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }

    const body = {
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      if (response.status === 429) {
        res.status(429).json({ error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyip tekrar deneyin." });
      } else {
        res.status(502).json({ error: "API isteği başarısız oldu. Lütfen tekrar deneyin." });
      }
      return;
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Yanıt alınamadı. Lütfen tekrar deneyin.";

    res.json({ text });
  });

  const httpServer = createServer(app);
  return httpServer;
}
