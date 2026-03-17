import type { AnalyzeApiResponse } from "@/lib/chat/analysis-types";
import {
  buildAssistantAnalysisMessage,
  extractAnalysisResult,
} from "@/lib/agents/analysis-agent";
import { buildComparisonResult } from "@/lib/agents/comparison-agent";
import {
  classifyUserInput,
  type InputIntent,
  hasUsableProductSignal,
} from "@/lib/agents/input-classifier";
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
  analyzedProduct?: AnalyzedProduct;
  comparison: ComparisonResult | null;
  assistantMessageText: string;
  shouldAttachStructuredResult: boolean;
  rawResponse: AnalyzeApiResponse;
};

function hasMeaningfulAnalyzedProduct(product: AnalyzedProduct): boolean {
  const hasProductSignal = Boolean(
    product.productDetection?.productName ||
      product.productDetection?.brand ||
      product.productDetection?.category
  );

  const summary = product.analysis?.summary?.trim() ?? "";
  const hasMeaningfulSummary = summary.length >= 12;

  const hasIngredientSignal = (product.ingredientExtraction?.ingredients.length ?? 0) > 0;

  return hasProductSignal || hasMeaningfulSummary || hasIngredientSignal;
}

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
      comparison: null,
      assistantMessageText:
        response.text?.trim() ? sanitizedResponseText : "Merhaba! Size nasıl yardımcı olabilirim?",
      shouldAttachStructuredResult: false,
      rawResponse: response,
    };
  }

  if (mode === "general-knowledge") {
    return {
      mode,
      comparison: null,
      assistantMessageText: sanitizedResponseText,
      shouldAttachStructuredResult: false,
      rawResponse: response,
    };
  }

  if (mode === "unclear") {
    return {
      mode,
      comparison: null,
      assistantMessageText: "Sorunuzu biraz daha netleştirebilir misiniz?",
      shouldAttachStructuredResult: false,
      rawResponse: response,
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

  if (!hasMeaningfulAnalyzedProduct(analyzedProduct) && !hasUsableProductSignal(userInput)) {
    return {
      mode: "unclear",
      comparison: null,
      assistantMessageText: "Sorunuzu biraz daha netleştirebilir misiniz?",
      shouldAttachStructuredResult: false,
      rawResponse: response,
    };
  }

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
    analyzedProduct,
    comparison,
    assistantMessageText,
    shouldAttachStructuredResult: true,
    rawResponse: response,
  };
}
