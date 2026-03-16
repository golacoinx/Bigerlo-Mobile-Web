import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  DEFAULT_MAX_SNAPSHOTS,
  captureSnapshot,
  getBestPictureSize,
  pickSnapshotsFromLibrary,
  type AnalyzeImage,
  type Snapshot,
} from "@/lib/camera/snapshot-camera";
import Colors from "@/constants/colors";
import { MessageItem, type ChatMessage } from "@/components/chat/MessageItem";
import { SnapshotStrip } from "@/components/chat/SnapshotStrip";
import { Composer } from "@/components/chat/Composer";
import { CameraBottomPanel } from "@/components/chat/CameraBottomPanel";
import { ProfileMenu } from "@/components/menu/ProfileMenu";
import {
  createLoadingMessage,
  createUserMessage,
  getComposedMessageParts,
} from "@/lib/chat/send-helpers";
import { getApiUrl } from "@/lib/query-client";
import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import {
  orchestrateInitialAnalysis,
  orchestrateSessionUpdateAfterAnalysis,
  type UserInputPayload,
} from "@/lib/agents/orchestrator";
import {
  createInitialAnalysisSessionState,
  getActiveAnalyzedProduct,
} from "@/lib/session/analysis-session-store";

const SCAN_BOX_SIZE = 280;

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 60;

