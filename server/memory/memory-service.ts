import type { IDomainStorage } from "../domain-storage";
import type {
  PersonalMemoryForAnalyze,
  PersonalMemorySignal,
  PersonalMemorySummary,
} from "./memory-types";

type IngredientStats = {
  original: string;
  cautionCount: number;
  positiveCount: number;
  seenCount: number;
  traits: Set<string>;
};

function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase();
}

function trackTraits(args: {
  itch: number | null;
  dryness: number | null;
  reaction: number | null;
  relief: number | null;
  satisfaction: number | null;
}): { cautionTraits: string[]; positiveTraits: string[] } {
  const cautionTraits: string[] = [];
  const positiveTraits: string[] = [];

  if ((args.reaction ?? 0) >= 2) cautionTraits.push("reaction");
  if ((args.itch ?? 0) >= 2) cautionTraits.push("itch");
  if ((args.dryness ?? 0) >= 2) cautionTraits.push("dryness");

  if ((args.relief ?? 0) >= 2) positiveTraits.push("relief");
  if ((args.satisfaction ?? 0) >= 4) positiveTraits.push("satisfaction");

  return { cautionTraits, positiveTraits };
}

function toSignal(args: {
  ingredient: string;
  stats: IngredientStats;
  direction: "positive" | "caution";
}): PersonalMemorySignal {
  const evidenceCount =
    args.direction === "caution" ? args.stats.cautionCount : args.stats.positiveCount;
  const confidenceLabel = evidenceCount >= 2 ? "repeated" : "limited";

  const message =
    args.direction === "caution"
      ? confidenceLabel === "repeated"
        ? `${args.ingredient} içeren ürünler geçmişte hassasiyet sinyalleriyle tekrar tekrar ilişkili göründü.`
        : `${args.ingredient} içeren bir üründe geçmişte hassasiyet sinyali görüldü (sınırlı kanıt).`
      : confidenceLabel === "repeated"
        ? `${args.ingredient} içeren ürünler geçmişte olumlu geri bildirimle tekrar tekrar ilişkili göründü.`
        : `${args.ingredient} içeren bir üründe geçmişte olumlu sinyal görüldü (sınırlı kanıt).`;

  return {
    ingredient: args.ingredient,
    direction: args.direction,
    evidenceCount,
    relatedTraits: Array.from(args.stats.traits).slice(0, 3),
    message,
    confidenceLabel,
  };
}

export async function derivePersonalMemory(
  storage: IDomainStorage,
  profileId: string,
): Promise<PersonalMemorySummary> {
  const trackings = await storage.listProductTrackingsByProfile(profileId);
  if (trackings.length === 0) {
    return {
      status: "insufficient",
      evidenceLevel: "none",
      summary: "Kişisel hafıza için henüz takip geçmişi bulunmuyor.",
      signals: [],
    };
  }

  const ingredientStats = new Map<string, IngredientStats>();

  for (const tracking of trackings) {
    const product = await storage.getProduct(tracking.productId);
    if (!product?.ingredients?.length) continue;

    const feedbacks = await storage.listFeedbackByTracking(tracking.id);
    if (feedbacks.length === 0) continue;

    for (const feedback of feedbacks) {
      const { cautionTraits, positiveTraits } = trackTraits({
        itch: feedback.itch,
        dryness: feedback.dryness,
        reaction: feedback.reaction,
        relief: feedback.relief,
        satisfaction: feedback.satisfaction,
      });

      if (cautionTraits.length === 0 && positiveTraits.length === 0) continue;

      const uniqueIngredients = Array.from(
        new Set(product.ingredients.map((item) => item.trim()).filter(Boolean)),
      );

      for (const ingredient of uniqueIngredients) {
        const key = normalizeIngredient(ingredient);
        if (!key) continue;

        const current = ingredientStats.get(key) ?? {
          original: ingredient,
          cautionCount: 0,
          positiveCount: 0,
          seenCount: 0,
          traits: new Set<string>(),
        };

        current.seenCount += 1;
        for (const trait of cautionTraits) {
          current.cautionCount += 1;
          current.traits.add(trait);
        }
        for (const trait of positiveTraits) {
          current.positiveCount += 1;
          current.traits.add(trait);
        }

        ingredientStats.set(key, current);
      }
    }
  }

  const signals: PersonalMemorySignal[] = [];

  for (const stats of ingredientStats.values()) {
    const repeatedCaution = stats.cautionCount >= 2;
    const limitedCaution = stats.cautionCount >= 1 && stats.cautionCount >= stats.positiveCount;

    if (repeatedCaution || limitedCaution) {
      signals.push(toSignal({ ingredient: stats.original, stats, direction: "caution" }));
      continue;
    }

    const repeatedPositive = stats.positiveCount >= 2 && stats.cautionCount === 0;
    const limitedPositive = stats.positiveCount >= 1 && stats.cautionCount === 0;

    if (repeatedPositive || limitedPositive) {
      signals.push(toSignal({ ingredient: stats.original, stats, direction: "positive" }));
    }
  }

  const sorted = signals.sort((a, b) => {
    if (a.direction !== b.direction) {
      return a.direction === "caution" ? -1 : 1;
    }
    return b.evidenceCount - a.evidenceCount;
  });

  if (sorted.length === 0) {
    return {
      status: "insufficient",
      evidenceLevel: "none",
      summary: "Geçmiş geri bildirimlerden anlamlı kişisel hafıza sinyali çıkarılamadı.",
      signals: [],
    };
  }

  const repeatedCount = sorted.filter((signal) => signal.confidenceLabel === "repeated").length;
  const evidenceLevel = repeatedCount > 0 ? "moderate" : "limited";

  return {
    status: "available",
    evidenceLevel,
    summary:
      evidenceLevel === "moderate"
        ? "Takip geçmişinizde tekrar eden kişisel desenler bulundu."
        : "Takip geçmişinizden sınırlı kişisel hafıza sinyalleri çıkarıldı.",
    signals: sorted.slice(0, 8),
  };
}

export async function derivePersonalMemoryForAnalyze(args: {
  storage: IDomainStorage;
  profileId: string;
  analyzedIngredients: string[];
}): Promise<PersonalMemoryForAnalyze> {
  const memory = await derivePersonalMemory(args.storage, args.profileId);

  if (memory.status === "insufficient" || memory.signals.length === 0) {
    return {
      ...memory,
      matchedSignals: [],
    };
  }

  const normalizedInput = new Set(args.analyzedIngredients.map(normalizeIngredient));
  const matchedSignals = memory.signals.filter((signal) =>
    normalizedInput.has(normalizeIngredient(signal.ingredient)),
  );

  return {
    ...memory,
    matchedSignals,
  };
}
