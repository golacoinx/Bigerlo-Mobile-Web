import type { AnalyzedProduct, ComparisonResult } from "@/lib/session/analysis-session-types";

type Winner = "left" | "right" | "tie";

type ComparisonCandidates = {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
};

function scoreSafety(product: AnalyzedProduct): number {
  const risks = product.risk?.risks.length ?? 0;
  const warnings = product.risk?.warnings.length ?? 0;
  const cautions = product.analysis?.cautions.length ?? 0;
  const personal = product.risk?.personalCautions.length ?? 0;

  return risks * 3 + warnings * 2 + cautions + personal;
}

function scoreSuitability(product: AnalyzedProduct): number {
  const positives = product.analysis?.positives.length ?? 0;
  const cautions = product.analysis?.cautions.length ?? 0;
  const personalCautions = product.risk?.personalCautions.length ?? 0;
  const suggestedFor = product.analysis?.suggestedFor?.length ?? 0;

  return positives * 2 + suggestedFor - cautions - personalCautions;
}

function label(product: AnalyzedProduct): string {
  return product.productDetection?.productName || "Ürün";
}

export function selectComparisonCandidates(
  analyzedProducts: AnalyzedProduct[],
): ComparisonCandidates | null {
  if (analyzedProducts.length < 2) return null;

  const pool = analyzedProducts.filter(
    (product) => (product.analysis?.summary?.trim().length ?? 0) > 0,
  );

  if (pool.length < 2) return null;

  const right = pool[pool.length - 1];
  const left = pool[pool.length - 2];

  if (!left || !right || left.id === right.id) return null;

  return { left, right };
}

export function decideWinnerByCategory(args: {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
}): ComparisonResult["winnerByCategory"] {
  const leftSafety = scoreSafety(args.left);
  const rightSafety = scoreSafety(args.right);

  const safety: Winner =
    leftSafety === rightSafety ? "tie" : leftSafety < rightSafety ? "left" : "right";

  const leftSuitability = scoreSuitability(args.left);
  const rightSuitability = scoreSuitability(args.right);

  const suitability: Winner =
    leftSuitability === rightSuitability
      ? "tie"
      : leftSuitability > rightSuitability
        ? "left"
        : "right";

  const value: Winner = "tie";

  return { safety, suitability, value };
}

export function buildComparisonSummary(args: {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
  winnerByCategory: ComparisonResult["winnerByCategory"];
}): string {
  const leftName = label(args.left);
  const rightName = label(args.right);

  const safetyLine =
    args.winnerByCategory.safety === "tie"
      ? "Güvenlik açısından iki ürün benzer görünüyor."
      : args.winnerByCategory.safety === "left"
        ? `${leftName} güvenlik açısından daha avantajlı görünüyor.`
        : `${rightName} güvenlik açısından daha avantajlı görünüyor.`;

  const suitabilityLine =
    args.winnerByCategory.suitability === "tie"
      ? "Uygunluk açısından net bir üstünlük yok."
      : args.winnerByCategory.suitability === "left"
        ? `${leftName} uygunluk açısından öne çıkıyor.`
        : `${rightName} uygunluk açısından öne çıkıyor.`;

  return `${safetyLine} ${suitabilityLine} Değerlendirme mevcut analiz verileriyle sınırlıdır.`;
}

export function buildComparisonResult(args: {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
}): ComparisonResult {
  const winnerByCategory = decideWinnerByCategory({ left: args.left, right: args.right });

  return {
    leftProductId: args.left.id,
    rightProductId: args.right.id,
    winnerByCategory,
    summary: buildComparisonSummary({
      left: args.left,
      right: args.right,
      winnerByCategory,
    }),
  };
}