async function analyzeWithGemini(
  message: string,
  images: AnalyzeImage[]
): Promise<{ text: string; structured?: StructuredAnalysis }> {
  const base = getApiUrl();
  const url = new URL("/api/analyze", base).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, images }),
  });

  const data = (await response.json()) as AnalyzeApiResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "İstek başarısız oldu.");
  }

  return { text: data.text ?? "Yanıt alınamadı.", structured: data.structured };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chatMode, setChatMode] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisSessionState, setAnalysisSessionState] = useState(
    createInitialAnalysisSessionState,
  );
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cameraPictureSize, setCameraPictureSize] = useState<string | undefined>(undefined);
  const cameraRef = useRef<CameraView>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureRef = useRef<number>(0);
  const [permission, requestPermission] = useCameraPermissions();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding =
    TAB_BAR_HEIGHT + (Platform.OS === "web" ? 34 : insets.bottom);

  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 10);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  const activeProduct = getActiveAnalyzedProduct(analysisSessionState);
  const activeRisk = activeProduct?.risk;
  const activeComparison = analysisSessionState.comparison;

  const streamAssistantText = useCallback(
    (loadingId: string, fullText: string, structuredResult?: StructuredAnalysis) =>
      new Promise<void>((resolve) => {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }

        const chars = [...fullText];
        let index = 0;
        const step = Math.max(1, Math.ceil(chars.length / 120));

        typingTimerRef.current = setInterval(() => {
          index = Math.min(chars.length, index + step);
          const partial = chars.slice(0, index).join("");

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? { ...m, text: partial, isLoading: index < chars.length }
                : m
            )
          );

          if (index >= chars.length && typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? { ...m, text: fullText, isLoading: false, structuredResult }
                  : m
              )
            );

            resolve();
          }
        }, 20);
      }),
    []
  );

  const pushAssistantMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        text,
        isUser: false,
      },
    ]);
  }, []);

  const handleCameraPress = useCallback(async () => {
    if (!permission) return;
    if (!permission.granted) {
      await requestPermission();
      return;
    }
    setCameraOpen(true);
  }, [permission, requestPermission]);


  const handleGalleryPress = useCallback(async () => {
    const remainingSlots = DEFAULT_MAX_SNAPSHOTS - snapshots.length;

    if (remainingSlots <= 0) {
      pushAssistantMessage(`En fazla ${DEFAULT_MAX_SNAPSHOTS} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    try {
      const result = await pickSnapshotsFromLibrary(remainingSlots);

      if (result.permissionDenied) {
        pushAssistantMessage("Galeri izni gerekli. Lütfen ayarlardan fotoğraf erişimine izin verin.");
        return;
      }

      if (result.cancelled) {
        return;
      }

      if (result.snapshots.length > 0) {
        setSnapshots((prev) => [...prev, ...result.snapshots]);
      }

      if (result.failedCount > 0) {
        pushAssistantMessage("Bazı galeri fotoğrafları işlenemedi. Lütfen tekrar deneyin.");
      }
    } catch {
      pushAssistantMessage("Galeri fotoğrafı seçilirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }, [pushAssistantMessage, snapshots.length]);
  const handleCapture = useCallback(async () => {
    if (snapshots.length >= DEFAULT_MAX_SNAPSHOTS) {
      pushAssistantMessage(`En fazla ${DEFAULT_MAX_SNAPSHOTS} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const now = Date.now();
    if (now - lastCaptureRef.current < 1200) return;
    lastCaptureRef.current = now;

    try {
      const snapshot = await captureSnapshot({ cameraRef });
      if (!snapshot) {
        pushAssistantMessage("Fotoğraf işlenemedi. Lütfen tekrar deneyin.");
        return;
      }

      setSnapshots((prev) => [...prev, snapshot]);
    } catch {
      pushAssistantMessage("Fotoğraf çekilirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }, [pushAssistantMessage, snapshots.length]);

  const removeSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((prev) => prev.filter((snapshot) => snapshot.id !== snapshotId));
  }, []);

  const handleSend = useCallback(async () => {
    const { trimmedText, hasText, hasImages, payloadMessage, images } =
      getComposedMessageParts(inputText, snapshots);

    if (isSending) return;
    if (!hasText && !hasImages) return;

    if (!chatMode) setChatMode(true);

    const userMsg = createUserMessage(`${Date.now()}-user`, trimmedText, snapshots);

    setMessages((prev) => [...prev, userMsg]);

    const loadingId = `${Date.now()}-loading`;
    const loadingMsg = createLoadingMessage(loadingId);

    setMessages((prev) => [...prev, loadingMsg]);
    setIsSending(true);
    setInputText("");
    setSnapshots([]);
    setCameraOpen(false);
    inputRef.current?.focus();

    try {
      const response = await analyzeWithGemini(payloadMessage, images);
      const userInputPayload: UserInputPayload = {
        id: userMsg.id,
        type: hasText && hasImages ? "text+image" : hasImages ? "image" : "text",
        text: trimmedText || undefined,
        imageUri: snapshots[0]?.uri,
        createdAt: new Date().toISOString(),
      };

      const orchestrated = orchestrateInitialAnalysis({
        userInput: userInputPayload,
        analyzeResponse: response,
      });

      await streamAssistantText(
        loadingId,
        orchestrated.assistantMessageText,
        response.structured,
      );

      setAnalysisSessionState((prev) =>
        orchestrateSessionUpdateAfterAnalysis({
          state: prev,
          analyzedProduct: orchestrated.analyzedProduct,
        }).nextState,
      );
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Bir hata oluştu. Lütfen tekrar deneyin.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, text: errMsg, isLoading: false }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [chatMode, inputText, isSending, snapshots, streamAssistantText]);

  const handleCameraReady = useCallback(async () => {
    try {
      const bestSize = await getBestPictureSize(cameraRef);
      if (bestSize) {
        setCameraPictureSize(bestSize);
      }
    } catch {
      // noop: fallback to camera defaults
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setAnalysisSessionState(createInitialAnalysisSessionState());
    setInputText("");
    setChatMode(false);
    setSnapshots([]);
    setCameraOpen(false);
  }, []);

  const handleNavigateFromMenu = useCallback(
    (route: string) => {
      router.push(route as never);
    },
    [router]
  );

  const handleTrackProduct = useCallback(async (structured: StructuredAnalysis) => {
    try {
      const url = new URL("/api/tracking/start", getApiUrl()).toString();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: structured.productId,
          product: {
            name: structured.product.name,
            brand: structured.product.brand,
            type: structured.product.type,
            ingredients: structured.ingredients,
          },
        }),
      });

      const data = (await response.json()) as { alreadyTracked?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Ürün takibe eklenemedi.");
      }

      if (data.alreadyTracked) {
        Alert.alert("Zaten Takipte", "Bu ürün zaten aktif olarak takip ediliyor.");
        return;
      }

      Alert.alert("Takip Başlatıldı", "Ürün takip listenize eklendi.");
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Takip başlatılamadı.");
    }
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageItem item={item} onTrackProduct={handleTrackProduct} />
    ),
    [handleTrackProduct]
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}> 
      {chatMode ? (
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.chatHeaderBtn}
            onPress={handleNewChat}
            activeOpacity={0.75}
            testID="new-chat-btn"
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.chatHeaderCenter} />
          <TouchableOpacity
            style={styles.profilePhoto}
            activeOpacity={0.8}
            onPress={() => setMenuVisible(true)}
            testID="profile-menu-btn"
          >
            <Ionicons name="person" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.homeHeader}>
          <View style={styles.headerLeft} />
          <Text style={styles.brandTitle}>BIGERLO</Text>
          <TouchableOpacity
            style={styles.profilePhoto}
            activeOpacity={0.8}
            onPress={() => setMenuVisible(true)}
            testID="profile-menu-btn"
          >
            <Ionicons name="person" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.body}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={[styles.messageListContent, { paddingBottom: 12 }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.riskTabCard}>
          <Text style={styles.riskTabTitle}>Risk</Text>
          {!activeRisk ? (
            <Text style={styles.riskEmptyText}>Henüz risk verisi yok.</Text>
          ) : (
            <View style={styles.riskSectionsWrap}>
              <RiskListSection title="Risks" values={activeRisk.risks} />
              <RiskListSection title="Warnings" values={activeRisk.warnings} />
              <RiskListSection title="Personal Cautions" values={activeRisk.personalCautions} />
            </View>
          )}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Karşılaştırma</Text>
          {!activeComparison ? (
            <Text style={styles.comparisonEmptyText}>Karşılaştırma için en az iki analizli ürün gerekli.</Text>
          ) : (
            <View style={styles.comparisonContent}>
              <Text style={styles.comparisonPairLabel}>
                {getProductDisplayNameById(analysisSessionState, activeComparison.leftProductId, "Ürün 1")} vs {" "}
                {getProductDisplayNameById(analysisSessionState, activeComparison.rightProductId, "Ürün 2")}
              </Text>
              <ComparisonWinnerRow
                label="Safety"
                winner={activeComparison.winnerByCategory.safety}
              />
              <ComparisonWinnerRow
                label="Suitability"
                winner={activeComparison.winnerByCategory.suitability}
              />
              <ComparisonWinnerRow label="Value" winner={activeComparison.winnerByCategory.value} />
              <Text style={styles.comparisonSummary}>{activeComparison.summary}</Text>
            </View>
          )}
        </View>

        {snapshots.length > 0 ? (
          <SnapshotStrip snapshots={snapshots} onRemove={removeSnapshot} />
        ) : null}

        <Composer
          inputRef={inputRef}
          inputText={inputText}
          snapshotsCount={snapshots.length}
          onChangeText={setInputText}
          onCameraPress={handleCameraPress}
          onGalleryPress={handleGalleryPress}
          onSend={handleSend}
          bottomPadding={bottomPadding}
          isSending={isSending}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={cameraOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraOpen(false)}
      >
        <CameraFullScreen
          cameraRef={cameraRef}
          cameraPictureSize={cameraPictureSize}
          snapshots={snapshots}
          inputText={inputText}
          isSending={isSending}
          onInputTextChange={setInputText}
          onCapture={handleCapture}
          onCameraReady={handleCameraReady}
          onRemoveSnapshot={removeSnapshot}
          onSend={handleSend}
          onGalleryPress={handleGalleryPress}
          onClose={() => setCameraOpen(false)}
        />
      </Modal>

      <ProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigateFromMenu}
      />
    </View>
  );
}

