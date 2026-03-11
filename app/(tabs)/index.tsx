import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Image,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  DEFAULT_MAX_SNAPSHOTS,
  captureSnapshot,
  getBestPictureSize,
  snapshotsToAnalyzeImages,
  type AnalyzeImage,
  type Snapshot,
} from "@/lib/camera/snapshot-camera";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

const SCAN_BOX_SIZE = 280;
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  photoUris?: string[];
  isLoading?: boolean;
};


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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cameraPictureSize, setCameraPictureSize] = useState<string | undefined>(undefined);
  const cameraRef = useRef<CameraView>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);
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
    const trimmedText = inputText.trim();
    const hasText = Boolean(trimmedText);
    const hasImages = snapshots.length > 0;

    if (isSending) return;
    if (!hasText && !hasImages) return;

    if (!chatMode) setChatMode(true);

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      text: trimmedText,
      isUser: true,
      photoUris: hasImages ? snapshots.map((snapshot) => snapshot.thumbnailUri) : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);

    const loadingId = `${Date.now()}-loading`;
    const loadingMsg: Message = {
      id: loadingId,
      text: "Analiz ediliyor…",
      isUser: false,
      isLoading: true,
    };

    const images: AnalyzeImage[] = hasImages ? snapshotsToAnalyzeImages(snapshots) : [];

    const payloadMessage = hasText ? trimmedText : "";

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
    ({ item }: { item: Message }) => {
      const photoUris = item.photoUris ?? [];
      const hasSinglePhoto = photoUris.length === 1;
      const hasMultiplePhotos = photoUris.length > 1;

      const showMedia = hasSinglePhoto || hasMultiplePhotos;

      return (
        <View
          style={[
            styles.messageItem,
            item.isUser ? styles.messageItemUser : styles.messageItemAssistant,
          ]}
        >
          {hasSinglePhoto ? (
            <View style={styles.mediaOnlyContainer}>
              <Image
                source={{ uri: photoUris[0] }}
                style={styles.messagePhotoSingle}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {hasMultiplePhotos ? (
            <View style={styles.mediaOnlyContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.messagePhotoRow}
                style={styles.messagePhotoScroll}
              >
                {photoUris.map((uri, idx) => (
                  <Image
                    key={`${item.id}-photo-${idx}`}
                    source={{ uri }}
                    style={styles.messagePhotoMulti}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {item.text ? (
            <Text
              style={[
                styles.messageText,
                item.isUser ? styles.userBubbleText : styles.assistantBubbleText,
                item.isLoading && styles.loadingText,
              ]}
            >
              {item.text}
            </Text>
          ) : showMedia ? null : (
            <Text style={[styles.messageText, styles.userBubbleText]} />
          )}
        </View>
      );
    },
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

        <View style={[styles.inputRow, { paddingBottom: bottomPadding }]}> 
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mesajınızı yazın..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              testID="message-input"
            />
            <TouchableOpacity
              style={styles.cameraInlineBtn}
              onPress={handleCameraPress}
              activeOpacity={0.7}
              testID="camera-btn"
            >
              <Ionicons name="camera-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!(inputText.trim() || snapshots.length > 0) || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!(inputText.trim() || snapshots.length > 0) || isSending}
            activeOpacity={0.8}
            testID="send-btn"
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                (inputText.trim() || snapshots.length > 0) && !isSending
                  ? Colors.white
                  : Colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
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

      <View style={[styles.cameraBottomPanel, { paddingBottom: bottomPadding + 12 }]}>
        <View style={styles.cameraInputRow}>
          <View style={[styles.inputContainer, styles.cameraInputContainer]}>
            <TextInput
              style={[styles.textInput, styles.cameraTextInput]}
              value={inputText}
              onChangeText={onInputTextChange}
              placeholder="Örn: Hangisi daha iyi, akneli cilt için uygun mu?"
              placeholderTextColor="rgba(255,255,255,0.65)"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={onSend}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              styles.cameraSendButton,
              (!(inputText.trim() || snapshots.length > 0) || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={onSend}
            disabled={!(inputText.trim() || snapshots.length > 0) || isSending}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                (inputText.trim() || snapshots.length > 0) && !isSending
                  ? Colors.white
                  : Colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.captureArea}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={onCapture}
            activeOpacity={0.85}
            disabled={snapshots.length >= DEFAULT_MAX_SNAPSHOTS || isSending}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


function SnapshotStrip({
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
          style={[
            styles.photoThumbWrapper,
            dark && styles.photoThumbWrapperDark,
          ]}
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
  messageItem: {
    maxWidth: "82%",
    gap: 6,
  },
  messageItemUser: {
    alignSelf: "flex-end",
  },
  messageItemAssistant: {
    alignSelf: "flex-start",
  },
  mediaOnlyContainer: {
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  userBubbleText: {
    color: Colors.white,
    backgroundColor: Colors.black,
    borderBottomRightRadius: 5,
  },
  assistantBubbleText: {
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 5,
  },
  messageBubble: {
    maxWidth: "82%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.black,
    borderBottomRightRadius: 5,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 5,
  },
  messagePhotoSingle: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },
  messagePhotoScroll: {
    maxHeight: 78,
  },
  messagePhotoRow: {
    gap: 6,
  },
  messagePhotoMulti: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  loadingText: {
    opacity: 0.55,
  },

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

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.card,
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  cameraInlineBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.cardInner,
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
  cameraBottomPanel: {
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  cameraInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  cameraInputContainer: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  cameraTextInput: {
    color: Colors.white,
  },
  cameraSendButton: {
    backgroundColor: Colors.black,
  },
  captureArea: {
    alignItems: "center",
    marginBottom: 6,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: "rgba(0,0,0,0.1)",
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
