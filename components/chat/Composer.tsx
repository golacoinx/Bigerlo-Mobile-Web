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
  bottomPadding,
  isSending,
  inputRef,
}: ComposerProps) {
  const hasText = Boolean(inputText.trim());
  const canSend = hasText && !isSending;

  return (
    <View style={[styles.inputRow, { paddingBottom: bottomPadding }]}> 
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.cameraInlineBtn}
          onPress={onCameraPress}
          activeOpacity={0.75}
          testID="camera-btn"
        >
          <Ionicons name="camera" size={18} color={Colors.tabActive} />
        </TouchableOpacity>

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

        <TouchableOpacity style={styles.micInlineBtn} activeOpacity={0.75} testID="mic-btn">
          <Ionicons name="mic-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {hasText ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 24,
    minHeight: 50,
    maxHeight: 120,
    paddingHorizontal: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  cameraInlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 129, 255, 0.14)",
    marginLeft: 4,
  },
  micInlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
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
