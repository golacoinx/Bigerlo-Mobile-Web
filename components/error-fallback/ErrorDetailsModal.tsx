import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ErrorFallbackTheme } from "./theme";

type ErrorDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: ErrorFallbackTheme;
  detailsText: string;
  monoFont: string;
  bottomInset: number;
};

export function ErrorDetailsModal({
  visible,
  onClose,
  isDark,
  theme,
  detailsText,
  monoFont,
  bottomInset,
}: ErrorDetailsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Error Details</Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close error details"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: bottomInset + 16 },
            ]}
            showsVerticalScrollIndicator
          >
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  {
                    color: theme.text,
                    fontFamily: monoFont,
                  },
                ]}
                selectable
              >
                {detailsText}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});
