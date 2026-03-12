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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import {
  createLoadingMessage,
  createUserMessage,
  getComposedMessageParts,
} from "@/lib/chat/send-helpers";
import { getApiUrl } from "@/lib/query-client";

const SCAN_BOX_SIZE = 280;

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 60;

async function analyzeWithGemini(
  message: string,
  images: AnalyzeImage[]
): Promise<string> {
  const base = getApiUrl();
  const url = new URL("/api/analyze", base).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, images }),
  });

  const data = (await response.json()) as { text?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "İstek başarısız oldu.");
  }

  return data.text ?? "Yanıt alınamadı.";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [chatMode, setChatMode] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const streamAssistantText = useCallback(
    (loadingId: string, fullText: string) =>
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
                  ? { ...m, text: fullText, isLoading: false }
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
      const responseText = await analyzeWithGemini(payloadMessage, images);
      await streamAssistantText(loadingId, responseText);
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
    setInputText("");
    setChatMode(false);
    setSnapshots([]);
    setCameraOpen(false);
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageItem item={item} />,
    []
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}> 
      {chatMode ? (
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderSpacer} />
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
        </View>
      ) : (
        <View style={styles.homeHeader}>
          <TouchableOpacity style={styles.profilePhoto} activeOpacity={0.8}>
            <Ionicons name="person" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.brandTitle}>BIGERLO</Text>
          <View style={styles.headerRight} />
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
          onClose={() => setCameraOpen(false)}
        />
      </Modal>
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

      {snapshots.length > 0 ? (
        <View style={styles.cameraSnapshotStripWrap}>
          <SnapshotStrip snapshots={snapshots} onRemove={onRemoveSnapshot} dark />
        </View>
      ) : null}

      <CameraBottomPanel
        inputText={inputText}
        snapshotsCount={snapshots.length}
        isSending={isSending}
        bottomPadding={bottomPadding}
        maxSnapshots={DEFAULT_MAX_SNAPSHOTS}
        onInputTextChange={onInputTextChange}
        onSend={onSend}
        onCapture={onCapture}
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
    justifyContent: "space-between",
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
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  chatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderSpacer: {
    flex: 1,
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



  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  cameraPreviewArea: {
    flex: 1,
    minHeight: 340,
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
  cameraSnapshotStripWrap: {
    minHeight: 78,
    paddingTop: 8,
    paddingHorizontal: 16,
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
