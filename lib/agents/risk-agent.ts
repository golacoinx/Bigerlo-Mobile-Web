import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { AnalysisResult, RiskResult } from "@/lib/session/analysis-session-types";

function normalizeItem(value: string): string {
  return value.trim();
}

export function normalizeRiskList(items: Array<string | null | undefined>): string[] {
  const normalized = items.map((item) => normalizeItem(item ?? "")).filter(Boolean);
  return Array.from(new Set(normalized));
}

export function extractRiskResult(args: {
  structured?: StructuredAnalysis;
  analysisResult?: AnalysisResult;
}): RiskResult {
  const { structured, analysisResult } = args;

  const risks = normalizeRiskList([
    ...(structured?.analysis.risks ?? []),
    ...(analysisResult?.cautions ?? []),
  ]);

  const warnings = normalizeRiskList([
    structured?.analysis.cautionNote,
    structured?.analysis.suitability === "caution"
      ? "Ürünü kademeli ve dikkatli şekilde deneyin."
      : undefined,
    structured?.analysis.suitability === "avoid"
      ? "Bu ürün sizin için uygun olmayabilir, dikkatli olun."
      : undefined,
  ]);

  const personalCautions = normalizeRiskList([
    structured?.compatibility?.status === "caution"
      ? "Hassasiyet geçmişiniz varsa küçük bir bölgede test edin."
      : undefined,
    structured?.compatibility?.status === "conflict"
      ? "Kişisel profilinizle çelişebilecek sinyaller var; kullanmadan önce içeriği tekrar kontrol edin."
      : undefined,
    structured?.memory?.status === "insufficient"
      ? "Kişisel geçmiş verisi sınırlı; ürünü gözlemleyerek kullanın."
      : undefined,
  ]);

  return {
    risks,
    warnings,
    personalCautions,
  };
}

export function buildRiskResultFromAnalyzeResponse(args: {
  response: AnalyzeApiResponse;
  analysisResult?: AnalysisResult;
}): RiskResult {
  const { response, analysisResult } = args;

  return extractRiskResult({
    structured: response.structured,
    analysisResult,
  });
}
