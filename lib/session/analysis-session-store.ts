import type { AnalysisSessionState, AnalyzedProduct } from "@/lib/session/analysis-session-types";

export function createInitialAnalysisSessionState(): AnalysisSessionState {
  return {
    analyzedProducts: [],
    activeProductId: undefined,
    comparison: null,
    priceLookupByProductId: {},
  };
}

export function addAnalyzedProduct(
  state: AnalysisSessionState,
  analyzedProduct: AnalyzedProduct,
): AnalysisSessionState {
  return {
    ...state,
    analyzedProducts: [...state.analyzedProducts, analyzedProduct],
  };
}

export function setActiveProductId(
  state: AnalysisSessionState,
  activeProductId?: string,
): AnalysisSessionState {
  return {
    ...state,
    activeProductId,
  };
}
