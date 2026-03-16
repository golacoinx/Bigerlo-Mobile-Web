import type { AnalyzeApiResponse } from "@/lib/chat/analysis-types";
import {
  buildAssistantAnalysisMessage,
  extractAnalysisResult,
} from "@/lib/agents/analysis-agent";
import { buildComparisonResult } from "@/lib/agents/comparison-agent";
import { buildRiskResultFromAnalyzeResponse } from "@/lib/agents/risk-agent";
import { mapAnalyzeResponseToAnalyzedProduct } from "@/lib/session/analysis-session-mappers";
import type {
  AnalyzedProduct,
  ComparisonResult,
} from "@/lib/session/analysis-session-types";

export type UserInputPayload = {
  id: string;
  type: "text" | "image" | "text+image";
  text?: string;
  imageUri?: string;
  createdAt: string;
};

export type OrchestratorAnalyzeResult = {
  analyzedProduct: AnalyzedProduct;
  comparison: ComparisonResult | null;
  assistantMessageText: string;
  rawResponse: unknown;
};

export function orchestrateInitialAnalysis(args: {
  userInput: UserInputPayload;
  response: AnalyzeApiResponse;
  existingAnalyzedProducts: AnalyzedProduct[];
}): OrchestratorAnalyzeResult {
  const { userInput, response, existingAnalyzedProducts } = args;

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

  const comparison = buildComparisonResult([
    ...existingAnalyzedProducts,
    analyzedProduct,
  ]);

  const assistantMessageText = buildAssistantAnalysisMessage({
    response,
    analysisResult,
  });

  return {
    analyzedProduct,
    comparison,
    assistantMessageText,
    rawResponse: response,
  };
}
