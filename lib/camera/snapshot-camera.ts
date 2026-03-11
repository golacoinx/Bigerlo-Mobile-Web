import type { RefObject } from "react";
import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

export const DEFAULT_MAX_SNAPSHOTS = 5;

export type Snapshot = {
  id: string;
  uri: string;
  thumbnailUri: string;
  base64: string;
  mimeType: string;
};

export type AnalyzeImage = {
  imageBase64: string;
  mimeType: string;
};

type CaptureSnapshotOptions = {
  cameraRef: RefObject<CameraView | null>;
};

export async function captureSnapshot({
  cameraRef,
}: CaptureSnapshotOptions): Promise<Snapshot | null> {
  if (!cameraRef.current) return null;

  const photo = await cameraRef.current.takePictureAsync({
    quality: 1,
    base64: true,
    skipProcessing: false,
    exif: false,
  });

  if (!photo?.uri) return null;

  const cropSize = Math.min(photo.width, photo.height) * 0.85;
  const originX = (photo.width - cropSize) / 2;
  const originY = (photo.height - cropSize) / 2;

  const targetSize = Math.min(cropSize, 1600);

  const result = await ImageManipulator.manipulateAsync(
    photo.uri,
    [
      { crop: { originX, originY, width: cropSize, height: cropSize } },
      { resize: { width: targetSize, height: targetSize } },
    ],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  const thumbnail = await ImageManipulator.manipulateAsync(
    result.uri,
    [{ resize: { width: 320 } }],
    {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  if (!result.base64) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri: result.uri,
    thumbnailUri: thumbnail.uri,
    base64: result.base64,
    mimeType: "image/jpeg",
  };
}

export async function getBestPictureSize(
  cameraRef: RefObject<CameraView | null>
): Promise<string | undefined> {
  if (!cameraRef.current) return undefined;

  const cameraApi = cameraRef.current as CameraView & {
    getAvailablePictureSizesAsync?: () => Promise<string[]>;
  };

  const availableSizes = await cameraApi.getAvailablePictureSizesAsync?.();
  if (!availableSizes?.length) return undefined;

  const sorted = [...availableSizes]
    .map((size) => {
      const [w, h] = size.split("x").map((v) => Number(v));
      if (!w || !h) {
        return { size, area: 0, ratioDelta: Number.POSITIVE_INFINITY };
      }

      const ratio = w / h;
      return { size, area: w * h, ratioDelta: Math.abs(ratio - 4 / 3) };
    })
    .sort((a, b) => a.ratioDelta - b.ratioDelta || b.area - a.area);

  return sorted[0]?.size;
}

export function snapshotsToAnalyzeImages(snapshots: Snapshot[]): AnalyzeImage[] {
  return snapshots.map((snapshot) => ({
    imageBase64: snapshot.base64,
    mimeType: snapshot.mimeType,
  }));
}
