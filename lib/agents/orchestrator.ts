import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import {
  buildAssistantAnalysisMessage,
  extractAnalysisResult,
} from "@/lib/agents/analysis-agent";
import { buildComparisonResult } from "@/lib/agents/comparison-agent";
import { classifyUserInput, type InputIntent } from "@/lib/agents/input-classifier";
import { buildRiskResultFromAnalyzeResponse } from "@/lib/agents/risk-agent";
import { sanitizeAssistantText } from "@/lib/agents/response-sanitizer";
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

export type OrchestratorMode = InputIntent;

export type OrchestratorAnalyzeResult = {
  mode: OrchestratorMode;
  assistantMessageText: string;
  structuredResult?: StructuredAnalysis;
  analyzedProduct?: AnalyzedProduct;
  comparison: ComparisonResult | null;
};

export function orchestrateInitialAnalysis(args: {
  userInput: UserInputPayload;
  response: AnalyzeApiResponse;
  existingAnalyzedProducts: AnalyzedProduct[];
}): OrchestratorAnalyzeResult {
  const { userInput, response, existingAnalyzedProducts } = args;

  const mode = classifyUserInput(userInput);
  const sanitizedResponseText = sanitizeAssistantText(response.text);

  if (mode === "general-chat") {
    return {
      mode,
      assistantMessageText:
        response.text?.trim() ? sanitizedResponseText : "Merhaba! Size nasıl yardımcı olabilirim?",
      structuredResult: undefined,
      comparison: null,
    };
  }

  if (mode === "general-knowledge") {
    return {
      mode,
      assistantMessageText: sanitizedResponseText,
      structuredResult: undefined,
      comparison: null,
    };
  }

  if (mode === "unclear") {
    return {
      mode,
      assistantMessageText: "Sorunuzu biraz daha netleştirebilir misiniz?",
      structuredResult: undefined,
      comparison: null,
    };
  }

  const analysisResult = extractAnalysisResult({
    responseText: response.text,
    structured: response.structured,
  });

  const riskResult = buildRiskResultFromAnalyzeResponse({
    response,
    analysisResult,
  });

  const analyzedProduct = mapAnalyzeResponseToAnalyzedProduct({
    response,
    sourceInputId: userInput.id,
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
    mode,
    assistantMessageText,
    structuredResult: response.structured,
    analyzedProduct,
    comparison,
  };
}
