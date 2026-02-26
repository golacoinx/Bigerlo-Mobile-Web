import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === "web"
    ? 67
    : insets.top;

  const bottomPadding = Platform.OS === "web"
    ? 84 + 16
    : 60 + insets.bottom + 16;

  const handleCameraPress = () => {
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <View style={styles.profileWrapper}>
          <View style={styles.profilePhoto}>
            <Ionicons name="person" size={22} color={Colors.textSecondary} />
          </View>
        </View>

        <Text style={styles.brandTitle}>BIGERLO</Text>

        <View style={styles.headerRight} />
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.95}
          onPress={handleCameraPress}
        >
          <TouchableOpacity
            style={styles.cameraButton}
            activeOpacity={0.7}
            onPress={handleCameraPress}
          >
            <Ionicons name="camera" size={28} color={Colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 8,
  },
  profileWrapper: {
    width: 44,
  },
  profilePhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardInner,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerRight: {
    width: 44,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cardInner,
    alignItems: "center",
    justifyContent: "center",
  },
});
