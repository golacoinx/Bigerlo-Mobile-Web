import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import type {
  AnalysisResult,
  AnalyzedProduct,
  IngredientExtractionResult,
  ProductDetectionResult,
} from "@/lib/session/analysis-session-types";

type MapAnalyzeResponseArgs = {
  response: AnalyzeApiResponse;
  sourceInputId: string;
  fallbackText?: string;
  createdAt?: string;
  id?: string;
};

const DEFAULT_SUMMARY = "Analiz sonucu alındı.";

function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase();
}

function extractProductDetection(structured?: StructuredAnalysis): ProductDetectionResult | undefined {
  if (!structured) return undefined;

  const productName = structured.product.name?.trim();
  const brand = structured.product.brand?.trim();
  const category = structured.product.type?.trim();

  if (!productName && !brand && !category) {
    return undefined;
  }

  return {
    productName,
    brand,
    category,
    confidence: typeof structured.analysis.confidence === "number" ? structured.analysis.confidence : 0,
  };
}

function extractIngredientResult(
  structured?: StructuredAnalysis
): IngredientExtractionResult | undefined {
  if (!structured || structured.ingredients.length === 0) {
    return undefined;
  }

  const ingredients = structured.ingredients
    .map((item) => item.trim())
    .filter(Boolean);

  if (ingredients.length === 0) {
    return undefined;
  }

  const normalizedIngredients = Array.from(new Set(ingredients.map(normalizeIngredient)));

  return {
    ingredients,
    normalizedIngredients,
    confidence: typeof structured.analysis.confidence === "number" ? structured.analysis.confidence : 0,
  };
}

function extractAnalysisResult(
  responseText: string | undefined,
  structured?: StructuredAnalysis
): AnalysisResult {
  const summary = structured?.analysis.summary?.trim() || responseText?.trim() || DEFAULT_SUMMARY;

  const positives: string[] = [];
  const cautions: string[] = [];

  if (structured?.analysis.suitability === "good") {
    positives.push("Uygunluk değerlendirmesi olumlu.");
  }

  if (structured?.analysis.cautionNote) {
    cautions.push(structured.analysis.cautionNote);
  }

  if (structured?.analysis.risks?.length) {
    cautions.push(...structured.analysis.risks);
  }

  return {
    summary,
    positives,
    cautions,
  };
}

export function mapAnalyzeResponseToAnalyzedProduct({
  response,
  sourceInputId,
  fallbackText,
  createdAt,
  id,
}: MapAnalyzeResponseArgs): AnalyzedProduct {
  const structured = response.structured;
  const productId =
    id ||
    structured?.productId ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resolvedCreatedAt = createdAt ?? new Date().toISOString();

  return {
    id: productId,
    sourceInputId,
    productDetection: extractProductDetection(structured),
    ingredientExtraction: extractIngredientResult(structured),
    analysis: extractAnalysisResult(response.text ?? fallbackText, structured),
    risk: {
      risks: structured?.analysis.risks ?? [],
      warnings: structured?.analysis.cautionNote ? [structured.analysis.cautionNote] : [],
      personalCautions: [],
    },
    createdAt: resolvedCreatedAt,
  };
}
