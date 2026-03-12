import type { RefObject } from "react";
import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

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


type PickSnapshotsFromLibraryResult = {
  snapshots: Snapshot[];
  cancelled: boolean;
  permissionDenied: boolean;
  failedCount: number;
};

async function ensureBase64FromUri(uri: string): Promise<{ uri: string; base64: string | undefined }> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  return { uri: result.uri, base64: result.base64 };
}

function getGalleryResizeAction(width?: number, height?: number) {
  if (!width || !height) return null;

  const maxDimension = Math.max(width, height);
  if (maxDimension <= 1800) return null;

  if (width >= height) {
    return { resize: { width: 1800 } };
  }

  return { resize: { height: 1800 } };
}

async function pickerAssetToSnapshot(asset: ImagePicker.ImagePickerAsset): Promise<Snapshot | null> {
  const actions: ImageManipulator.Action[] = [];
  const resizeAction = getGalleryResizeAction(asset.width, asset.height);
  if (resizeAction) {
    actions.push(resizeAction);
  }

  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    actions,
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  let base64 = processed.base64;
  let analysisUri = processed.uri;

  if (!base64) {
    const fallback = await ensureBase64FromUri(processed.uri);
    analysisUri = fallback.uri;
    base64 = fallback.base64;
  }

  if (!base64) {
    return null;
  }

  const thumbnail = await ImageManipulator.manipulateAsync(
    analysisUri,
    [{ resize: { width: 320 } }],
    {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri: analysisUri,
    thumbnailUri: thumbnail.uri,
    base64,
    mimeType: asset.mimeType || "image/jpeg",
  };
}

export async function pickSnapshotsFromLibrary(
  remainingSlots: number
): Promise<PickSnapshotsFromLibraryResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return {
      snapshots: [],
      cancelled: false,
      permissionDenied: true,
      failedCount: 0,
    };
  }

  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    allowsMultipleSelection: true,
    quality: 1,
    base64: true,
    selectionLimit: Math.max(1, remainingSlots),
    exif: false,
  });

  if (pickerResult.canceled) {
    return {
      snapshots: [],
      cancelled: true,
      permissionDenied: false,
      failedCount: 0,
    };
  }

  const limitedAssets = pickerResult.assets.slice(0, remainingSlots);

  const snapshots: Snapshot[] = [];
  let failedCount = 0;

  for (const asset of limitedAssets) {
    try {
      const snapshot = await pickerAssetToSnapshot(asset);
      if (!snapshot) {
        failedCount += 1;
        continue;
      }
      snapshots.push(snapshot);
    } catch {
      failedCount += 1;
    }
  }

  return {
    snapshots,
    cancelled: false,
    permissionDenied: false,
    failedCount,
  };
}
