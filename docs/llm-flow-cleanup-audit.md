# LLM/Input/Orchestrator/Session/UI Flow Cleanup Audit

Bu doküman, mevcut kod tabanında katmanlı patch sonrası oluşan olası çakışmaları görmek ve bir sonraki düzeltme turundan **önce** akışı netleştirmek için hazırlanmıştır.

## 1) End-to-end flow map (runtime)

1. Kullanıcı input’u `app/(tabs)/index.tsx` içinde `handleSend` ile alınır.
2. `getComposedMessageParts` ile metin/görsel payload hazırlanır.
3. UI, `/api/analyze` çağrısını `analyzeWithGemini` ile yapar.
4. API dönüşü `orchestrateInitialAnalysis` fonksiyonuna verilir:
   - `classifyUserInput` ile intent belirlenir (`general-chat`, `general-knowledge`, `product-analysis`, `unclear`).
   - `general-chat` / `general-knowledge`: yalnızca metin cevabı döner, ürün/session güncellemesi yok.
   - `product-analysis`: analysis-agent + risk-agent + mapper + comparison-agent zinciri çalışır.
   - `unclear`: kısa netleştirme mesajı döner.
5. `index.tsx` orchestrator sonucuna göre:
   - sadece `mode === "product-analysis"` ise session state’e `appendAnalyzedProductAsActive` + `setComparison` uygular,
   - ardından `streamAssistantText` ile assistant mesajını stream eder,
   - structured result yalnızca `product-analysis` ve `shouldAttachStructuredResult` true ise attach eder.
6. `MessageItem` renderında:
   - text bubble her zaman `safeText` üzerinden render edilir,
   - structured kartı (`AnalysisResultCard`) yalnızca `item.structuredResult` ve `hasUsefulStructuredData` true ise görünür.
7. Risk/Karşılaştırma tabları `analysisSessionState` üzerinden beslenir (chat message’dan türetilmez).

## 2) File/function inventory

### UI flow
- `app/(tabs)/index.tsx`
  - `analyzeWithGemini`
  - `handleSend`
  - `streamAssistantText`
  - tab render blokları (`Analiz`, `Karşılaştırma`, `Risk`)

- `components/chat/MessageItem.tsx`
  - `MessageItem`
  - `hasUsefulStructuredData` guard
  - `safeText` coercion

- `lib/chat/send-helpers.ts`
  - `getComposedMessageParts`
  - `createUserMessage`
  - `createLoadingMessage`

### Agent/orchestration
- `lib/agents/input-classifier.ts`
  - `classifyUserInput`
  - `isLikelyProductAnalysisRequest`
  - `hasUsableProductSignal`
  - `isGeneralKnowledge`
  - `isGeneralConversation`

- `lib/agents/orchestrator.ts`
  - `orchestrateInitialAnalysis`
  - `hasMeaningfulAnalyzedProduct`

- `lib/agents/analysis-agent.ts`
  - `extractAnalysisResult`
  - `buildAssistantAnalysisMessage`

- `lib/agents/risk-agent.ts`
  - `normalizeRiskList`
  - `extractRiskResult`
  - `buildRiskResultFromAnalyzeResponse`

- `lib/agents/comparison-agent.ts`
  - `selectComparisonCandidates`
  - `decideWinnerByCategory`
  - `buildComparisonSummary`
  - `buildComparisonResult`

- `lib/agents/response-sanitizer.ts`
  - `sanitizeAssistantText`

### Session/domain
- `lib/session/analysis-session-mappers.ts`
  - `mapAnalyzeResponseToAnalyzedProduct`

- `lib/session/analysis-session-store.ts`
  - `createInitialAnalysisSessionState`
  - `appendAnalyzedProductAsActive`
  - `setComparison`
  - (legacy) `addAnalyzedProduct`, `setActiveProductId`

- `lib/session/analysis-session-types.ts`
  - `AnalysisSessionState`, `AnalyzedProduct`, `RiskResult`, `ComparisonResult`, vb.

## 3) Conflict detection findings

### A) Overlapping/duplicated decision paths
1. **Product anlamlılık kararı iki yerde etkili:**
   - `input-classifier` product sinyali veriyor,
   - orchestrator içinde ayrıca `hasMeaningfulAnalyzedProduct` ile ikinci bir gate var.
   - Bu çift-gate, bazı edge case’lerde intent product-analysis olsa bile sonradan `unclear`a düşürebilir.

