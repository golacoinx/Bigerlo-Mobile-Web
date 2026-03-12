import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SnapshotStrip } from "@/components/chat/SnapshotStrip";
import type { Snapshot } from "@/lib/camera/snapshot-camera";

type CameraBottomPanelProps = {
  inputText: string;
  snapshots: Snapshot[];
  isSending: boolean;
  bottomPadding: number;
  maxSnapshots: number;
  onInputTextChange: (value: string) => void;
  onSend: () => void;
  onCapture: () => void;
  onGalleryPress: () => void;
  onRemoveSnapshot: (id: string) => void;
};

export function CameraBottomPanel({
  inputText,
  snapshots,
  isSending,
  bottomPadding,
  maxSnapshots,
  onInputTextChange,
  onSend,
  onCapture,
  onGalleryPress,
  onRemoveSnapshot,
}: CameraBottomPanelProps) {
  const [inputHeight, setInputHeight] = useState(44);
  const snapshotsCount = snapshots.length;
  const canSend = (inputText.trim() || snapshotsCount > 0) && !isSending;

  const computedInputHeight = useMemo(
    () => Math.max(44, Math.min(120, inputHeight)),
    [inputHeight]
  );

  return (
    <View style={[styles.cameraBottomPanel, { paddingBottom: bottomPadding + 12 }]}> 
      {snapshotsCount > 0 ? (
        <View style={styles.snapshotArea}>
          <SnapshotStrip snapshots={snapshots} onRemove={onRemoveSnapshot} />
        </View>
      ) : null}

      <View style={styles.cameraInputRow}>
        <View style={[styles.inputContainer, { height: computedInputHeight }]}> 
          <TextInput
            style={[styles.textInput, { height: computedInputHeight }]}
            value={inputText}
            onChangeText={onInputTextChange}
            placeholder="Örn: Hangisi daha iyi, akneli cilt için uygun mu?"
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
            onContentSizeChange={(event) => {
              setInputHeight(event.nativeEvent.contentSize.height + 14);
            }}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={styles.galleryInlineBtn}
            onPress={onGalleryPress}
            activeOpacity={0.7}
            disabled={snapshotsCount >= maxSnapshots || isSending}
          >
            <Ionicons name="images-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
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
    paddingTop: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  snapshotArea: {
    marginBottom: 8,
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
    borderRadius: 18,
    backgroundColor: Colors.card,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingLeft: 14,
    paddingRight: 8,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  galleryInlineBtn: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.black,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardInner,
  },
  captureArea: {
    alignItems: "center",
    marginBottom: 2,
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
