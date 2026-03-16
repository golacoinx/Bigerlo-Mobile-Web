export type ProductDetectionResult = {
  productName?: string;
  brand?: string;
  category?: string;
  confidence: number;
};

export type IngredientExtractionResult = {
  ingredients: string[];
  normalizedIngredients: string[];
  confidence: number;
};

export type AnalysisResult = {
  summary: string;
  positives: string[];
  cautions: string[];
  suggestedFor?: string[];
};

export type RiskResult = {
  risks: string[];
  warnings: string[];
  personalCautions: string[];
};

export type AnalyzedProduct = {
  id: string;
  sourceInputId: string;
  productDetection?: ProductDetectionResult;
  ingredientExtraction?: IngredientExtractionResult;
  analysis?: AnalysisResult;
  risk?: RiskResult;
  createdAt: string;
};

export type ComparisonResult = {
  leftProductId: string;
  rightProductId: string;
  winnerByCategory: {
    safety?: "left" | "right" | "tie";
    suitability?: "left" | "right" | "tie";
    value?: "left" | "right" | "tie";
  };
  summary: string;
};

export type PriceResult = {
  productId: string;
  offers: Array<{
    seller: string;
    price: number;
    currency: string;
    url?: string;
  }>;
  cheapestLabel?: string;
};

export type AnalysisSessionState = {
  analyzedProducts: AnalyzedProduct[];
  activeProductId?: string;
  comparison?: ComparisonResult | null;
  priceLookupByProductId?: Record<string, PriceResult | undefined>;
};
