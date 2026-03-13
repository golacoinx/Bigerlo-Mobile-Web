export type CompatibilityStatus = "compatible" | "caution" | "conflict" | "unknown";

export type CompatibilitySignal = {
  type: "avoid-ingredient" | "sensitivity-match" | "known-reaction" | "insufficient-data";
  ingredient?: string;
  profileField?: "avoidIngredients" | "sensitivities" | "knownReactions";
};

export type CompatibilityResult = {
  status: CompatibilityStatus;
  reasons: string[];
  signals: CompatibilitySignal[];
};

export type StructuredAnalysis = {
  product: {
    name: string;
    brand: string;
    type:
      | "cleanser"
      | "serum"
      | "moisturizer"
      | "sunscreen"
      | "treatment"
      | "hair-care"
      | "cleaning"
      | "other";
  };
  ingredients: string[];
  analysis: {
    summary: string;
    risks: string[];
    suitability: "good" | "caution" | "avoid" | "unknown";
    confidence: number;
    cautionNote?: string;
  };
  compatibility?: CompatibilityResult;
};

export type AnalyzeApiResponse = {
  text?: string;
  structured?: StructuredAnalysis;
  error?: string;
};
