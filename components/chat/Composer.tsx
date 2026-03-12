import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
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
  const canSend = (Boolean(inputText.trim()) || snapshotsCount > 0) && !isSending;

  return (
    <View style={[styles.inputRow, { paddingBottom: bottomPadding }]}> 
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={inputText}
          onChangeText={onChangeText}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSend}
          blurOnSubmit={false}
          testID="message-input"
        />
        <TouchableOpacity
          style={styles.galleryInlineBtn}
          onPress={onGalleryPress}
          activeOpacity={0.7}
          testID="gallery-btn"
        >
          <Ionicons name="images-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cameraInlineBtn}
          onPress={onCameraPress}
          activeOpacity={0.7}
          testID="camera-btn"
        >
          <Ionicons name="camera-outline" size={20} color={Colors.textSecondary} />
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
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.card,
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  galleryInlineBtn: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraInlineBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardInner,
  },
});
