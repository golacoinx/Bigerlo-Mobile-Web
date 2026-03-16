import type { AnalyzeApiResponse } from "@/lib/chat/analysis-types";
import {
  buildAssistantAnalysisMessage,
  extractAnalysisResult,
} from "@/lib/agents/analysis-agent";
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

export function orchestrateInitialAnalysis(args: {
  userInput: UserInputPayload;
  response: AnalyzeApiResponse;
}): OrchestratorAnalyzeResult {
  const { userInput, response } = args;

  const analysisResult = extractAnalysisResult({
    responseText: response.text,
    fallbackText: userInput.text,
    structured: response.structured,
  });

  const riskResult = buildRiskResultFromAnalyzeResponse({
    response,
    analysisResult,
  });

  const analyzedProduct = mapAnalyzeResponseToAnalyzedProduct({
    response,
    sourceInputId: userInput.id,
    fallbackText: userInput.text,
    createdAt: userInput.createdAt,
    analysisOverride: analysisResult,
    riskOverride: riskResult,
  });

  const assistantMessageText = buildAssistantAnalysisMessage({
    response,
    analysisResult,
  });

  return {
    analyzedProduct,
    assistantMessageText,
    rawResponse: response,
  };
}
