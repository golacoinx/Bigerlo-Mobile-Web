import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { StructuredAnalysis } from "@/lib/chat/analysis-types";
import { AnalysisResultCard } from "@/components/chat/AnalysisResultCard";

export type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
  structuredResult?: StructuredAnalysis;
  cardPhotoUri?: string;
};

export function MessageItem({
  item,
  onTrackProduct,
}: {
  item: ChatMessage;
  onTrackProduct?: (structured: StructuredAnalysis) => void;
}) {
  const safeText = typeof item.text === "string" ? item.text : String(item.text ?? "");

  if (__DEV__ && typeof item.text !== "string") {
    console.error("[MessageItem] Non-string text received", item.text);
  }

  const hasUsefulStructuredData = Boolean(
    item.structuredResult &&
      (
        item.structuredResult.analysis.summary ||
        item.structuredResult.analysis.risks.length > 0 ||
        item.structuredResult.analysis.cautionNote ||
        item.structuredResult.analysis.suitability !== "unknown" ||
        item.structuredResult.product.name.toLowerCase() !== "bilinmiyor" ||
        item.structuredResult.product.brand.toLowerCase() !== "bilinmiyor"
      )
  );

  return (
    <View
      style={[
        styles.messageItem,
        item.isUser ? styles.messageItemUser : styles.messageItemAssistant,
      ]}
    >
      {!item.isUser && hasUsefulStructuredData && item.structuredResult ? (
        <AnalysisResultCard
          structured={item.structuredResult}
          photoUri={item.cardPhotoUri}
          onTrackProduct={onTrackProduct}
        />
      ) : null}

      {safeText && (!item.structuredResult || item.isUser || item.isLoading) ? (
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userBubbleText : styles.assistantBubbleText,
            item.isLoading && styles.loadingText,
          ]}
        >
          {safeText}
        </Text>
      ) : (!item.isUser && hasUsefulStructuredData) || item.isUser ? null : (
        <Text style={[styles.messageText, styles.userBubbleText]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  messageItem: {
    maxWidth: "82%",
    gap: 6,
  },
  messageItemUser: {
    alignSelf: "flex-end",
  },
  messageItemAssistant: {
    alignSelf: "flex-start",
    maxWidth: "94%",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  userBubbleText: {
    color: Colors.white,
    backgroundColor: Colors.black,
    borderBottomRightRadius: 5,
  },
  assistantBubbleText: {
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 5,
  },
  loadingText: {
    opacity: 0.55,
  },
});
