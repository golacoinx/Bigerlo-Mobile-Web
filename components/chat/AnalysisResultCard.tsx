import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import type { StructuredAnalysis } from "@/lib/chat/analysis-types";

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

function getShortVerdict(suitability: StructuredAnalysis["analysis"]["suitability"]) {
  switch (suitability) {
    case "good":
      return "Genel kullanım için daha uygun görünüyor.";
    case "caution":
      return "Kademeli kullanımla ilerlemek daha güvenli olur.";
    case "avoid":
      return "Bu ürün sizin için güçlü bir aday olmayabilir.";
    default:
      return "Net karar için daha fazla kullanım bağlamı gerekli.";
  }
}

export function AnalysisResultCard({
  structured,
  photoUri,
  onTrackProduct,
}: {
  structured: StructuredAnalysis;
  photoUri?: string;
  onTrackProduct?: (structured: StructuredAnalysis) => void;
}) {
  const { product, ingredients, analysis } = structured;

  const hasRealProductName = product.name && product.name.toLowerCase() !== "bilinmiyor";
  const hasRealBrand = product.brand && product.brand.toLowerCase() !== "bilinmiyor";
  const hasIngredients = ingredients.length > 0;

  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.mainContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>{hasRealProductName ? product.name : "Ürün analizi"}</Text>
              <Text style={styles.subtitle}>
                {hasRealBrand ? product.brand : "Marka bilinmiyor"} · {formatProductType(product.type)}
              </Text>
            </View>
          </View>


          {hasIngredients ? (
            <Text style={styles.ingredients} numberOfLines={2}>
              Öne çıkan içerikler: {ingredients.slice(0, 6).join(", ")}
            </Text>
          ) : null}

          <Text style={styles.verdict}>{getShortVerdict(analysis.suitability)}</Text>

          {(analysis.risks.length > 0 || analysis.cautionNote) ? (
            <Text style={styles.riskHint}>Detaylı dikkat ve risk notları için Risk sekmesine bakın.</Text>
          ) : null}
        </View>
        {photoUri ? (
          <TouchableOpacity
            style={styles.thumbnailWrap}
            activeOpacity={0.85}
            onPress={() => setPreviewOpen(true)}
          >
            <Image source={{ uri: photoUri }} style={styles.thumbnail} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity
          style={[styles.ctaBtn, !onTrackProduct && styles.ctaBtnDisabled]}
          activeOpacity={0.8}
          onPress={() => onTrackProduct?.(structured)}
          disabled={!onTrackProduct}
        >
          <Text style={styles.ctaText}>Track this product</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewOpen(false)}>
          <Pressable style={styles.previewContent} onPress={() => {}}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mainContent: {
    flex: 1,
    gap: 8,
  },

  thumbnailWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  previewContent: {
    width: "90%",
    height: "58%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  headerRow: {
    flexDirection: "row",
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
  verdict: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  riskHint: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  ctaBtn: {
    borderRadius: 12,
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
