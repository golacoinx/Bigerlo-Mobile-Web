import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "@/constants/colors";
import type { CompatibilityResult, StructuredAnalysis } from "@/lib/chat/analysis-types";

function getSuitabilityMeta(suitability: StructuredAnalysis["analysis"]["suitability"]) {
  switch (suitability) {
    case "good":
      return { label: "Uygun Görünüyor", bg: "#D1FADF", fg: "#067647" };
    case "caution":
      return { label: "Dikkatli Kullanım", bg: "#FEF0C7", fg: "#B54708" };
    case "avoid":
      return { label: "Çok Uygun Değil", bg: "#FEE4E2", fg: "#B42318" };
    default:
      return { label: "Belirsiz", bg: Colors.cardInner, fg: Colors.textSecondary };
  }
}


function getCompatibilityMeta(status: CompatibilityResult["status"]) {
  switch (status) {
    case "compatible":
      return { icon: "✓", label: "Profilinle uyumlu görünüyor", bg: "#ECFDF3", fg: "#027A48" };
    case "caution":
      return { icon: "⚠", label: "Profilin için dikkat gerektiriyor", bg: "#FFFAEB", fg: "#B54708" };
    case "conflict":
      return { icon: "✕", label: "Profilinle çatışan içerik var", bg: "#FEF3F2", fg: "#B42318" };
    default:
      return { icon: "•", label: "Uyumluluk için daha fazla veri gerekli", bg: Colors.card, fg: Colors.textSecondary };
  }
}

function formatProductType(type: StructuredAnalysis["product"]["type"]) {
  const map: Record<StructuredAnalysis["product"]["type"], string> = {
    cleanser: "Temizleyici",
    serum: "Serum",
    moisturizer: "Nemlendirici",
    sunscreen: "Güneş Koruyucu",
    treatment: "Bakım/Tedavi",
    "hair-care": "Saç Bakımı",
    cleaning: "Temizlik",
    other: "Diğer",
  };

  return map[type] ?? "Diğer";
}

export function AnalysisResultCard({
  structured,
}: {
  structured: StructuredAnalysis;
}) {
  const { product, ingredients, analysis } = structured;
  const suitability = getSuitabilityMeta(analysis.suitability);
  const confidence = Math.max(0, Math.min(1, analysis.confidence || 0));

  const hasRealProductName = product.name && product.name.toLowerCase() !== "bilinmiyor";
  const hasRealBrand = product.brand && product.brand.toLowerCase() !== "bilinmiyor";
  const hasRisks = analysis.risks.length > 0;
  const hasIngredients = ingredients.length > 0;
  const compatibility = structured.compatibility;
  const compatibilityMeta = getCompatibilityMeta(compatibility?.status ?? "unknown");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>
            {hasRealProductName ? product.name : "Ürün analizi"}
          </Text>
          <Text style={styles.subtitle}>
            {hasRealBrand ? product.brand : "Marka bilinmiyor"} · {formatProductType(product.type)}
          </Text>
        </View>
      </View>

      <View style={[styles.compatibilityBox, { backgroundColor: compatibilityMeta.bg }]}> 
        <Text style={[styles.compatibilityLabel, { color: compatibilityMeta.fg }]}>
          {compatibilityMeta.icon} Uyumluluk: {compatibilityMeta.label}
        </Text>
        {compatibility?.reasons?.slice(0, 2).map((reason, index) => (
          <Text key={`reason-${index}`} style={[styles.compatibilityReason, { color: compatibilityMeta.fg }]}>• {reason}</Text>
        ))}
      </View>

      <View style={[styles.suitabilityBadge, { backgroundColor: suitability.bg }]}> 
        <Text style={[styles.suitabilityText, { color: suitability.fg }]}>{suitability.label}</Text>
      </View>

      {analysis.summary ? <Text style={styles.summary}>{analysis.summary}</Text> : null}

      {hasRisks ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dikkat Notları</Text>
          <View style={styles.chipsWrap}>
            {analysis.risks.slice(0, 4).map((risk, index) => (
              <View key={`risk-${index}`} style={styles.riskChip}>
                <Text style={styles.riskChipText}>{risk}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {hasIngredients ? (
        <Text style={styles.ingredients} numberOfLines={3}>
          İçerik: {ingredients.slice(0, 8).join(", ")}
        </Text>
      ) : null}

      {analysis.cautionNote ? <Text style={styles.caution}>{analysis.cautionNote}</Text> : null}

      <View style={styles.footerRow}>
        <Text style={styles.confidence}>Güven düzeyi: %{Math.round(confidence * 100)}</Text>
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
          <Text style={styles.ctaText}>Track this product</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  compatibilityBox: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  compatibilityLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  compatibilityReason: {
    fontSize: 12,
    lineHeight: 16,
  },
  suitabilityBadge: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  suitabilityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  riskChip: {
    borderRadius: 999,
    backgroundColor: Colors.card,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  riskChipText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  ingredients: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  caution: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  confidence: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ctaBtn: {
    borderRadius: 12,
    backgroundColor: Colors.black,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
});