function RiskListSection({ title, values }: { title: string; values: string[] }) {
  return (
    <View style={styles.riskSection}>
      <Text style={styles.riskSectionTitle}>{title}</Text>
      {values.length > 0 ? (
        values.slice(0, 4).map((item, index) => (
          <Text key={`${title}-${index}`} style={styles.riskSectionItem}>
            • {item}
          </Text>
        ))
      ) : (
        <Text style={styles.riskEmptyText}>Veri bulunamadı.</Text>
      )}
    </View>
  );
}

function getProductDisplayNameById(
  state: { analyzedProducts: { id: string; productDetection?: { productName?: string } }[] },
  productId: string,
  fallback: string,
): string {
  const product = state.analyzedProducts.find((item) => item.id === productId);
  const name = product?.productDetection?.productName?.trim();
  return name && name.length > 0 ? name : fallback;
}

function ComparisonWinnerRow({
  label,
  winner,
}: {
  label: string;
  winner?: "left" | "right" | "tie";
}) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonRowLabel}>{label}</Text>
      <Text style={styles.comparisonRowValue}>{winner ?? "tie"}</Text>
    </View>
  );
}

type CameraFullScreenProps = {
  cameraRef: React.RefObject<CameraView | null>;
  cameraPictureSize?: string;
  snapshots: Snapshot[];
  inputText: string;
  isSending: boolean;
  onCameraReady: () => void;
  onInputTextChange: (value: string) => void;
  onCapture: () => void;
  onRemoveSnapshot: (id: string) => void;
  onSend: () => void;
  onGalleryPress: () => void;
  onClose: () => void;
};

