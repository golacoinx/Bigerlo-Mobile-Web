import type { AnalyzeApiResponse, StructuredAnalysis } from "@/lib/chat/analysis-types";
import type { AnalyzeImage } from "@/lib/camera/snapshot-camera";
import {
  buildAssistantAnalysisMessage,
  extractAnalysisResult,
} from "@/lib/agents/analysis-agent";
import { buildComparisonResult } from "@/lib/agents/comparison-agent";
import { classifyUserInput, type InputIntent } from "@/lib/agents/input-classifier";
import { buildRiskResultFromAnalyzeResponse } from "@/lib/agents/risk-agent";
import { sanitizeAssistantText } from "@/lib/agents/response-sanitizer";
import { getApiUrl } from "@/lib/query-client";
import { mapAnalyzeResponseToAnalyzedProduct } from "@/lib/session/analysis-session-mappers";
import type {
  AnalyzedProduct,
  ComparisonResult,
} from "@/lib/session/analysis-session-types";

export type UserInputPayload = {
  id: string;
  type: "text" | "image" | "text+image";
  text?: string;
  imageUri?: string;
  createdAt: string;
};

export type OrchestratorMode = InputIntent;

export type OrchestratorAnalyzeResult = {
  mode: OrchestratorMode;
  assistantMessageText: string;
  structuredResult?: StructuredAnalysis;
  analyzedProduct?: AnalyzedProduct;
  comparison: ComparisonResult | null;
};

async function requestAnalyze(message: string, images: AnalyzeImage[]): Promise<AnalyzeApiResponse> {
  const url = new URL("/api/analyze", getApiUrl()).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, images }),
  });

  const data = (await response.json()) as AnalyzeApiResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "İstek başarısız oldu.");
  }

  return data;
}

async function requestGeneralKnowledge(message: string): Promise<string> {
  const url = new URL("/api/chat", getApiUrl()).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = (await response.json()) as { text?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Yanıt alınamadı.");
  }

  return sanitizeAssistantText(data.text);
}

function isLikelyFollowUpQuestion(text?: string): boolean {
  const normalized = text?.trim().toLowerCase() ?? "";
  if (!normalized) return false;

  const short = normalized.split(/\s+/).length <= 8;
  const cues = [
    "peki",
    "buna",
    "bunda",
    "alkol var mı",
    "hassas ciltte",
    "alternatif",
    "kullanabilir miyim",
    "hamilelikte",
    "komedojenik mi",
  ];

  return short && cues.some((cue) => normalized.includes(cue));
}

function buildFollowUpAnalysisPrompt(args: {
  userQuestion: string;
  activeAnalyzedProduct: AnalyzedProduct;
  lastAssistantText?: string;
}): string {
  const { userQuestion, activeAnalyzedProduct, lastAssistantText } = args;
  const name = activeAnalyzedProduct.productDetection?.productName || "önceki ürün";
  const brand = activeAnalyzedProduct.productDetection?.brand || "";
  const summary = activeAnalyzedProduct.analysis?.summary || lastAssistantText || "";

  return [
    `Takip sorusu aynı ürün içindir: ${name}${brand ? ` (${brand})` : ""}.`,
    summary ? `Önceki kısa değerlendirme: ${summary}` : "",
    `Yeni soru: ${userQuestion}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function orchestrateInitialAnalysis(args: {
  userInput: UserInputPayload;
  payloadMessage: string;
  images: AnalyzeImage[];
  existingAnalyzedProducts: AnalyzedProduct[];
  activeAnalyzedProduct?: AnalyzedProduct;
  lastAssistantText?: string;
}): Promise<OrchestratorAnalyzeResult> {
  const {
    userInput,
    payloadMessage,
    images,
    existingAnalyzedProducts,
    activeAnalyzedProduct,
    lastAssistantText,
  } = args;

  const mode = classifyUserInput(userInput);

  if (mode === "general-chat") {
    return {
      mode,
      assistantMessageText: "Merhaba! Size nasıl yardımcı olabilirim?",
      structuredResult: undefined,
      comparison: null,
    };
  }

  if (mode === "general-knowledge") {
    if (activeAnalyzedProduct && isLikelyFollowUpQuestion(userInput.text)) {
      const response = await requestAnalyze(
        buildFollowUpAnalysisPrompt({
          userQuestion: userInput.text?.trim() || payloadMessage,
          activeAnalyzedProduct,
          lastAssistantText,
        }),
        []
      );

      const analysisResult = extractAnalysisResult({
        responseText: response.text,
        structured: response.structured,
      });

      const riskResult = buildRiskResultFromAnalyzeResponse({
        response,
        analysisResult,
      });

      const analyzedProduct = mapAnalyzeResponseToAnalyzedProduct({
        response,
        sourceInputId: userInput.id,
        createdAt: userInput.createdAt,
        analysisOverride: analysisResult,
        riskOverride: riskResult,
      });

      const comparison = buildComparisonResult([
        ...existingAnalyzedProducts,
        analyzedProduct,
      ]);

      return {
        mode: "product-analysis",
        assistantMessageText: buildAssistantAnalysisMessage({ response, analysisResult }),
        structuredResult: response.structured,
        analyzedProduct,
        comparison,
      };
    }

    const text = await requestGeneralKnowledge(userInput.text?.trim() || payloadMessage);
    return {
      mode,
      assistantMessageText: text,
      structuredResult: undefined,
      comparison: null,
    };
  }

  if (mode === "unclear") {
    return {
      mode,
      assistantMessageText: "Sorunuzu biraz daha netleştirebilir misiniz?",
      structuredResult: undefined,
      comparison: null,
    };
  }

  const analyzeMessage =
    activeAnalyzedProduct && isLikelyFollowUpQuestion(userInput.text)
      ? buildFollowUpAnalysisPrompt({
          userQuestion: userInput.text?.trim() || payloadMessage,
          activeAnalyzedProduct,
          lastAssistantText,
        })
      : payloadMessage;

  const response = await requestAnalyze(analyzeMessage, images);

  const analysisResult = extractAnalysisResult({
    responseText: response.text,
    structured: response.structured,
  });

  const riskResult = buildRiskResultFromAnalyzeResponse({
    response,
    analysisResult,
  });

  const analyzedProduct = mapAnalyzeResponseToAnalyzedProduct({
    response,
    sourceInputId: userInput.id,
    createdAt: userInput.createdAt,
    analysisOverride: analysisResult,
    riskOverride: riskResult,
  });

  const comparison = buildComparisonResult([
    ...existingAnalyzedProducts,
    analyzedProduct,
  ]);

  const assistantMessageText =
    (typeof response.text === "string" && response.text.trim()
      ? sanitizeAssistantText(response.text)
      : "") ||
    buildAssistantAnalysisMessage({
      response,
      analysisResult,
    });

  return {
    mode,
    assistantMessageText,
    structuredResult: response.structured,
    analyzedProduct,
    comparison,
  };
}
