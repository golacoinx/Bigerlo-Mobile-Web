import type { StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { AnalyzedProduct, RiskResult } from "@/lib/session/analysis-session-types";

type MapAnalyzeResponseToAnalyzedProductArgs = {
  sourceInputId: string;
  text?: string;
  structured?: StructuredAnalysis;
};

function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase();
}

function dedupe(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
}

export function mapAnalyzeResponseToAnalyzedProduct(
  args: MapAnalyzeResponseToAnalyzedProductArgs,
): AnalyzedProduct {
  const { sourceInputId, text, structured } = args;
  const now = new Date().toISOString();

  const ingredients = dedupe(structured?.ingredients ?? []);
  const normalizedIngredients = ingredients.map(normalizeIngredient).filter(Boolean);

  const positiveFromMemory =
    structured?.memory?.matchedSignals
      ?.filter((signal) => signal.direction === "positive")
      .map((signal) => signal.message) ?? [];

  const cautionFromMemory =
    structured?.memory?.matchedSignals
      ?.filter((signal) => signal.direction === "caution")
      .map((signal) => signal.message) ?? [];

  const cautions = dedupe([
    ...(structured?.analysis?.risks ?? []),
    structured?.analysis?.cautionNote,
    ...cautionFromMemory,
  ]);

  const risk: RiskResult | undefined = structured
    ? {
        risks: structured.analysis.risks ?? [],
        warnings: structured.analysis.cautionNote ? [structured.analysis.cautionNote] : [],
        personalCautions: cautionFromMemory,
      }
    : undefined;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceInputId,
    productDetection: structured
      ? {
          productName: structured.product.name || undefined,
          brand: structured.product.brand || undefined,
          category: structured.product.type || undefined,
          confidence: structured.analysis.confidence ?? 0,
        }
      : {
          confidence: 0,
        },
    ingredientExtraction: {
      ingredients,
      normalizedIngredients,
      confidence: structured?.analysis?.confidence ?? 0,
    },
    analysis: {
      summary: structured?.analysis?.summary?.trim() || text?.trim() || "Analiz özeti bulunamadı.",
      positives: dedupe(positiveFromMemory),
      cautions,
      suggestedFor: undefined,
    },
    risk,
    createdAt: now,
  };
}
