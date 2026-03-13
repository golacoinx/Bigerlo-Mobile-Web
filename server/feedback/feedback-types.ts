export type CheckInStatus = "due" | "upcoming";

export type CheckInItem = {
  trackingId: string;
  productId: string;
  productName: string;
  productBrand: string;
  dueAt: Date;
  dayOffset: number;
  checkInLabel: string;
  status: CheckInStatus;
};

export type SubmitCheckInInput = {
  profileId: string;
  trackingId: string;
  dayOffset: number;
  itch: number | null;
  dryness: number | null;
  reaction: number | null;
  relief: number | null;
  satisfaction: number | null;
  note?: string;
};
