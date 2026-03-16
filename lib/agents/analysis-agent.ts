import type { StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { AnalysisResult } from "@/lib/session/analysis-session-types";

type ExtractAnalysisResultArgs = {
  text?: string;
  structured?: StructuredAnalysis;
};

function dedupe(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
}

export function extractAnalysisResult(args: ExtractAnalysisResultArgs): AnalysisResult {
  const cautions = dedupe([
    ...(args.structured?.analysis?.risks ?? []),
    args.structured?.analysis?.cautionNote,
  ]);

  return {
    summary:
      args.structured?.analysis?.summary?.trim() || args.text?.trim() || "Analiz özeti bulunamadı.",
    positives: [],
    cautions,
    suggestedFor: undefined,
  };
}

export function buildAssistantAnalysisMessage(args: ExtractAnalysisResultArgs): string {
  return args.text?.trim() || args.structured?.analysis?.summary?.trim() || "Yanıt alınamadı.";
}
