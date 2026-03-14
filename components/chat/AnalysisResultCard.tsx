import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type {
  CompatibilityResult,
  PersonalMemorySignal,
  StructuredAnalysis,
} from "@/lib/chat/analysis-types";

type ResultTabKey = "analysis" | "comparison" | "risk";

type ResultTab = {
  key: ResultTabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const RESULT_TABS: ResultTab[] = [
  { key: "analysis", label: "Analiz", icon: "analytics-outline" },
  { key: "comparison", label: "Karşılaştırma", icon: "git-compare-outline" },
  { key: "risk", label: "Kişisel Risk", icon: "shield-checkmark-outline" },
];

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
      return { icon: "✓", label: "Profilinle uyumlu", bg: "#ECFDF3", fg: "#027A48" };
    case "caution":
      return { icon: "⚠", label: "Profilin için dikkat gerekiyor", bg: "#FFFAEB", fg: "#B54708" };
    case "conflict":
      return { icon: "✕", label: "Profilinle çatışan içerik var", bg: "#FEF3F2", fg: "#B42318" };
    default:
      return { icon: "•", label: "Yetersiz veri", bg: Colors.card, fg: Colors.textSecondary };
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

function getMemorySignalMeta(direction: PersonalMemorySignal["direction"]) {
  if (direction === "caution") {
    return { icon: "⚠", color: "#B42318", label: "Önceki deneyimde dikkat" };
  }

  return { icon: "✓", color: "#027A48", label: "Önceki deneyimde olumlu" };
}

export function AnalysisResultCard({
  structured,
  onTrackProduct,
}: {
  structured: StructuredAnalysis;
  onTrackProduct?: (structured: StructuredAnalysis) => void;
}) {
  const [activeTab, setActiveTab] = useState<ResultTabKey>("analysis");
  const { product, ingredients, analysis } = structured;
  const suitability = getSuitabilityMeta(analysis.suitability);
  const confidence = Math.max(0, Math.min(1, analysis.confidence || 0));

  const hasRealProductName = product.name && product.name.toLowerCase() !== "bilinmiyor";
  const hasRealBrand = product.brand && product.brand.toLowerCase() !== "bilinmiyor";
  const hasRisks = analysis.risks.length > 0;
  const hasIngredients = ingredients.length > 0;
  const compatibility = structured.compatibility;
  const compatibilityMeta = getCompatibilityMeta(compatibility?.status ?? "unknown");
  const memory = structured.memory;

  const memoryMatches = useMemo(() => memory?.matchedSignals ?? [], [memory]);

  const sourceChips = [
    "Bigerlo AI",
    hasIngredients ? `İçerik ${Math.min(ingredients.length, 8)}+` : "Görüntü tabanlı",
    `Güven %${Math.round(confidence * 100)}`,
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>{hasRealProductName ? product.name : "Ürün analizi"}</Text>
          <Text style={styles.subtitle}>
            {hasRealBrand ? product.brand : "Marka bilinmiyor"} · {formatProductType(product.type)}
          </Text>
        </View>
      </View>

      <View style={[styles.suitabilityBadge, { backgroundColor: suitability.bg }]}> 
        <Text style={[styles.suitabilityText, { color: suitability.fg }]}>{suitability.label}</Text>
      </View>

      <View style={styles.sourceChipRow}>
        {sourceChips.map((chip) => (
          <View key={chip} style={styles.sourceChip}>
            <Text style={styles.sourceChipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabRow}>
        {RESULT_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.82}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? Colors.black : Colors.textSecondary}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "analysis" ? (
        <View style={styles.section}>
          {analysis.summary ? <Text style={styles.summary}>{analysis.summary}</Text> : null}
          {hasIngredients ? (
            <Text style={styles.ingredients} numberOfLines={3}>
              İçerik: {ingredients.slice(0, 10).join(", ")}
            </Text>
          ) : (
            <Text style={styles.ingredients}>İçerik listesi net okunamadı.</Text>
          )}
        </View>
      ) : null}

      {activeTab === "comparison" ? (
        <View style={styles.section}>
          <View style={[styles.compatibilityBox, { backgroundColor: compatibilityMeta.bg }]}> 
            <Text style={[styles.compatibilityLabel, { color: compatibilityMeta.fg }]}> 
              {compatibilityMeta.icon} Uyumluluk: {compatibilityMeta.label}
            </Text>
            {compatibility?.reasons?.slice(0, 3).map((reason, index) => (
              <Text
                key={`reason-${index}`}
                style={[styles.compatibilityReason, { color: compatibilityMeta.fg }]}
              >
                • {reason}
              </Text>
            ))}
          </View>
          <Text style={styles.helperLine}>Bu bölüm profilin ve ürün içeriğinin temel kesişimini gösterir.</Text>
        </View>
      ) : null}

      {activeTab === "risk" ? (
        <View style={styles.section}>
          {hasRisks ? (
            <View style={styles.chipsWrap}>
              {analysis.risks.slice(0, 4).map((risk, index) => (
                <View key={`risk-${index}`} style={styles.riskChip}>
                  <Text style={styles.riskChipText}>{risk}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helperLine}>Belirgin risk sinyali görünmüyor.</Text>
          )}

          {memory?.status === "available" && memoryMatches.length > 0 ? (
            <View style={styles.memoryBlock}>
              <Text style={styles.memoryTitle}>Kişisel Hafıza</Text>
              <Text style={styles.helperLine}>
                {memory.evidenceLevel === "limited"
                  ? "Sınırlı geçmiş veriye dayanır."
                  : "Takip geçmişindeki tekrar eden desenlere dayanır."}
              </Text>
              {memoryMatches.slice(0, 2).map((signal) => {
                const meta = getMemorySignalMeta(signal.direction);
                return (
                  <View key={`${signal.direction}-${signal.ingredient}`} style={styles.memorySignalItem}>
                    <Text style={[styles.memorySignalTitle, { color: meta.color }]}> 
                      {meta.icon} {meta.label}: {signal.ingredient}
                    </Text>
                    <Text style={styles.memorySignalMessage}>{signal.message}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperLine}>Bu ürün için anlamlı kişisel hafıza eşleşmesi yok.</Text>
          )}

          {analysis.cautionNote ? <Text style={styles.caution}>{analysis.cautionNote}</Text> : null}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.confidence}>Sonuç güven düzeyi: %{Math.round(confidence * 100)}</Text>
        <TouchableOpacity
          style={[styles.ctaBtn, !onTrackProduct && styles.ctaBtnDisabled]}
          activeOpacity={0.8}
          onPress={() => onTrackProduct?.(structured)}
          disabled={!onTrackProduct}
        >
          <Text style={styles.ctaText}>Track this product</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
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
  suitabilityBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  suitabilityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sourceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sourceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tabBtnActive: {
    borderColor: Colors.black,
    backgroundColor: "#F8F8F8",
  },
  tabText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: Colors.black,
  },
  section: {
    gap: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  ingredients: {
    fontSize: 12,
    lineHeight: 17,
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
  helperLine: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  memoryBlock: {
    gap: 6,
  },
  memoryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  memorySignalItem: {
    borderRadius: 10,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  memorySignalTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  memorySignalMessage: {
    fontSize: 12,
    lineHeight: 16,
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
    borderRadius: 10,
    backgroundColor: Colors.black,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
});
