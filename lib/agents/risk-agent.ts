import type { StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { RiskResult } from "@/lib/session/analysis-session-types";

type RiskArgs = {
  text?: string;
  structured?: StructuredAnalysis;
};

export function normalizeRiskList(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
}

export function extractRiskResult(args: RiskArgs): RiskResult {
  const structured = args.structured;

  const directRisks = normalizeRiskList(structured?.analysis?.risks ?? []);
  const cautionWarnings = normalizeRiskList([
    structured?.analysis?.cautionNote,
    structured?.analysis?.suitability === "avoid"
      ? "Ürün sizin için uygun olmayabilir, kullanmadan önce dikkatli değerlendirin."
      : undefined,
    structured?.analysis?.suitability === "caution"
      ? "Kademeli kullanım ve küçük bir bölgede deneme önerilir."
      : undefined,
  ]);

  const personalCautions = normalizeRiskList(
    structured?.memory?.matchedSignals
      ?.filter((signal) => signal.direction === "caution")
      .map((signal) => signal.message) ?? [],
  );

  const fallbackWarning =
    directRisks.length === 0 && cautionWarnings.length === 0
      ? ["Bu değerlendirme bilgilendirme amaçlıdır; ciltte beklenmeyen reaksiyonlarda kullanımı bırakın."]
      : [];

  return {
    risks: directRisks,
    warnings: normalizeRiskList([...cautionWarnings, ...fallbackWarning]),
    personalCautions:
      personalCautions.length > 0
        ? personalCautions
        : ["Kişisel geçmiş verisi sınırlı olabilir; ilk kullanımı dikkatle gözlemleyin."],
  };
}

export function buildRiskResultFromAnalyzeResponse(args: RiskArgs): RiskResult {
  return extractRiskResult(args);
}
