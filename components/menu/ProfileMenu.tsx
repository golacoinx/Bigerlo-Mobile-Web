import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(340, Math.round(SCREEN_WIDTH * 0.84));

export function ProfileMenu({ visible, onClose, onNavigate }: ProfileMenuProps) {
  const [mounted, setMounted] = useState(visible);
  const slideX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slideX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(slideX, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [slideX, visible]);

  const items: MenuItem[] = useMemo(
    () => [
      { key: "profile", label: "Profile & Account", icon: "person-outline", onPress: () => onNavigate("/profile") },
      { key: "settings", label: "Settings", icon: "settings-outline", onPress: () => onNavigate("/settings") },
      { key: "language", label: "Language", icon: "language-outline", onPress: () => onNavigate("/language") },
      { key: "privacy", label: "Privacy", icon: "shield-checkmark-outline", onPress: () => onNavigate("/privacy") },
      { key: "help", label: "Help & Support", icon: "help-circle-outline", onPress: () => onNavigate("/help-support") },
      { key: "feedback", label: "Send Feedback", icon: "chatbox-ellipses-outline", onPress: () => onNavigate("/feedback") },
      { key: "about", label: "About", icon: "information-circle-outline", onPress: () => onNavigate("/about") },
    ],
    [onNavigate]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideX }] }]}>
          <View style={styles.header}>
            <Text style={styles.title}>App Menu</Text>
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 2,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
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
