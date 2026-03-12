import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  THROTTLE_WINDOW_MS,
  type AnalyzeImage,
  buildGeminiParts,
  buildGeminiPayload,
  getClientThrottleKey,
  mapGeminiErrorToHttpResponse,
  normalizeAnalyzeInputs,
  buildAnalyzeResponsePayload,
  validateAnalyzeRequest,
} from "./analyze-helpers";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const lastGeminiCallByClient = new Map<string, number>();

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    const { message, normalizedImages, hasText, hasImages } = normalizeAnalyzeInputs(
      req.body as {
        message?: string;
        images?: AnalyzeImage[];
      }
    );

    const validationError = validateAnalyzeRequest({
      hasText,
      hasImages,
      normalizedImages,
    });

    if (validationError) {
      res.status(validationError.status).json({ error: validationError.error });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const userParts = buildGeminiParts({
      message,
      normalizedImages,
      hasText,
      hasImages,
    });

    const body = buildGeminiPayload({ hasImages, userParts });

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
        const mappedError = mapGeminiErrorToHttpResponse(response.status);
        return res.status(mappedError.status).json({ error: mappedError.error });
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const payload = buildAnalyzeResponsePayload(data);

      if (!payload) {
        return res.status(502).json({ error: "Modelden geçerli bir yanıt alınamadı." });
      }

      return res.json(payload);
    } catch (err) {
      console.error("Gemini fetch error:", err);
      return res.status(502).json({ error: "API isteği başarısız oldu. Lütfen tekrar deneyin." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
