import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type ComposerProps = {
  inputText: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
  bottomPadding: number;
  isSending: boolean;
  snapshotsCount: number;
  inputRef: React.RefObject<TextInput | null>;
};

export function Composer({
  inputText,
  onChangeText,
  onSend,
  onCameraPress,
  onGalleryPress,
  bottomPadding,
  isSending,
  inputRef,
  snapshotsCount,
}: ComposerProps) {
  const [inputHeight, setInputHeight] = useState(46);
  const canSend = (Boolean(inputText.trim()) || snapshotsCount > 0) && !isSending;

  const computedInputHeight = useMemo(() => Math.max(46, Math.min(126, inputHeight)), [inputHeight]);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPadding }]}> 
      {snapshotsCount === 0 ? (
        <TouchableOpacity
          style={styles.snapshotPlaceholder}
          activeOpacity={0.82}
          onPress={onCameraPress}
          testID="snapshot-placeholder"
        >
          <Ionicons name="camera-outline" size={17} color={Colors.textSecondary} />
          <Text style={styles.snapshotPlaceholderText}>Önce ürün fotoğrafı ekle (önerilir)</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.inputRow}>
        <View style={[styles.inputContainer, { minHeight: computedInputHeight }]}> 
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { height: computedInputHeight }]}
            value={inputText}
            onChangeText={onChangeText}
            placeholder="Ürünü sor: içerik güvenli mi, cildime uygun mu?"
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={700}
            returnKeyType="send"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
            onContentSizeChange={(event) => {
              setInputHeight(event.nativeEvent.contentSize.height + 12);
            }}
            textAlignVertical="top"
            testID="message-input"
          />
          <TouchableOpacity
            style={styles.galleryInlineBtn}
            onPress={onGalleryPress}
            activeOpacity={0.7}
            testID="gallery-btn"
          >
            <Ionicons name="images-outline" size={19} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraInlineBtn}
            onPress={onCameraPress}
            activeOpacity={0.7}
            testID="camera-btn"
          >
            <Ionicons name="camera-outline" size={19} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
          testID="send-btn"
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={canSend ? Colors.white : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingHorizontal: 2,
    gap: 8,
  },
  snapshotPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  snapshotPlaceholderText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 126,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 126,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  galleryInlineBtn: {
    width: 34,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraInlineBtn: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardInner,
  },
});
