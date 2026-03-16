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

export function appendAnalyzedProductAsActive(
  state: AnalysisSessionState,
  analyzedProduct: AnalyzedProduct,
): AnalysisSessionState {
  const withProduct = addAnalyzedProduct(state, analyzedProduct);
  return setActiveProductId(withProduct, analyzedProduct.id);
}

export function getActiveAnalyzedProduct(state: AnalysisSessionState): AnalyzedProduct | undefined {
  if (!state.activeProductId) return undefined;
  return state.analyzedProducts.find((product) => product.id === state.activeProductId);
}
