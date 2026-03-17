import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import { sanitizeAssistantText } from "@/lib/agents/response-sanitizer";
import type { AnalysisResult } from "@/lib/session/analysis-session-types";

const DEFAULT_SUMMARY = "Analiz sonucu alındı.";

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
  };
}

export function buildAssistantAnalysisMessage(args: {
  response: AnalyzeApiResponse;
  analysisResult: AnalysisResult;
}): string {
  const { response, analysisResult } = args;

  return sanitizeAssistantText(response.text) || analysisResult.summary || DEFAULT_SUMMARY;
}
