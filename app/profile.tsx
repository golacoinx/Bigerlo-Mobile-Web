import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import type { TrackingSummary } from "@/lib/chat/analysis-types";

type UserProfile = {
  id: string;
  skinType?: string;
  hairType?: string;
  sensitivities: string[];
  avoidIngredients: string[];
  knownReactions: string[];
  createdAt: string;
  updatedAt: string;
};

type ProfilePayload = {
  profile?: UserProfile;
  error?: string;
};

type TrackingPayload = {
  trackings?: TrackingSummary[];
  error?: string;
};

function toMultiline(value: string[]) {
  return value.join("\n");
}

function parseMultiline(value: string) {
  return value
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skinType, setSkinType] = useState("");
  const [hairType, setHairType] = useState("");
  const [sensitivitiesText, setSensitivitiesText] = useState("");
  const [avoidIngredientsText, setAvoidIngredientsText] = useState("");
  const [knownReactionsText, setKnownReactionsText] = useState("");
  const [trackings, setTrackings] = useState<TrackingSummary[]>([]);

  const profileUrl = useMemo(() => new URL("/api/profile", getApiUrl()).toString(), []);
  const trackingUrl = useMemo(() => new URL("/api/tracking", getApiUrl()).toString(), []);

  const loadTrackings = useCallback(async () => {
    try {
      const response = await fetch(trackingUrl);
      const data = (await response.json()) as TrackingPayload;
      if (!response.ok) {
        throw new Error(data.error ?? "Takip listesi alınamadı.");
      }

      setTrackings(data.trackings ?? []);
    } catch {
      setTrackings([]);
    }
  }, [trackingUrl]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(profileUrl);
      const data = (await response.json()) as ProfilePayload;
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Profil alınamadı.");
      }

      setSkinType(data.profile.skinType ?? "");
      setHairType(data.profile.hairType ?? "");
      setSensitivitiesText(toMultiline(data.profile.sensitivities ?? []));
      setAvoidIngredientsText(toMultiline(data.profile.avoidIngredients ?? []));
      setKnownReactionsText(toMultiline(data.profile.knownReactions ?? []));
      await loadTrackings();
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [profileUrl, loadTrackings]);

  useEffect(() => {
    void Promise.all([loadProfile(), loadTrackings()]);
  }, [loadProfile, loadTrackings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch(profileUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinType: skinType.trim() || undefined,
          hairType: hairType.trim() || undefined,
          sensitivities: parseMultiline(sensitivitiesText),
          avoidIngredients: parseMultiline(avoidIngredientsText),
          knownReactions: parseMultiline(knownReactionsText),
        }),
      });

      const data = (await response.json()) as ProfilePayload;
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Profil kaydedilemedi.");
      }

      Alert.alert("Kaydedildi", "Profil bilgileriniz güncellendi.");
      setSensitivitiesText(toMultiline(data.profile.sensitivities ?? []));
      setAvoidIngredientsText(toMultiline(data.profile.avoidIngredients ?? []));
      setKnownReactionsText(toMultiline(data.profile.knownReactions ?? []));
      await loadTrackings();
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }, [
    avoidIngredientsText,
    hairType,
    knownReactionsText,
    profileUrl,
    sensitivitiesText,
    skinType,
    loadTrackings,
  ]);

  return (
    <>
      <Stack.Screen options={{ title: "Profile & Account" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Kişisel Uygunluk Profili</Text>
          <Text style={styles.description}>
            Bu bilgiler gelecekte ürün analizlerini kişiselleştirmek için kullanılacak. Zorunlu
            değildir, dilediğiniz zaman güncelleyebilirsiniz.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.textPrimary} />
          </View>
        ) : (
          <View style={styles.card}>
            <Field label="Skin type" value={skinType} onChangeText={setSkinType} />
            <Field label="Hair type" value={hairType} onChangeText={setHairType} />
            <Field
              label="Sensitivities"
              value={sensitivitiesText}
              onChangeText={setSensitivitiesText}
              multiline
              helperText="Her satıra veya virgülle bir hassasiyet girin."
            />
            <Field
              label="Avoid ingredients"
              value={avoidIngredientsText}
              onChangeText={setAvoidIngredientsText}
              multiline
              helperText="Kaçınmak istediğiniz içerikleri satır satır yazın."
            />
            <Field
              label="Known reactions"
              value={knownReactionsText}
              onChangeText={setKnownReactionsText}
              multiline
              helperText="Bilinen reaksiyon veya tetikleyicileri ekleyin."
            />


            <View style={styles.trackingSection}>
              <Text style={styles.sectionHeader}>Tracked products</Text>
              {trackings.length === 0 ? (
                <Text style={styles.helper}>Henüz takip edilen ürün yok.</Text>
              ) : (
                trackings.slice(0, 5).map((tracking) => (
                  <View key={tracking.trackingId} style={styles.trackingItem}>
                    <Text style={styles.trackingTitle}>{tracking.productName}</Text>
                    <Text style={styles.trackingMeta}>
                      {tracking.productBrand} · {tracking.status} · Sonraki kontrol: {tracking.nextCheckInAt ? new Date(tracking.nextCheckInAt).toLocaleDateString("tr-TR") : "-"}
                    </Text>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  helperText?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={multiline ? "Satır satır yazın" : "Opsiyonel"}
        placeholderTextColor={Colors.textSecondary}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    backgroundColor: Colors.background,
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  loaderWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 10,
    paddingBottom: 10,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  trackingSection: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  trackingItem: {
    borderRadius: 10,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  trackingTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  trackingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveButton: {
    marginTop: 8,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
