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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  createLoadingMessage,
  createUserMessage,
  getComposedMessageParts,
} from "@/lib/chat/send-helpers";
import { orchestrateInitialAnalysis, type UserInputPayload } from "@/lib/agents/orchestrator";
import {
  appendAnalyzedProductAsActive,
  createInitialAnalysisSessionState,
  setComparison,
} from "@/lib/session/analysis-session-store";
import { getApiUrl } from "@/lib/query-client";
import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";

const SCAN_BOX_SIZE = 280;

type AnalysisTab = "Analiz" | "Karşılaştırma" | "Risk" | "Fiyat";

const ANALYSIS_TABS: { key: AnalysisTab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "Analiz", icon: "sparkles-outline" },
  { key: "Karşılaştırma", icon: "git-compare-outline" },
  { key: "Risk", icon: "shield-checkmark-outline" },
  { key: "Fiyat", icon: "pricetag-outline" },
];

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
  const insets = useSafeAreaInsets();
  const [chatMode, setChatMode] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>("Analiz");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisSessionState, setAnalysisSessionState] = useState(createInitialAnalysisSessionState());
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cameraPictureSize, setCameraPictureSize] = useState<string | undefined>(undefined);
  const cameraRef = useRef<CameraView>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureRef = useRef<number>(0);
  const [permission, requestPermission] = useCameraPermissions();

  const activeProduct = analysisSessionState.analyzedProducts.find(
    (product) => product.id === analysisSessionState.activeProductId
  );
  const activeRisk = activeProduct?.risk;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

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

    const userInputPayload: UserInputPayload = {
      id: userMsg.id,
      type: hasText && hasImages ? "text+image" : hasImages ? "image" : "text",
      text: hasText ? payloadMessage : undefined,
      imageUri: snapshots[0]?.uri,
      createdAt: new Date().toISOString(),
    };

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
      const orchestration = orchestrateInitialAnalysis({
        userInput: userInputPayload,
        response,
        existingAnalyzedProducts: analysisSessionState.analyzedProducts,
      });

      if (orchestration.mode === "product-analysis") {
        const analyzedProduct = orchestration.analyzedProduct;

        if (analyzedProduct) {
          setAnalysisSessionState((prev) => {
            const withActiveProduct = appendAnalyzedProductAsActive(prev, analyzedProduct);
            return setComparison(withActiveProduct, orchestration.comparison);
          });
        }
      }

      await streamAssistantText(
        loadingId,
        orchestration.assistantMessageText,
        orchestration.shouldAttachStructuredResult ? response.structured : undefined
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
  }, [analysisSessionState.analyzedProducts, chatMode, inputText, isSending, snapshots, streamAssistantText]);

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
    setInputText("");
    setChatMode(false);
    setSnapshots([]);
    setCameraOpen(false);
    setAnalysisSessionState(createInitialAnalysisSessionState());
  }, []);

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

  const renderRiskList = useCallback((title: string, items: string[]) => {
    if (!items.length) return null;

    return (
      <View style={styles.riskSection}>
        <Text style={styles.riskSectionTitle}>{title}</Text>
        {items.map((item, idx) => (
          <Text key={`${title}-${idx}`} style={styles.riskItem}>
            • {item}
          </Text>
        ))}
      </View>
    );
  }, []);

  const hasRiskContent = Boolean(
    activeRisk &&
      (activeRisk.risks.length > 0 ||
        activeRisk.warnings.length > 0 ||
        activeRisk.personalCautions.length > 0)
  );

  const activeComparison = analysisSessionState.comparison;
  const leftComparisonProduct = activeComparison
    ? analysisSessionState.analyzedProducts.find(
        (product) => product.id === activeComparison.leftProductId
      )
    : undefined;
  const rightComparisonProduct = activeComparison
    ? analysisSessionState.analyzedProducts.find(
        (product) => product.id === activeComparison.rightProductId
      )
    : undefined;

  const leftComparisonName =
    leftComparisonProduct?.productDetection?.productName?.trim() || "Ürün 1";
  const rightComparisonName =
    rightComparisonProduct?.productDetection?.productName?.trim() || "Ürün 2";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={{ paddingTop: topPadding, flex: 1 }}>
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
          <View style={styles.headerRight} />
        </View>
      ) : (
        <View style={styles.homeHeader}>
          <View style={styles.headerLeft} />
          <Text style={styles.brandTitle}>BIGERLO</Text>
          <View style={styles.headerRight} />
        </View>
      )}


      {messages.length > 0 ? (
        <View style={styles.analysisTabsContainer}>
          <View style={styles.analysisTabsRow}>
            {ANALYSIS_TABS.map((tab) => {
              const isActive = activeAnalysisTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.analysisTab, isActive && styles.analysisTabActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveAnalysisTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.analysisTabLabel, isActive && styles.analysisTabLabelActive]}>
                    {tab.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.body}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {activeAnalysisTab === "Analiz" ? (
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
        ) : activeAnalysisTab === "Karşılaştırma" ? (
          activeComparison ? (
            <View style={styles.comparisonTabContainer}>
              <Text style={styles.comparisonTitle}>{leftComparisonName} ↔ {rightComparisonName}</Text>
              <Text style={styles.comparisonLine}>
                Güvenlik: {activeComparison.winnerByCategory.safety ?? "tie"}
              </Text>
              <Text style={styles.comparisonLine}>
                Uygunluk: {activeComparison.winnerByCategory.suitability ?? "tie"}
              </Text>
              <Text style={styles.comparisonLine}>
                Değer: {activeComparison.winnerByCategory.value ?? "tie"}
              </Text>
              <Text style={styles.comparisonSummary}>{activeComparison.summary}</Text>
            </View>
          ) : (
            <View style={styles.placeholderTabContainer}>
              <Text style={styles.placeholderTabTitle}>{activeAnalysisTab}</Text>
            </View>
          )
        ) : activeAnalysisTab === "Risk" ? (
          hasRiskContent && activeRisk ? (
            <View style={styles.riskTabContainer}>
              {renderRiskList("Risk Sinyalleri", activeRisk.risks)}
              {renderRiskList("Uyarılar", activeRisk.warnings)}
              {renderRiskList("Kişisel Dikkat Notları", activeRisk.personalCautions)}
            </View>
          ) : (
            <View style={styles.placeholderTabContainer}>
              <Text style={styles.placeholderTabTitle}>{activeAnalysisTab}</Text>
            </View>
          )
        ) : (
          <View style={styles.placeholderTabContainer}>
            <Text style={styles.placeholderTabTitle}>{activeAnalysisTab}</Text>
          </View>
        )}

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

      </View>
    </SafeAreaView>
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
  headerRight: {
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
  analysisTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  analysisTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  analysisTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  analysisTabActive: {
    backgroundColor: "#2B81FF",
  },
  analysisTabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  analysisTabLabelActive: {
    color: Colors.white,
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
  placeholderTabContainer: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  placeholderTabTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  comparisonTabContainer: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.card,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  comparisonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  comparisonLine: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  comparisonSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  riskTabContainer: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.card,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  riskSection: {
    gap: 6,
  },
  riskSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  riskItem: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
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