function CameraFullScreen({
  cameraRef,
  cameraPictureSize,
  snapshots,
  inputText,
  isSending,
  onCameraReady,
  onInputTextChange,
  onCapture,
  onRemoveSnapshot,
  onSend,
  onGalleryPress,
  onClose,
}: CameraFullScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.cameraContainer}>
      <StatusBar hidden />

      <View style={styles.cameraPreviewArea}>
        <CameraView
          ref={cameraRef}
          style={styles.cameraPreview}
          facing="back"
          ratio="4:3"
          pictureSize={cameraPictureSize}
          autofocus="on"
          flash="off"
          onCameraReady={onCameraReady}
        />

        <View style={styles.scanBoxOverlay} pointerEvents="none">
          <View style={styles.scanBox}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.closeButton, { top: topPadding + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <CameraBottomPanel
        inputText={inputText}
        snapshots={snapshots}
        isSending={isSending}
        bottomPadding={bottomPadding}
        maxSnapshots={DEFAULT_MAX_SNAPSHOTS}
        onInputTextChange={onInputTextChange}
        onSend={onSend}
        onCapture={onCapture}
        onGalleryPress={onGalleryPress}
        onRemoveSnapshot={onRemoveSnapshot}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardInner,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerLeft: {
    width: 40,
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  chatHeaderCenter: {
    flex: 1,
  },
  chatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },

  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingTop: 6,
    gap: 8,
  },
  riskTabCard: {
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: 10,
    gap: 6,
  },
  riskTabTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  riskSectionsWrap: {
    gap: 8,
  },
  riskSection: {
    gap: 4,
  },
  riskSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  riskSectionItem: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  riskEmptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  comparisonCard: {
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: 10,
    gap: 8,
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  comparisonEmptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  comparisonContent: {
    gap: 6,
  },
  comparisonPairLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comparisonRowLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  comparisonRowValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  comparisonSummary: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cameraPreviewArea: {
    flex: 1,
    minHeight: 360,
    position: "relative",
    overflow: "hidden",
    backgroundColor: Colors.black,
  },
  cameraPreview: {
    width: "100%",
    height: "100%",
  },
  scanBoxOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },


  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
  },
  scanCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#3B82F6",
    borderWidth: 3,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});
