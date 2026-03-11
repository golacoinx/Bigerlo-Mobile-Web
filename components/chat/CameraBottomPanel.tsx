import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type CameraBottomPanelProps = {
  inputText: string;
  snapshotsCount: number;
  isSending: boolean;
  bottomPadding: number;
  maxSnapshots: number;
  onInputTextChange: (value: string) => void;
  onSend: () => void;
  onCapture: () => void;
};

export function CameraBottomPanel({
  inputText,
  snapshotsCount,
  isSending,
  bottomPadding,
  maxSnapshots,
  onInputTextChange,
  onSend,
  onCapture,
}: CameraBottomPanelProps) {
  const canSend = (inputText.trim() || snapshotsCount > 0) && !isSending;

  return (
    <View style={[styles.cameraBottomPanel, { paddingBottom: bottomPadding + 12 }]}>
      <View style={styles.cameraInputRow}>
        <View style={[styles.inputContainer, styles.cameraInputContainer]}>
          <TextInput
            style={[styles.textInput, styles.cameraTextInput]}
            value={inputText}
            onChangeText={onInputTextChange}
            placeholder="Örn: Hangisi daha iyi, akneli cilt için uygun mu?"
            placeholderTextColor="rgba(255,255,255,0.65)"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, styles.cameraSendButton, !canSend && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={canSend ? Colors.white : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.captureArea}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onCapture}
          activeOpacity={0.85}
          disabled={snapshotsCount >= maxSnapshots || isSending}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraBottomPanel: {
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cameraInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 120,
  },
  cameraInputContainer: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    lineHeight: 21,
  },
  cameraTextInput: {
    color: Colors.white,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraSendButton: {
    backgroundColor: Colors.black,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardInner,
  },
  captureArea: {
    alignItems: "center",
    marginBottom: 6,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
});
