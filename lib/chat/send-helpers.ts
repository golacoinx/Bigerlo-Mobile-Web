import type { AnalyzeImage, Snapshot } from "@/lib/camera/snapshot-camera";
import { snapshotsToAnalyzeImages } from "@/lib/camera/snapshot-camera";
import type { ChatMessage } from "@/components/chat/MessageItem";

export function getComposedMessageParts(inputText: string, snapshots: Snapshot[]) {
  const trimmedText = inputText.trim();
  const hasText = Boolean(trimmedText);
  const hasImages = snapshots.length > 0;

  return {
    trimmedText,
    hasText,
    hasImages,
    payloadMessage: hasText ? trimmedText : "",
    images: hasImages ? snapshotsToAnalyzeImages(snapshots) : ([] as AnalyzeImage[]),
  };
}

export function createUserMessage(
  id: string,
  text: string,
  snapshots: Snapshot[]
): ChatMessage {
  return {
    id,
    text,
    isUser: true,
    photoUris: snapshots.length > 0 ? snapshots.map((snapshot) => snapshot.thumbnailUri) : undefined,
  };
}

export function createLoadingMessage(id: string): ChatMessage {
  return {
    id,
    text: "Analiz ediliyor…",
    isUser: false,
    isLoading: true,
  };
}
