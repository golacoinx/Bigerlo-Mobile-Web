import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

type ProfilePayload = {
  id: string;
  skinType: string;
  hairType: string;
  sensitivities: string[];
  avoidIngredients: string[];
  knownReactions: string[];
};

function splitCsv(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

function joinCsv(values: string[]): string {
  return values.join(", ");
}

export default function ProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const [skinType, setSkinType] = useState("");
  const [hairType, setHairType] = useState("");
  const [sensitivitiesText, setSensitivitiesText] = useState("");
  const [avoidIngredientsText, setAvoidIngredientsText] = useState("");
  const [knownReactionsText, setKnownReactionsText] = useState("");

  const hasChanges = useMemo(() => {
    return (
      skinType.trim().length > 0 ||
      hairType.trim().length > 0 ||
      sensitivitiesText.trim().length > 0 ||
      avoidIngredientsText.trim().length > 0 ||
      knownReactionsText.trim().length > 0
    );
  }, [avoidIngredientsText, hairType, knownReactionsText, sensitivitiesText, skinType]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setFeedback("");

    try {
      const base = getApiUrl();
      const response = await fetch(new URL("/api/profile", base).toString());

      if (!response.ok) {
        throw new Error("Profil alınamadı.");
      }

      const data = (await response.json()) as ProfilePayload;
      setSkinType(data.skinType === "unknown" ? "" : data.skinType);
      setHairType(data.hairType === "unknown" ? "" : data.hairType);
      setSensitivitiesText(joinCsv(data.sensitivities));
      setAvoidIngredientsText(joinCsv(data.avoidIngredients));
      setKnownReactionsText(joinCsv(data.knownReactions));
    } catch {
      setFeedback("Profil bilgileri alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setFeedback("");

    try {
      const base = getApiUrl();
      const response = await fetch(new URL("/api/profile", base).toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinType: skinType.trim() || "unknown",
          hairType: hairType.trim() || "unknown",
          sensitivities: splitCsv(sensitivitiesText),
          avoidIngredients: splitCsv(avoidIngredientsText),
          knownReactions: splitCsv(knownReactionsText),
        }),
      });

      if (!response.ok) {
        throw new Error("Profil kaydedilemedi.");
      }

      setFeedback("Profil kaydedildi.");
    } catch {
      setFeedback("Profil kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  }, [avoidIngredientsText, hairType, knownReactionsText, sensitivitiesText, skinType]);

  return (
    <>
      <Stack.Screen options={{ title: "Profile & Account" }} />
      <MenuScreenScaffold
        title="Profile & Account"
        description="Minimum kişisel uygunluk profili. Virgülle ayırarak birden fazla değer ekleyebilirsiniz."
      >
        <View style={styles.card}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.textSecondary} />
            </View>
          ) : (
            <>
              <Field
                label="Skin Type"
                placeholder="örn: oily, dry, combination"
                value={skinType}
                onChangeText={setSkinType}
              />
              <Field
                label="Hair Type"
                placeholder="örn: curly, straight, fine"
                value={hairType}
                onChangeText={setHairType}
              />
              <Field
                label="Sensitivities"
                placeholder="örn: fragrance, alcohol denat"
                value={sensitivitiesText}
                onChangeText={setSensitivitiesText}
              />
              <Field
                label="Avoid Ingredients"
                placeholder="örn: SLS, retinol"
                value={avoidIngredientsText}
                onChangeText={setAvoidIngredientsText}
              />
              <Field
                label="Known Reactions"
                placeholder="örn: itching, dryness"
                value={knownReactionsText}
                onChangeText={setKnownReactionsText}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Kaydediliyor..." : "Profili Kaydet"}
                </Text>
              </TouchableOpacity>

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
              {!hasChanges ? (
                <Text style={styles.hint}>Henüz bilgi yok. Boş bırakabilirsiniz.</Text>
              ) : null}
            </>
          )}
        </View>
      </MenuScreenScaffold>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    padding: 16,
    gap: 12,
  },
  loadingWrap: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  input: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputMultiline: {
    minHeight: 78,
    paddingTop: 10,
    paddingBottom: 10,
  },
  saveButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  feedback: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