2. **Structured card gate iki seviyede:**
   - `index.tsx` attach koşulu,
   - `MessageItem` içinde `hasUsefulStructuredData` koşulu.
   - Bu tasarım güvenli ama debug sırasında “niye kart çıkmadı?” sorusunu zorlaştırıyor (ikili filtre).

### B) Legacy/unused helper paths
1. `analysis-session-store.ts` içinde `addAnalyzedProduct` ve `setActiveProductId` artık aktif akışta kullanılmıyor; `appendAnalyzedProductAsActive` bunları kapsıyor.
2. `orchestrator` sonucu `rawResponse` döndürüyor; şu an yalnızca structured attach için kullanılıyor. Daha dar bir payload (örn. `structuredResult`) daha net olabilir.

### C) Inconsistent routing semantics risk
1. `general-knowledge` mode’da assistant text kaynağı `response.text` sanitizasyonuna bağlı.
   - backend bazen boş/standart yanıt dönerse, kullanıcı beklentisiyle çelişebilir.
2. `unclear` için iki farklı tetik yolu var:
   - classifier doğrudan unclear,
   - product-analysis içinde `hasMeaningfulAnalyzedProduct` fail sonrası unclear.
   - kullanıcıya benzer mesaj dönse de telemetry/debug açısından farklı kökenler var.

### D) Potential dead/near-dead code
- `analysis-session-store.ts` içindeki bazı helper’lar (özellikle `addAnalyzedProduct`, `setActiveProductId`) mevcut UI akışında kullanılmadığı için near-dead sayılabilir.

## 4) Runtime risk points (highest)

1. **Assistant text source risk**
   - Genel modlarda mesaj tamamen `response.text` sanitizasyonuna bağlı.
   - API boş/geçersiz metin dönerse generic fallback görülecek; bu davranış doğru olsa da UX tutarsızlık riski var.

2. **Double gating in product path**
   - classifier product-analysis dese bile orchestrator’ın `hasMeaningfulAnalyzedProduct` gate’i session update’i kesebilir.
   - Bu, “analiz geldi ama kart/session yok” hissine yol açabilir.

3. **Structured attach coupling**
   - Structured attach kararı UI’da (`index.tsx`) orchestrator output + rawResponse üzerinden veriliyor.
   - Bu kararın tamamen orchestrator’da tek primitive flag/payload ile verilmesi bakım maliyetini düşürür.

4. **Comparison update coupling**
   - Comparison yalnızca product-analysis update anında tazeleniyor.
   - Mode geçişleri veya edge-case unclear dönüşlerinde comparison’ın stale kalması teorik olarak mümkün.

## 5) Cleanup plan (priority order)

### P0 (önce mutlaka)
1. **Intent-to-action contract’ı tekleştir**
   - Orchestrator output’u daha kesin hale getir (`nextSessionPatch` gibi tek karar nesnesi).
   - UI’da mode temelli branch sayısını azalt.

2. **General-knowledge path’te deterministic message policy**
   - API boş/JSON-safe fallback’e düşme davranışını tek policy’de netleştir.

### P1 (hemen sonra)
3. **Store helper cleanup**
   - Kullanılmayan helper’ları kaldır veya deprecated notu koy (`addAnalyzedProduct`, `setActiveProductId`).

4. **Structured attach responsibility consolidation**
   - `rawResponse` taşımak yerine orchestrator’dan direkt `structuredResult?: StructuredAnalysis` dön.
   - UI sadece onu stream’e verir.

### P2 (stabilizasyondan sonra)
5. **Gate simplification**
   - `input-classifier` ve `hasMeaningfulAnalyzedProduct` görev sınırlarını net ayır;
   - product gate’in tek bir authoritative noktası olsun.

6. **Comparison freshness guard**
   - comparison state’in ne zaman resetleneceği/korunacağı policy’sini tek yerde tanımla.

## 6) Recommended first cleanup pass (small/safe)

1. Orchestrator return shape’i sadeleştir (`assistantMessageText`, `structuredResult`, `sessionUpdatePolicy`).
2. `index.tsx` içinde mode + structured attach branching’i tek helper’a indir.
3. Store’daki kullanılmayan helper’ları kaldır.
4. Regression smoke:
   - general-chat: kart yok, session update yok
   - general-knowledge: kart yok, session update yok
   - image/product-analysis: kart + session + risk/comparison akışı

---

## Sonuç

Yeni feature eklemeden önce cleanup yapılması **önerilir**.
Mevcut yapı çalışabilir durumda olsa da, çok noktada karar verilmesi (classifier + orchestrator gate + UI attach gate + render gate) sonraki bug-fix’leri pahalı ve kırılgan hale getiriyor.
