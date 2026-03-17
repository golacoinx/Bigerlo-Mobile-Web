import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import { sanitizeAssistantText } from "@/lib/agents/response-sanitizer";
import type { AnalysisResult } from "@/lib/session/analysis-session-types";

const DEFAULT_SUMMARY = "Analiz sonucu alındı.";

function getSuitabilityVerdict(suitability: StructuredAnalysis["analysis"]["suitability"]): string {
  switch (suitability) {
    case "good":
      return "Genel olarak ürünü kullanmaya daha uygun bir profil çiziyor.";
    case "caution":
      return "Kullanımda dikkatli ve kademeli gitmek daha doğru olur.";
    case "avoid":
      return "Bu ürün sizin için güçlü bir aday görünmüyor.";
    default:
      return "Uygunluk için daha net kişisel veriyle tekrar değerlendirmek iyi olur.";
  }
}

function buildNaturalAnalysisNarrative(structured: StructuredAnalysis): string {
  const productName = structured.product.name?.trim() || "Bu ürün";
  const brand = structured.product.brand?.trim() || "markası belirsiz";
  const summary = structured.analysis.summary?.trim();
  const ingredients = structured.ingredients.slice(0, 5);

  const parts: string[] = [];

  parts.push(`${productName} (${brand}) için kısa değerlendirme:`);

  if (summary) {
    parts.push(summary);
  }

  if (ingredients.length > 0) {
    parts.push(`Formülde öne çıkan içerikler: ${ingredients.join(", ")}.`);
  }

  parts.push(getSuitabilityVerdict(structured.analysis.suitability));

  return parts.join(" ");
}

export function extractAnalysisResult(args: {
  responseText?: string;
  structured?: StructuredAnalysis;
}): AnalysisResult {
  const { responseText, structured } = args;

  const summary =
    structured?.analysis.summary?.trim() ||
    sanitizeAssistantText(responseText) ||
    DEFAULT_SUMMARY;

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
    suggestedFor: structured?.analysis.suitability === "good" ? ["genel kullanım"] : undefined,
  };
}

export function buildAssistantAnalysisMessage(args: {
  response: AnalyzeApiResponse;
  analysisResult: AnalysisResult;
}): string {
  const { response, analysisResult } = args;

  if (typeof response.text === "string" && response.text.trim()) {
    return sanitizeAssistantText(response.text);
  }

  if (response.structured) {
    return buildNaturalAnalysisNarrative(response.structured);
  }

  return analysisResult.summary || DEFAULT_SUMMARY;
}
