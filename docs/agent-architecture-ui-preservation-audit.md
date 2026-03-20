# Agent Mimarisi Entegrasyonu Ön Analizi (UI Koruma Odaklı)

Bu doküman, mevcut branch üzerinde **UI/UX’i birebir koruyarak** agent mimarisi eklemek için minimum-risk bir zemin çıkarmak amacıyla hazırlanmıştır.

## 1) Current UI base summary

- Ana ekran tekil olarak `app/(tabs)/index.tsx` içinde yönetiliyor; header, analiz sekmeleri, mesaj listesi, snapshot şeridi, composer ve tam ekran kamera modal akışı burada bir arada.  
- UI akışı iki moda ayrılmış:
  - `chatMode=false`: BIGERLO başlıklı home-header görünümü.
  - `chatMode=true`: yeni sohbet butonlu chat-header görünümü.
- Mesajlar `FlatList` ile render ediliyor; `activeAnalysisTab !== "Analiz"` olduğunda placeholder tab container gösteriliyor.
- Composer + kamera + galeri + gönderme davranışı şu anda ekran state’leriyle (`useState`) doğrudan yönetiliyor.
- Kamera deneyimi modal içinde ayrı bir `CameraFullScreen` renderı ile korunuyor; alt panel `CameraBottomPanel` bileşeni.
- Renk sistemi merkezi `constants/colors.ts` dosyasında; mevcut görünümün tutarlılığı bu paletteye bağlı.

## 2) Critical UI files to preserve

Aşağıdaki dosyalar görsel düzenin temelini oluşturuyor; burada yapılacak değişiklikler pixel-level sapma riski taşır:

- `app/(tabs)/index.tsx`
  - Header, analysis tabs, message area, composer slot, modal kamera hiyerarşisi ve spacing.
- `components/chat/Composer.tsx`
  - Alt input bar, + menü, kamera ikonu, text input, send/mic davranışı.
- `components/chat/CameraBottomPanel.tsx`
  - Kamera ekranı alt paneli, capture butonu ve gallery/send düzeni.
- `components/chat/MessageItem.tsx`
  - Kullanıcı/asistan balonları, medya gösterimi, analysis result card entegrasyonu.
- `components/chat/SnapshotStrip.tsx`
  - Fotoğraf küçük önizleme şeridi spacing ve thumb ölçüleri.
- `constants/colors.ts`
  - Uygulama genel tema renkleri.

## 3) Safe files to extend

Agent mimarisini minimum invasive şekilde eklemek için öncelikli güvenli genişleme noktaları:

- `lib/chat/` altında yeni dosyalar
  - Örnek: `chat-agent-service.ts`, `chat-agent-state.ts`, `chat-agent-mappers.ts`
  - Mevcut `send-helpers.ts` korunur; sadece gerekiyorsa küçük yardımcı fonksiyon ekleri.
- `lib/` altında domain/service katmanı
  - Örnek: `lib/chat/session-store.ts`, `lib/chat/agent-types.ts`
- `server/` tarafında yeni route/service (varsa gereksinime göre)
  - UI dosyalarına dokunmadan backend davranışı ayrıştırılabilir.

Prensip: önce yeni katmanı ekle, sonra `index.tsx` içinde sadece wiring/refactor yap; JSX ve style bloklarını değiştirme.

## 4) Risky files to avoid touching

Aşağıdaki dosyalarda büyük değişiklikler, “eski sade chat layout”a düşme veya görünüm bozulması riskini artırır:

- `app/(tabs)/index.tsx` içindeki JSX hiyerarşisi ve style objeleri
- `components/chat/Composer.tsx` style ve input düzeni
- `components/chat/CameraBottomPanel.tsx` capture/input hizaları
- `components/chat/MessageItem.tsx` balon maxWidth, paddings, media ölçüleri
- `constants/colors.ts` palet değerleri

Özellikle kaçınılması gerekenler:
- Flex hiyerarşisini sadeleştirme/refactor etme
- Padding/margin/radius değerlerini değiştirme
- Placeholder metinlerini veya tab fallback davranışını branch’in mevcut mantığından farklılaştırma

## 5) Faz 1 için minimum-risk implementation plan

1. **Domain kontratını çıkar (UI’dan bağımsız):**
   - Chat turn input/output tiplerini ve agent response modelini `lib/chat/agent-types.ts` altında tanımla.
2. **Service katmanı ekle:**
   - Mevcut `analyzeWithGemini` çağrısını taşıyan `lib/chat/chat-agent-service.ts` yaz.
   - Ağ çağrısı, hata mapleme ve structured response parsing burada olsun.
3. **State orchestration katmanı ekle:**
   - `lib/chat/chat-agent-state.ts` (veya `useChatAgent.ts`) ile:
     - mesaj ekleme,
     - loading mesajı,
     - stream efektinin state güncellemeleri,
     - send/reset akışı yönetilsin.
4. **Ekrana minimum wiring uygula:**
   - `app/(tabs)/index.tsx` içinde yalnızca event handler’ları yeni katmana bağla.
   - JSX sırası, component ağacı, style objeleri ve placeholder metinleri korunur.
5. **UI parity kontrolü:**
   - Header/tab/composer/camera alanı/snapshot strip’in görsel olarak aynı kaldığını doğrula.
6. **Regression checklist:**
   - `chatMode` geçişleri,
   - kamera modal aç/kapa,
   - gallery + capture limitleri,
   - `Analiz` dışı tab placeholder davranışı,
   - send disabled/loading durumları.

---

## Önerilen guardrail’ler (uygulama sırasında)

- `index.tsx` style bölümüne dokunma (yalnızca fonksiyon wiring değişikliği).
- Yeni mimari katmanı eklendikten sonra tek committe büyük refactor yapma; küçük ve geri alınabilir adımlar kullan.
- UI metinleri/placeholder’lar için snapshot referans listesi oluştur ve değişmediğini doğrula.
