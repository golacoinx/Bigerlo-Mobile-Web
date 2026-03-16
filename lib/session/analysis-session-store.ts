import type {
  AnalysisSessionState,
  AnalyzedProduct,
  ComparisonResult,
} from "@/lib/session/analysis-session-types";

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

export function setComparison(
  state: AnalysisSessionState,
  comparison: ComparisonResult | null
): AnalysisSessionState {
  return {
    ...state,
    comparison,
  };
}

export function appendAnalyzedProductAsActive(
  state: AnalysisSessionState,
  product: AnalyzedProduct
): AnalysisSessionState {
  return {
    ...state,
    analyzedProducts: [...state.analyzedProducts, product],
    activeProductId: product.id,
  };
}
