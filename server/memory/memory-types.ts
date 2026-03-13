export type PersonalMemorySignalDirection = "positive" | "caution";

export type PersonalMemoryEvidenceLevel = "none" | "limited" | "moderate";

export type PersonalMemorySignal = {
  ingredient: string;
  direction: PersonalMemorySignalDirection;
  evidenceCount: number;
  relatedTraits: string[];
  message: string;
  confidenceLabel: "limited" | "repeated";
};

export type PersonalMemorySummary = {
  status: "insufficient" | "available";
  summary: string;
  evidenceLevel: PersonalMemoryEvidenceLevel;
  signals: PersonalMemorySignal[];
};

export type PersonalMemoryForAnalyze = PersonalMemorySummary & {
  matchedSignals: PersonalMemorySignal[];
};
