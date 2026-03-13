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
