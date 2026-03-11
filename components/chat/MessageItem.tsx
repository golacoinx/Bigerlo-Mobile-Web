import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  photoUris?: string[];
  isLoading?: boolean;
};

export function MessageItem({ item }: { item: ChatMessage }) {
  const photoUris = item.photoUris ?? [];
  const hasSinglePhoto = photoUris.length === 1;
  const hasMultiplePhotos = photoUris.length > 1;
  const showMedia = hasSinglePhoto || hasMultiplePhotos;

  return (
    <View
      style={[
        styles.messageItem,
        item.isUser ? styles.messageItemUser : styles.messageItemAssistant,
      ]}
    >
      {hasSinglePhoto ? (
        <View style={styles.mediaOnlyContainer}>
          <Image
            source={{ uri: photoUris[0] }}
            style={styles.messagePhotoSingle}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {hasMultiplePhotos ? (
        <View style={styles.mediaOnlyContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.messagePhotoRow}
            style={styles.messagePhotoScroll}
          >
            {photoUris.map((uri, idx) => (
              <Image
                key={`${item.id}-photo-${idx}`}
                source={{ uri }}
                style={styles.messagePhotoMulti}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {item.text ? (
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userBubbleText : styles.assistantBubbleText,
            item.isLoading && styles.loadingText,
          ]}
        >
          {item.text}
        </Text>
      ) : showMedia ? null : (
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
  },
  mediaOnlyContainer: {
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "flex-start",
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
  messagePhotoSingle: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },
  messagePhotoScroll: {
    maxHeight: 78,
  },
  messagePhotoRow: {
    gap: 6,
  },
  messagePhotoMulti: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  loadingText: {
    opacity: 0.55,
  },
});
