import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type ProfileMenuProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
};

export function ProfileMenu({ visible, onClose, onNavigate }: ProfileMenuProps) {
  const items: MenuItem[] = [
    { key: "profile", label: "Profile & Account", icon: "person-outline", onPress: () => onNavigate("/profile") },
    { key: "settings", label: "Settings", icon: "settings-outline", onPress: () => onNavigate("/settings") },
    { key: "language", label: "Language", icon: "language-outline", onPress: () => onNavigate("/language") },
    { key: "privacy", label: "Privacy", icon: "shield-checkmark-outline", onPress: () => onNavigate("/privacy") },
    { key: "help", label: "Help & Support", icon: "help-circle-outline", onPress: () => onNavigate("/help-support") },
    { key: "feedback", label: "Send Feedback", icon: "chatbox-ellipses-outline", onPress: () => onNavigate("/feedback") },
    { key: "about", label: "About", icon: "information-circle-outline", onPress: () => onNavigate("/about") },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>App Menu</Text>

          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Ionicons name={item.icon} size={20} color={Colors.textPrimary} />
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 2,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  item: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
});
