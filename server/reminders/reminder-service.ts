import type { IDomainStorage } from "../domain-storage";
import { listDueOrUpcomingCheckIns } from "../feedback/feedback-service";
import type { ReminderItem } from "./reminder-types";

export async function listReminders(storage: IDomainStorage, profileId: string): Promise<ReminderItem[]> {
  const checkIns = await listDueOrUpcomingCheckIns(storage, profileId);

  return checkIns
    .map((item) => {
      const isDue = item.status === "due";
      return {
        reminderId: `${item.trackingId}-${item.dayOffset}`,
        trackingId: item.trackingId,
        dayOffset: item.dayOffset,
        productId: item.productId,
        productName: item.productName,
        productBrand: item.productBrand,
        dueAt: item.dueAt,
        status: item.status,
        severity: isDue ? "high" : "medium",
        label: isDue ? "Feedback due" : "Feedback upcoming",
        message: isDue
          ? `${item.productName} için ${item.checkInLabel} geri bildirimi bekleniyor.`
          : `${item.productName} için ${item.checkInLabel} yaklaşıyor.`,
      } as ReminderItem;
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
