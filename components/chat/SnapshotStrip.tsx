import React from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Snapshot } from "@/lib/camera/snapshot-camera";

export function SnapshotStrip({
  snapshots,
  onRemove,
  dark = false,
}: {
  snapshots: Snapshot[];
  onRemove: (id: string) => void;
  dark?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoAttachRow}
    >
      {snapshots.map((snapshot) => (
        <View
          key={snapshot.id}
          style={[styles.photoThumbWrapper, dark && styles.photoThumbWrapperDark]}
        >
          <Image
            source={{ uri: snapshot.thumbnailUri }}
            style={styles.photoThumb}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removePhotoBtn}
            onPress={() => onRemove(snapshot.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photoAttachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  photoThumbWrapper: {
    position: "relative",
  },
  photoThumbWrapperDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 2,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
