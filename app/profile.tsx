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
import type { CheckInItem, TrackingSummary } from "@/lib/chat/analysis-types";

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

type CheckInPayload = {
  checkIns?: CheckInItem[];
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

function parseScale(value: string, min: number, max: number): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  const [skinType, setSkinType] = useState("");
  const [hairType, setHairType] = useState("");
  const [sensitivitiesText, setSensitivitiesText] = useState("");
  const [avoidIngredientsText, setAvoidIngredientsText] = useState("");
  const [knownReactionsText, setKnownReactionsText] = useState("");

  const [trackings, setTrackings] = useState<TrackingSummary[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);

  const [itch, setItch] = useState("");
  const [dryness, setDryness] = useState("");
  const [reaction, setReaction] = useState("");
  const [relief, setRelief] = useState("");
  const [satisfaction, setSatisfaction] = useState("");
  const [note, setNote] = useState("");

  const profileUrl = useMemo(() => new URL("/api/profile", getApiUrl()).toString(), []);
  const trackingUrl = useMemo(() => new URL("/api/tracking", getApiUrl()).toString(), []);
  const checkInsUrl = useMemo(() => new URL("/api/check-ins", getApiUrl()).toString(), []);
  const checkInsSubmitUrl = useMemo(
    () => new URL("/api/check-ins/submit", getApiUrl()).toString(),
    [],
  );

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

  const loadCheckIns = useCallback(async () => {
    try {
      const response = await fetch(checkInsUrl);
      const data = (await response.json()) as CheckInPayload;
      if (!response.ok) {
        throw new Error(data.error ?? "Check-in listesi alınamadı.");
      }
      setCheckIns(data.checkIns ?? []);
    } catch {
      setCheckIns([]);
    }
  }, [checkInsUrl]);

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
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [profileUrl]);

  useEffect(() => {
    void Promise.all([loadProfile(), loadTrackings(), loadCheckIns()]);
  }, [loadProfile, loadTrackings, loadCheckIns]);

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
      await Promise.all([loadTrackings(), loadCheckIns()]);
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }, [
    avoidIngredientsText,
    hairType,
    knownReactionsText,
    loadCheckIns,
    loadTrackings,
    profileUrl,
    sensitivitiesText,
    skinType,
  ]);

  const handleSubmitCheckIn = useCallback(async () => {
    const selected = checkIns.find((item) => item.trackingId === selectedCheckInId);
    if (!selected) return;

    const payload = {
      trackingId: selected.trackingId,
      dayOffset: selected.dayOffset,
      itch: parseScale(itch, 0, 3),
      dryness: parseScale(dryness, 0, 3),
      reaction: parseScale(reaction, 0, 3),
      relief: parseScale(relief, 0, 3),
      satisfaction: parseScale(satisfaction, 1, 5),
      note: note.trim() || undefined,
    };

    if (satisfaction.trim() && payload.satisfaction === null) {
      Alert.alert("Hata", "Satisfaction 1 ile 5 arasında olmalıdır.");
      return;
    }

    setSubmittingCheckIn(true);
    try {
      const response = await fetch(checkInsSubmitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Check-in kaydedilemedi.");
      }

      Alert.alert("Kaydedildi", "Check-in geri bildiriminiz kaydedildi.");
      setSelectedCheckInId(null);
      setItch("");
      setDryness("");
      setReaction("");
      setRelief("");
      setSatisfaction("");
      setNote("");
      await Promise.all([loadTrackings(), loadCheckIns()]);
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Check-in kaydedilemedi.");
    } finally {
      setSubmittingCheckIn(false);
    }
  }, [
    checkIns,
    checkInsSubmitUrl,
    dryness,
    itch,
    loadCheckIns,
    loadTrackings,
    note,
    reaction,
    relief,
    satisfaction,
    selectedCheckInId,
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

            <View style={styles.trackingSection}>
              <Text style={styles.sectionHeader}>Due / Upcoming check-ins</Text>
              {checkIns.length === 0 ? (
                <Text style={styles.helper}>Şu anda bekleyen check-in yok.</Text>
              ) : (
                checkIns.slice(0, 6).map((checkIn) => (
                  <View key={`${checkIn.trackingId}-${checkIn.dayOffset}`} style={styles.trackingItem}>
                    <Text style={styles.trackingTitle}>
                      {checkIn.productName} · {checkIn.checkInLabel}
                    </Text>
                    <Text style={styles.trackingMeta}>
                      {checkIn.productBrand} · {checkIn.status} · {new Date(checkIn.dueAt).toLocaleDateString("tr-TR")}
                    </Text>
                    <TouchableOpacity
                      style={styles.inlineActionBtn}
                      onPress={() => setSelectedCheckInId(checkIn.trackingId)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.inlineActionText}>Check-in gönder</Text>
                    </TouchableOpacity>

                    {selectedCheckInId === checkIn.trackingId ? (
                      <View style={styles.checkInForm}>
                        <Text style={styles.helper}>Skorlar: itch/dryness/reaction/relief 0-3, satisfaction 1-5</Text>
                        <ScaleInput label="itch" value={itch} onChangeText={setItch} />
                        <ScaleInput label="dryness" value={dryness} onChangeText={setDryness} />
                        <ScaleInput label="reaction" value={reaction} onChangeText={setReaction} />
                        <ScaleInput label="relief" value={relief} onChangeText={setRelief} />
                        <ScaleInput label="satisfaction" value={satisfaction} onChangeText={setSatisfaction} />
                        <Field
                          label="Note"
                          value={note}
                          onChangeText={setNote}
                          multiline
                          helperText="Opsiyonel kısa not"
                        />
                        <TouchableOpacity
                          style={[styles.inlineActionBtn, submittingCheckIn && styles.saveButtonDisabled]}
                          onPress={handleSubmitCheckIn}
                          disabled={submittingCheckIn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.inlineActionText}>
                            {submittingCheckIn ? "Gönderiliyor..." : "Check-in kaydet"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
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

function ScaleInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.scaleRow}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <TextInput
        style={styles.scaleInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="-"
        placeholderTextColor={Colors.textSecondary}
      />
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
    gap: 6,
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
  inlineActionBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: Colors.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  checkInForm: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    gap: 6,
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scaleLabel: {
    width: 84,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  scaleInput: {
    width: 56,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: "center",
    color: Colors.textPrimary,
    fontSize: 13,
    backgroundColor: Colors.white,
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
