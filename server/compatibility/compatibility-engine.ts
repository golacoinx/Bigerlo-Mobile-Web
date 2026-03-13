import type { UserProfile } from "@shared/domain";
import type { CompatibilityResult, CompatibilitySignal } from "./compatibility-types";

type CompatibilityInput = {
  ingredients: string[];
  profile?: Pick<UserProfile, "sensitivities" | "avoidIngredients" | "knownReactions">;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesEitherWay(ingredient: string, term: string) {
  const a = normalize(ingredient);
  const b = normalize(term);

  return a.includes(b) || b.includes(a);
}

function hasProfileData(profile?: CompatibilityInput["profile"]) {
  if (!profile) return false;

  return (
    profile.avoidIngredients.length > 0 ||
    profile.sensitivities.length > 0 ||
    profile.knownReactions.length > 0
  );
}

export function evaluateRoutineCompatibility(input: CompatibilityInput): CompatibilityResult {
  const ingredients = input.ingredients.map((item) => normalize(item)).filter(Boolean);
  const profile = input.profile;

  const reasons: string[] = [];
  const signals: CompatibilitySignal[] = [];

  if (!profile || !hasProfileData(profile)) {
    return {
      status: "unknown",
      reasons: ["Profil bilgisi olmadığı için uyumluluk belirlenemedi."],
      signals: [{ type: "insufficient-data" }],
    };
  }

  if (ingredients.length === 0) {
    return {
      status: "unknown",
      reasons: ["İçerik listesi net olmadığı için uyumluluk belirlenemedi."],
      signals: [{ type: "insufficient-data" }],
    };
  }

  const avoidMatches = profile.avoidIngredients
    .flatMap((term) =>
      ingredients
        .filter((ingredient) => includesEitherWay(ingredient, term))
        .map((ingredient) => ({ term, ingredient })),
    )
    .filter((match, idx, arr) => arr.findIndex((item) => item.ingredient === match.ingredient) === idx);

  for (const match of avoidMatches) {
    reasons.push(`Kaçınılması gereken içerik bulundu: ${match.ingredient}.`);
    signals.push({
      type: "avoid-ingredient",
      ingredient: match.ingredient,
      profileField: "avoidIngredients",
    });
  }

  const sensitivityMatches = profile.sensitivities
    .flatMap((term) =>
      ingredients
        .filter((ingredient) => includesEitherWay(ingredient, term))
        .map((ingredient) => ({ term, ingredient })),
    )
    .filter((match, idx, arr) => arr.findIndex((item) => item.ingredient === match.ingredient) === idx);

  for (const match of sensitivityMatches) {
    reasons.push(`Hassasiyetle ilişkili içerik görüldü: ${match.ingredient}.`);
    signals.push({
      type: "sensitivity-match",
      ingredient: match.ingredient,
      profileField: "sensitivities",
    });
  }

  const reactionMatches = profile.knownReactions
    .flatMap((term) =>
      ingredients
        .filter((ingredient) => includesEitherWay(ingredient, term))
        .map((ingredient) => ({ term, ingredient })),
    )
    .filter((match, idx, arr) => arr.findIndex((item) => item.ingredient === match.ingredient) === idx);

  for (const match of reactionMatches) {
    reasons.push(`Daha önce reaksiyon bildirilen içerik görüldü: ${match.ingredient}.`);
    signals.push({
      type: "known-reaction",
      ingredient: match.ingredient,
      profileField: "knownReactions",
    });
  }

  if (signals.some((signal) => signal.type === "avoid-ingredient")) {
    return { status: "conflict", reasons, signals };
  }

  if (
    signals.some(
      (signal) => signal.type === "sensitivity-match" || signal.type === "known-reaction",
    )
  ) {
    return { status: "caution", reasons, signals };
  }

  return {
    status: "compatible",
    reasons: ["Profilde belirtilen belirgin bir içerik çatışması tespit edilmedi."],
    signals,
  };
}
