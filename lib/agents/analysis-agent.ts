import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { AnalysisResult } from "@/lib/session/analysis-session-types";

const DEFAULT_SUMMARY = "Analiz sonucu alındı.";

export function extractAnalysisResult(args: {
  responseText?: string;
  fallbackText?: string;
  structured?: StructuredAnalysis;
}): AnalysisResult {
  const { responseText, fallbackText, structured } = args;

  const summary =
    structured?.analysis.summary?.trim() ||
    responseText?.trim() ||
    fallbackText?.trim() ||
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
  };
}

export function buildAssistantAnalysisMessage(args: {
  response: AnalyzeApiResponse;
  analysisResult: AnalysisResult;
}): string {
  const { response, analysisResult } = args;

  return response.text?.trim() || analysisResult.summary || DEFAULT_SUMMARY;
}
