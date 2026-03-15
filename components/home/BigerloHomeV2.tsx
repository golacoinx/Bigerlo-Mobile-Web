import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function BigerloHomeV2() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <SafeAreaView style={styles.safeArea} className="flex-1 bg-[#f6f7f9]">
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.topCircleButton}
            onPress={() => setIsDrawerOpen(true)}
            accessibilityLabel="Menüyü aç"
          >
            <Ionicons name="menu-outline" size={32} color="#475569" />
          </Pressable>

          <View style={styles.brandWrap}>
            <Text style={styles.brandText}>B I G E R L O</Text>
            <View style={styles.brandDot} />
          </View>

          <Pressable style={styles.topCircleButton} accessibilityLabel="Yeni sohbet">
            <Ionicons name="create-outline" size={32} color="#475569" />
          </Pressable>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.centerContent}>
          <View style={styles.placeholderCircle}>
            <Ionicons name="sparkles-outline" size={88} color="#d4d9e2" />
          </View>
          <Text style={styles.placeholderText}>ANALİZ BEKLENİYOR</Text>
        </View>

        <View style={styles.bottomDivider} />

        <View style={styles.inputDockArea}>
          <Pressable style={styles.plusButton}>
            <Ionicons name="add" size={52} color="#2f3640" />
          </Pressable>

          <View style={styles.inputPill}>
            <Pressable
              style={styles.cameraButton}
              onPress={() => setIsCameraOpen(true)}
              accessibilityLabel="Kamera aç"
            >
              <Ionicons name="camera-outline" size={34} color="#fff" />
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="Bigerlo için mesaj"
              placeholderTextColor="#8b9cb8"
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <Pressable style={styles.micButton} accessibilityLabel="Sesli mesaj">
              <Ionicons name="mic-outline" size={40} color="#8b9cb8" />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsDrawerOpen(false)}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Sohbet Geçmişi</Text>
            <Text style={styles.drawerItem}>• Serum Analizi</Text>
            <Text style={styles.drawerItem}>• Cilt Uyum Kontrolü</Text>
            <Text style={styles.drawerItem}>• Fiyat Kıyaslama</Text>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={isCameraOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCameraOpen(false)}
      >
        <SafeAreaView style={styles.cameraModal}>
          <View style={styles.cameraHeader}>
            <Pressable onPress={() => setIsCameraOpen(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.scanArea} />
          <Pressable style={styles.captureButton}>
            <View style={styles.captureCore} />
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default BigerloHomeV2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topCircleButton: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: "#eceff4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e3e8ef",
  },
  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  brandText: {
    color: "#2563eb",
    fontSize: 52 / 4,
    letterSpacing: 6,
    fontWeight: "700",
  },
  brandDot: {
    marginTop: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#dde3ec",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -100,
  },
  placeholderCircle: {
    width: 255,
    height: 255,
    borderRadius: 127.5,
    backgroundColor: "#eceff4",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 72,
    color: "#d3d8e1",
    fontSize: 50 / 4,
    letterSpacing: 4,
    fontWeight: "700",
  },
  bottomDivider: {
    height: 1,
    backgroundColor: "#dde3ec",
  },
  inputDockArea: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  plusButton: {
    width: 64,
    height: 132,
    borderRadius: 32,
    backgroundColor: "#eceff4",
    alignItems: "center",
    justifyContent: "center",
  },
  inputPill: {
    flex: 1,
    minHeight: 132,
    borderRadius: 66,
    backgroundColor: "#e6e8ec",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  cameraButton: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  input: {
    flex: 1,
    marginHorizontal: 16,
    color: "#8b9cb8",
    fontSize: 20,
    paddingVertical: 0,
    maxHeight: 100,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.25)",
    justifyContent: "flex-start",
  },
  drawer: {
    marginTop: 120,
    marginLeft: 16,
    width: 280,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 18,
  },
  drawerTitle: {
    fontSize: 18,
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 10,
  },
  drawerItem: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 8,
  },
  cameraModal: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 44,
  },
  cameraHeader: {
    width: "100%",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  scanArea: {
    width: "82%",
    aspectRatio: 0.72,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
});
