export type ReminderSeverity = "high" | "medium";

export type ReminderItem = {
  reminderId: string;
  trackingId: string;
  dayOffset: number;
  productId: string;
  productName: string;
  productBrand: string;
  dueAt: Date;
  status: "due" | "upcoming";
  severity: ReminderSeverity;
  label: string;
  message: string;
};
