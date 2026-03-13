import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { z } from "zod";
import {
  THROTTLE_WINDOW_MS,
  type AnalyzeImage,
  buildGeminiParts,
  buildGeminiPayload,
  getClientThrottleKey,
  mapGeminiErrorToHttpResponse,
  normalizeAnalyzeInputs,
  parseStructuredAnalyzeResponse,
  sanitizeModelText,
  validateAnalyzeRequest,
} from "./analyze-helpers";
import { storage } from "./storage";
import { evaluateRoutineCompatibility } from "./compatibility/compatibility-engine";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const lastGeminiCallByClient = new Map<string, number>();
const profileIdByClient = new Map<string, string>();

const arrayFieldSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  return value
    .split(/[\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}, z.array(z.string().min(1)).max(100));

const profileUpdateSchema = z.object({
  skinType: z.string().trim().max(100).optional(),
  hairType: z.string().trim().max(100).optional(),
  sensitivities: arrayFieldSchema.optional(),
  avoidIngredients: arrayFieldSchema.optional(),
  knownReactions: arrayFieldSchema.optional(),
});

async function getOrCreateProfileForClient(clientKey: string) {
  const existingId = profileIdByClient.get(clientKey);

  if (existingId) {
    const existing = await storage.domain.getUserProfile(existingId);
    if (existing) return existing;
  }

  const created = await storage.domain.createUserProfile({
    skinType: undefined,
    hairType: undefined,
    sensitivities: [],
    avoidIngredients: [],
    knownReactions: [],
  });

  profileIdByClient.set(clientKey, created.id);
  return created;
}


async function getProfileForClientIfExists(clientKey: string) {
  const profileId = profileIdByClient.get(clientKey);
  if (!profileId) return undefined;
  return storage.domain.getUserProfile(profileId);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/profile", async (req, res) => {
    try {
      const clientKey = getClientThrottleKey(req);
      const profile = await getOrCreateProfileForClient(clientKey);
      return res.json({ profile });
    } catch (error) {
      console.error("Profile get error:", error);
      return res.status(500).json({ error: "Profil alınamadı." });
    }
  });

  app.put("/api/profile", async (req, res) => {
    const parsedBody = profileUpdateSchema.safeParse(req.body ?? {});

    if (!parsedBody.success) {
      return res.status(400).json({ error: "Geçersiz profil verisi." });
    }

    try {
      const clientKey = getClientThrottleKey(req);
      const profile = await getOrCreateProfileForClient(clientKey);
      const updated = await storage.domain.updateUserProfile(profile.id, parsedBody.data);

      if (!updated) {
        return res.status(500).json({ error: "Profil güncellenemedi." });
      }

      return res.json({ profile: updated });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ error: "Profil güncellenemedi." });
    }
  });

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

      const rawText = sanitizeModelText(data);

      if (!rawText) {
        return res.status(502).json({ error: "Modelden geçerli bir yanıt alınamadı." });
      }

      const structuredResult = parseStructuredAnalyzeResponse(rawText);
      const text = structuredResult.displayText?.trim() || rawText;
      const profile = await getProfileForClientIfExists(clientKey);

      const compatibility = evaluateRoutineCompatibility({
        ingredients: structuredResult.structured.ingredients,
        profile: profile
          ? {
              sensitivities: profile.sensitivities,
              avoidIngredients: profile.avoidIngredients,
              knownReactions: profile.knownReactions,
            }
          : undefined,
      });

      return res.json({
        text,
        structured: {
          ...structuredResult.structured,
          compatibility,
        },
      });
    } catch (err) {
      console.error("Gemini fetch error:", err);
      return res.status(502).json({ error: "API isteği başarısız oldu. Lütfen tekrar deneyin." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
