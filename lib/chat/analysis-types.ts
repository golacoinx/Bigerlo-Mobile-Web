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

export type PersonalMemorySignal = {
  ingredient: string;
  direction: "positive" | "caution";
  evidenceCount: number;
  relatedTraits: string[];
  message: string;
  confidenceLabel: "limited" | "repeated";
};

export type PersonalMemory = {
  status: "insufficient" | "available";
  summary: string;
  evidenceLevel: "none" | "limited" | "moderate";
  signals: PersonalMemorySignal[];
  matchedSignals?: PersonalMemorySignal[];
};

export type StructuredAnalysis = {
  productId?: string;
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
  memory?: PersonalMemory;
};

export type AnalyzeApiResponse = {
  text?: string;
  structured?: StructuredAnalysis;
  error?: string;
};


export type TrackingSummary = {
  trackingId: string;
  productId: string;
  productName: string;
  productBrand: string;
  productType: string;
  status: "planned" | "active" | "paused" | "stopped" | "completed";
  startedAt: string | null;
  nextCheckInAt: string | null;
  checkInSchedule: Array<{ dayOffset: number; dueAt: string }>;
};


export type CheckInItem = {
  trackingId: string;
  productId: string;
  productName: string;
  productBrand: string;
  dueAt: string;
  dayOffset: number;
  checkInLabel: string;
  status: "due" | "upcoming";
};


export type ReminderItem = {
  reminderId: string;
  trackingId: string;
  dayOffset: number;
  productId: string;
  productName: string;
  productBrand: string;
  dueAt: string;
  status: "due" | "upcoming";
  severity: "high" | "medium";
  label: string;
  message: string;
};
