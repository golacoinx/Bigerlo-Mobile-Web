import type { AnalyzeApiResponse } from "@/lib/chat/analysis-types";
import { buildAssistantAnalysisMessage, extractAnalysisResult } from "@/lib/agents/analysis-agent";
import { buildComparisonResult, selectComparisonCandidates } from "@/lib/agents/comparison-agent";
import { buildRiskResultFromAnalyzeResponse } from "@/lib/agents/risk-agent";
import { mapAnalyzeResponseToAnalyzedProduct } from "@/lib/session/analysis-session-mappers";
import { appendAnalyzedProductAndResolveComparison } from "@/lib/session/analysis-session-store";
import type { AnalysisSessionState, AnalyzedProduct, ComparisonResult } from "@/lib/session/analysis-session-types";

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

export type OrchestratorSessionUpdateResult = {
  nextState: AnalysisSessionState;
  comparison: ComparisonResult | null;
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

export function orchestrateSessionUpdateAfterAnalysis(args: {
  state: AnalysisSessionState;
  analyzedProduct: AnalyzedProduct;
}): OrchestratorSessionUpdateResult {
  const candidates = selectComparisonCandidates([
    ...args.state.analyzedProducts,
    args.analyzedProduct,
  ]);

  const comparison = candidates
    ? buildComparisonResult({ left: candidates.left, right: candidates.right })
    : null;

  return {
    nextState: appendAnalyzedProductAndResolveComparison(
      args.state,
      args.analyzedProduct,
      comparison,
    ),
    comparison,
  };
}
