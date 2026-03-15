import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ChatRole = "user" | "ai";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type AnalysisTabKey = "analiz" | "kıyas" | "uyum" | "fiyat";

const DRAWER_WIDTH = 300;

const fakeHistory = [
  "Yeni serum analizi",
  "Temiz içerik nemlendirici",
  "Fiyat/performans kıyası",
  "Sivilce için gece rutini",
];

const fakeAssistantReplies = [
  "Ürünün içeriğini inceledim. Hassas cilt için uygun görünüyor, ancak parfüm bileşeni nedeniyle gece kullanımıyla başlamanı öneririm.",
  "Kıyas sonucunda ikinci ürün daha dengeli bir formüle sahip. Bütçe odaklı seçimde ilk ürün öne çıkıyor.",
  "Uyum puanı yüksek görünüyor. Sabah SPF ile birlikte kullanırsan daha güvenli bir rutin elde edersin.",
];

function AnalysisTabs({
  activeTab,
  onChange,
}: {
  activeTab: AnalysisTabKey;
  onChange: (tab: AnalysisTabKey) => void;
}) {
  const tabs: { key: AnalysisTabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "analiz", label: "Analiz", icon: "sparkles-outline" },
    { key: "kıyas", label: "Kıyas", icon: "git-compare-outline" },
    { key: "uyum", label: "Uyum", icon: "shield-checkmark-outline" },
    { key: "fiyat", label: "Fiyat", icon: "pricetag-outline" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
    >
      <View className="flex-row gap-2">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={`flex-row items-center rounded-2xl border px-4 py-2 ${
              active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={active ? "#2563EB" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text className={`text-sm font-semibold ${active ? "text-blue-700" : "text-slate-600"}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </ScrollView>
  );
}

export function BigerloHomeV2() {
  const insets = useSafeAreaInsets();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [hasAnalysisResult, setHasAnalysisResult] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTabKey>("analiz");
  const [inputHeight, setInputHeight] = useState(42);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const hasMessage = messageInput.trim().length > 0;

  const activeTabPlaceholder = useMemo(() => {
    switch (activeAnalysisTab) {
      case "analiz":
        return "Analiz özeti burada gösterilecek.";
      case "kıyas":
        return "Kıyas sonuçları burada gösterilecek.";
      case "uyum":
        return "Cilt/rutin uyum bilgileri burada gösterilecek.";
      case "fiyat":
        return "Fiyat, gramaj ve değer karşılaştırması burada gösterilecek.";
      default:
        return "Sonuç hazırlanıyor...";
    }
  }, [activeAnalysisTab]);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsDrawerOpen(false);
    });
  };

  const handleSendMessage = () => {
    const trimmed = messageInput.trim();
    if (!trimmed || isAiTyping) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageInput("");
    setIsPlusMenuOpen(false);
    setIsAiTyping(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        role: "ai",
        text: fakeAssistantReplies[Math.floor(Math.random() * fakeAssistantReplies.length)],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setHasAnalysisResult(true);
      setIsAiTyping(false);
    }, 900);
  };

  const startNewChat = () => {
    setMessages([]);
    setMessageInput("");
    setHasAnalysisResult(false);
    setIsAiTyping(false);
    setIsPlusMenuOpen(false);
    closeDrawer();
  };

  const drawerTranslateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <Pressable
            onPress={openDrawer}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
          >
            <Ionicons name="menu" size={20} color="#334155" />
          </Pressable>

          <View className="rounded-2xl bg-slate-100 px-4 py-2">
            <Text className="text-[15px] font-bold tracking-[2px] text-slate-900">BIGERLO</Text>
          </View>

          <Pressable
            onPress={startNewChat}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
          >
            <Ionicons name="add" size={20} color="#334155" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 176 }}
          showsVerticalScrollIndicator={false}
        >
          {hasAnalysisResult ? (
            <>
              <AnalysisTabs activeTab={activeAnalysisTab} onChange={setActiveAnalysisTab} />
              <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
                <Text className="text-xs uppercase tracking-[1.2px] text-slate-500">{activeAnalysisTab}</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-700">{activeTabPlaceholder}</Text>
              </View>
            </>
          ) : null}

          {messages.length === 0 ? (
            <View className="mt-20 items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10">
              <Ionicons name="sparkles-outline" size={24} color="#64748B" />
              <Text className="mt-4 text-center text-base font-semibold text-slate-900">
                Ürününü yaz veya fotoğrafla, analizi başlatalım
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                Bigerlo hızlı analiz, kıyas, uyum ve fiyat görünümüyle tek akışta yardımcı olur.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {messages.map((message) => (
                <View
                  key={message.id}
                  className={`max-w-[88%] rounded-3xl px-4 py-3 ${
                    message.role === "user"
                      ? "ml-auto rounded-br-md bg-blue-600"
                      : "mr-auto rounded-bl-md border border-slate-200 bg-white"
                  }`}
                >
                  <Text
                    className={`text-[15px] leading-6 ${
                      message.role === "user" ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {message.text}
                  </Text>
                </View>
              ))}

              {isAiTyping ? (
                <View className="mr-auto rounded-3xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                  <Text className="text-sm text-slate-500">Bigerlo düşünüyor...</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        {isPlusMenuOpen ? (
          <View
            className="absolute right-5 z-40 w-40 rounded-3xl border border-slate-200 bg-white p-2 shadow"
            style={{ bottom: insets.bottom + 110 }}
          >
            {[
              { label: "Analiz", icon: "analytics-outline" },
              { label: "Takip", icon: "eye-outline" },
              { label: "Shop", icon: "bag-handle-outline" },
              { label: "Profil", icon: "person-outline" },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setIsPlusMenuOpen(false)}
                className="flex-row items-center rounded-2xl px-3 py-3 active:bg-slate-100"
              >
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color="#334155" />
                <Text className="ml-2 text-sm font-medium text-slate-700">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View
          className="absolute inset-x-0 border-t border-slate-200 bg-white px-4 pt-3"
          style={{ bottom: 0, paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <View className="flex-row items-end rounded-[28px] border border-slate-200 bg-slate-50 px-2 py-2">
            <Pressable
              onPress={() => setIsPlusMenuOpen((prev) => !prev)}
              className="mb-1 h-9 w-9 items-center justify-center rounded-xl bg-white"
            >
              <Ionicons name="add" size={20} color="#334155" />
            </Pressable>

            <View className="mx-2 flex-1 rounded-2xl bg-white px-3 py-1">
              <TextInput
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Bigerlo'ya sor veya ürün analizi iste..."
                placeholderTextColor="#94A3B8"
                multiline
                onContentSizeChange={(event) => {
                  const next = Math.min(120, Math.max(42, event.nativeEvent.contentSize.height));
                  setInputHeight(next);
                }}
                style={{ height: inputHeight, textAlignVertical: "top" }}
                className="text-[15px] leading-6 text-slate-900"
              />
            </View>

            <Pressable
              onPress={() => setIsCameraModalOpen(true)}
              className="mb-1 mr-2 h-9 w-9 items-center justify-center rounded-xl bg-blue-600"
            >
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable className="mb-1 h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Ionicons name="mic-outline" size={18} color="#334155" />
            </Pressable>

            {hasMessage ? (
              <Pressable
                onPress={handleSendMessage}
                className="mb-1 ml-2 h-9 w-9 items-center justify-center rounded-xl bg-blue-600"
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Modal visible={isDrawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <View className="flex-1 flex-row">
          <Pressable onPress={closeDrawer} className="flex-1 bg-black/40" />
          <Animated.View
            style={{ transform: [{ translateX: drawerTranslateX }] }}
            className="h-full w-[300px] border-l border-slate-200 bg-white"
          >
            <SafeAreaView className="flex-1">
              <View className="flex-1 px-4 py-5">
                <Text className="mb-4 text-base font-bold text-slate-900">Geçmiş Sohbetler</Text>
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {fakeHistory.map((item) => (
                      <Pressable
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                        onPress={closeDrawer}
                      >
                        <Text className="text-sm text-slate-700">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Pressable onPress={startNewChat} className="mt-4 rounded-2xl bg-blue-600 px-4 py-3">
                  <Text className="text-center text-sm font-semibold text-white">Yeni Sohbet Başlat</Text>
                </Pressable>

                <View className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <Text className="text-xs uppercase tracking-[1.2px] text-slate-500">Paket</Text>
                  <Text className="mt-1 text-base font-semibold text-slate-900">Bigerlo Premium</Text>
                  <Text className="mt-1 text-sm text-slate-600">Sınırsız analiz • Öncelikli yanıt</Text>
                </View>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={isCameraModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCameraModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className="text-base font-semibold text-white">Kamera Tarama</Text>
            <Pressable
              onPress={() => setIsCameraModalOpen(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-8">
            <View className="h-[330px] w-full max-w-[320px] rounded-[36px] border-2 border-white/50 bg-slate-900/50" />
            <Text className="mt-4 text-center text-sm text-slate-300">Ürünü tarama alanına hizalayın</Text>
          </View>

          <View className="items-center pb-10">
            <Pressable className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20">
              <View className="h-12 w-12 rounded-full bg-white" />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default BigerloHomeV2;
