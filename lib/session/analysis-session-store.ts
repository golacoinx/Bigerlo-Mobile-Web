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
  product: AnalyzedProduct
): AnalysisSessionState {
  return {
    ...state,
    analyzedProducts: [...state.analyzedProducts, product],
  };
}

export function setActiveProductId(
  state: AnalysisSessionState,
  productId: string
): AnalysisSessionState {
  return {
    ...state,
    activeProductId: productId,
  };
}
