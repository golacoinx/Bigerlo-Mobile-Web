import React, { useState, useRef, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { CameraView, useCameraPermissions } from "expo-camera";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  photoUri?: string;
  isLoading?: boolean;
};

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 60;

async function analyzeWithGemini(
  message: string,
  imageBase64?: string | null
): Promise<string> {
  if (!imageBase64) {
    console.error("analyzeWithGemini: imageBase64 eksik, API çağrısı iptal edildi.");
    throw new Error("Fotoğraf verisi bulunamadı. Lütfen tekrar çekin.");
  }

  const base = getApiUrl();
  const url = new URL("/api/analyze", base).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, imageBase64, mimeType: "image/jpeg" }),
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const inputRef = useRef<TextInput>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding =
    TAB_BAR_HEIGHT + (Platform.OS === "web" ? 34 : insets.bottom);

  const handleCameraPress = useCallback(async () => {
    if (!permission) return;
    if (!permission.granted) {
      await requestPermission();
      return;
    }
    setCameraOpen(true);
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setPhotoBase64(photo.base64 ?? null);
      }
    } catch (e) {}
    setCameraOpen(false);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    if (!chatMode) setChatMode(true);

    const capturedPhoto = photoUri;
    const capturedBase64 = photoBase64;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      photoUri: capturedPhoto ?? undefined,
    };

    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = {
      id: loadingId,
      text: "Analiz ediliyor…",
      isUser: false,
      isLoading: true,
    };

    setMessages((prev) => [loadingMsg, userMsg, ...prev]);
    setInputText("");
    setPhotoUri(null);
    setPhotoBase64(null);
    setIsSending(true);
    inputRef.current?.focus();

    try {
      const responseText = await analyzeWithGemini(text, capturedBase64);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, text: responseText, isLoading: false }
            : m
        )
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
  }, [inputText, chatMode, photoUri, photoBase64, isSending]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInputText("");
    setChatMode(false);
    setPhotoUri(null);
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {item.photoUri && (
          <Image
            source={{ uri: item.photoUri }}
            style={styles.messagePhoto}
            resizeMode="cover"
          />
        )}
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userText : styles.assistantText,
            item.isLoading && styles.loadingText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    ),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {chatMode ? (
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.chatHeaderBtn}
            onPress={handleCameraPress}
            activeOpacity={0.75}
            testID="camera-btn"
          >
            <Ionicons
              name="camera-outline"
              size={18}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
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
        {!chatMode && (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.92}
            onPress={handleCameraPress}
            testID="camera-card"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Ionicons
                name="camera-outline"
                size={20}
                color={Colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        )}

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {photoUri && chatMode && (
          <View style={styles.photoAttachRow}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setPhotoUri(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: bottomPadding }]}>
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
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
            testID="send-btn"
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                inputText.trim() && !isSending
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
          onCapture={handleCapture}
          onClose={() => setCameraOpen(false)}
        />
      </Modal>
    </View>
  );
}

type CameraFullScreenProps = {
  cameraRef: React.RefObject<CameraView>;
  onCapture: () => void;
  onClose: () => void;
};

function CameraFullScreen({
  cameraRef,
  onCapture,
  onClose,
}: CameraFullScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.cameraContainer}>
      <StatusBar hidden />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      <TouchableOpacity
        style={[styles.closeButton, { top: topPadding + 12 }]}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={22} color={Colors.white} />
      </TouchableOpacity>

      <View style={[styles.captureArea, { paddingBottom: bottomPadding + 32 }]}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onCapture}
          activeOpacity={0.85}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
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

  card: {
    height: 110,
    backgroundColor: Colors.card,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },

  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "78%",
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
  messagePhoto: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  loadingText: {
    opacity: 0.55,
  },

  photoAttachRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  removePhotoBtn: {
    padding: 2,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
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
  captureArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
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
});
