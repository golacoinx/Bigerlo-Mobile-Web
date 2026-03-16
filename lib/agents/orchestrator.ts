import type { AnalyzeApiResponse } from "@/lib/chat/analysis-types";
import { buildAssistantAnalysisMessage, extractAnalysisResult } from "@/lib/agents/analysis-agent";
import { buildRiskResultFromAnalyzeResponse } from "@/lib/agents/risk-agent";
import { mapAnalyzeResponseToAnalyzedProduct } from "@/lib/session/analysis-session-mappers";
import type { AnalyzedProduct } from "@/lib/session/analysis-session-types";

export type UserInputPayload = {
  id: string;
  type: "text" | "image" | "text+image";
  text?: string;
  imageUri?: string;
  createdAt: string;
};

export type OrchestratorAnalyzeResult = {
  analyzedProduct: AnalyzedProduct;
  assistantMessageText: string;
  rawResponse: unknown;
};

type OrchestrateInitialAnalysisArgs = {
  userInput: UserInputPayload;
  analyzeResponse: AnalyzeApiResponse;
};

export function orchestrateInitialAnalysis(
  args: OrchestrateInitialAnalysisArgs,
): OrchestratorAnalyzeResult {
  const { userInput, analyzeResponse } = args;
  const assistantMessageText = buildAssistantAnalysisMessage({
    text: analyzeResponse.text,
    structured: analyzeResponse.structured,
  });

  const analysis = extractAnalysisResult({
    text: analyzeResponse.text,
    structured: analyzeResponse.structured,
  });

  const risk = buildRiskResultFromAnalyzeResponse({
    text: analyzeResponse.text,
    structured: analyzeResponse.structured,
  });

  const analyzedProduct = mapAnalyzeResponseToAnalyzedProduct({
    sourceInputId: userInput.id,
    text: assistantMessageText,
    structured: analyzeResponse.structured,
    analysis,
    risk,
  });

  return {
    analyzedProduct,
    assistantMessageText,
    rawResponse: analyzeResponse,
  };
}
