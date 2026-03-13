import type { ProductTrackingStatus, Product } from "@shared/domain";

export type TrackingScheduleItem = {
  dayOffset: number;
  dueAt: Date;
};

export type TrackingSummary = {
  trackingId: string;
  productId: string;
  productName: string;
  productBrand: string;
  productType: string;
  status: ProductTrackingStatus;
  startedAt: Date | null;
  nextCheckInAt: Date | null;
  checkInSchedule: TrackingScheduleItem[];
};

export type StartTrackingInput = {
  profileId: string;
  productId?: string;
  product?: {
    name: string;
    brand: string;
    type: Product["type"];
    ingredients?: string[];
  };
};
