import type {
  AnalyzedProduct,
  ComparisonResult,
} from "@/lib/session/analysis-session-types";

type Winner = "left" | "right" | "tie";

export function selectComparisonCandidates(
  analyzedProducts: AnalyzedProduct[]
): { left: AnalyzedProduct; right: AnalyzedProduct } | null {
  if (analyzedProducts.length < 2) {
    return null;
  }

  const right = analyzedProducts[analyzedProducts.length - 1];
  const left = analyzedProducts[analyzedProducts.length - 2];

  return { left, right };
}

function scoreSafety(product: AnalyzedProduct): number {
  const riskCount = product.risk?.risks.length ?? 0;
  const warningCount = product.risk?.warnings.length ?? 0;
  const cautionCount = product.analysis?.cautions.length ?? 0;

  return -(riskCount + warningCount + cautionCount);
}

function scoreSuitability(product: AnalyzedProduct): number {
  const suggestedForCount = product.analysis?.suggestedFor?.length ?? 0;
  const personalCautionsCount = product.risk?.personalCautions.length ?? 0;

  return suggestedForCount - personalCautionsCount;
}

function scoreValue(product: AnalyzedProduct): number {
  const summary = product.analysis?.summary.toLowerCase() ?? "";

  if (
    summary.includes("fiyat/performans") ||
    summary.includes("uygun fiyat") ||
    summary.includes("ekonomik")
  ) {
    return 1;
  }

  return 0;
}

export function decideWinnerByCategory(args: {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
}): ComparisonResult["winnerByCategory"] {
  const { left, right } = args;

  const leftSafety = scoreSafety(left);
  const rightSafety = scoreSafety(right);

  const leftSuitability = scoreSuitability(left);
  const rightSuitability = scoreSuitability(right);

  const leftValue = scoreValue(left);
  const rightValue = scoreValue(right);

  return {
    safety:
      leftSafety === rightSafety ? "tie" : leftSafety > rightSafety ? "left" : "right",
    suitability:
      leftSuitability === rightSuitability
        ? "tie"
        : leftSuitability > rightSuitability
          ? "left"
          : "right",
    value: leftValue === rightValue ? "tie" : leftValue > rightValue ? "left" : "right",
  };
}

export function buildComparisonSummary(args: {
  left: AnalyzedProduct;
  right: AnalyzedProduct;
  winnerByCategory: ComparisonResult["winnerByCategory"];
}): string {
  const { winnerByCategory } = args;

  const leftWins = [winnerByCategory.safety, winnerByCategory.suitability, winnerByCategory.value].filter(
    (winner) => winner === "left"
  ).length;
  const rightWins = [winnerByCategory.safety, winnerByCategory.suitability, winnerByCategory.value].filter(
    (winner) => winner === "right"
  ).length;

  if (leftWins === rightWins) {
    return "İki ürün arasında belirgin bir üstünlük görünmüyor; kullanım amacınıza göre seçim yapın.";
  }

  return leftWins > rightWins
    ? "Sol üründe daha dengeli bir avantaj sinyali var."
    : "Sağ üründe daha dengeli bir avantaj sinyali var.";
}

export function buildComparisonResult(
  analyzedProducts: AnalyzedProduct[]
): ComparisonResult | null {
  const candidates = selectComparisonCandidates(analyzedProducts);

  if (!candidates) {
    return null;
  }

  const winnerByCategory = decideWinnerByCategory(candidates);

  return {
    leftProductId: candidates.left.id,
    rightProductId: candidates.right.id,
    winnerByCategory,
    summary: buildComparisonSummary({
      ...candidates,
      winnerByCategory,
    }),
  };
}
