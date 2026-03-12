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
};

export type AnalyzeApiResponse = {
  text?: string;
  structured?: StructuredAnalysis;
  error?: string;
};
