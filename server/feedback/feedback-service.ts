import type { IDomainStorage } from "../domain-storage";
import { buildTrackingSchedule } from "../tracking/tracking-service";
import type { CheckInItem, CheckInStatus, SubmitCheckInInput } from "./feedback-types";

const UPCOMING_WINDOW_MS = 1000 * 60 * 60 * 72;

function toLabel(dayOffset: number) {
  return `Day ${dayOffset}`;
}

function getPendingCheckInsForTracking(args: {
  startedAt: Date;
  submittedOffsets: Set<number>;
  now: Date;
}) {
  const { startedAt, submittedOffsets, now } = args;
  const schedule = buildTrackingSchedule(startedAt);

  return schedule
    .filter((item) => !submittedOffsets.has(item.dayOffset))
    .map((item) => {
      const status: CheckInStatus | null =
        item.dueAt.getTime() <= now.getTime()
          ? "due"
          : item.dueAt.getTime() - now.getTime() <= UPCOMING_WINDOW_MS
            ? "upcoming"
            : null;

      return status
        ? {
            ...item,
            status,
            checkInLabel: toLabel(item.dayOffset),
          }
        : null;
    })
    .filter((item): item is { dayOffset: number; dueAt: Date; status: CheckInStatus; checkInLabel: string } => Boolean(item));
}

export async function listDueOrUpcomingCheckIns(
  storage: IDomainStorage,
  profileId: string,
): Promise<CheckInItem[]> {
  const now = new Date();
  const trackings = await storage.listProductTrackingsByProfile(profileId);
  const products = await storage.listProducts();

  const items: CheckInItem[] = [];

  for (const tracking of trackings) {
    if (tracking.status !== "active" && tracking.status !== "planned" && tracking.status !== "paused") {
      continue;
    }

    const product = products.find((item) => item.id === tracking.productId);
    if (!product) continue;

    const feedbacks = await storage.listFeedbackByTracking(tracking.id);
    const submittedOffsets = new Set(
      feedbacks.map((feedback) => feedback.checkInDayOffset).filter((v): v is number => typeof v === "number"),
    );

    const startedAt = tracking.startedAt ?? tracking.createdAt;
    const pending = getPendingCheckInsForTracking({ startedAt, submittedOffsets, now });

    for (const checkIn of pending) {
      items.push({
        trackingId: tracking.id,
        productId: product.id,
        productName: product.name,
        productBrand: product.brand,
        dueAt: checkIn.dueAt,
        dayOffset: checkIn.dayOffset,
        checkInLabel: checkIn.checkInLabel,
        status: checkIn.status,
      });
    }
  }

  return items.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export async function submitCheckInFeedback(
  storage: IDomainStorage,
  input: SubmitCheckInInput,
) {
  const trackings = await storage.listProductTrackingsByProfile(input.profileId);
  const tracking = trackings.find((item) => item.id === input.trackingId);

  if (!tracking) {
    throw new Error("tracking not found");
  }

  const startedAt = tracking.startedAt ?? tracking.createdAt;
  const schedule = buildTrackingSchedule(startedAt);
  const target = schedule.find((item) => item.dayOffset === input.dayOffset);

  if (!target) {
    throw new Error("invalid check-in checkpoint");
  }

  const existingFeedback = await storage.listFeedbackByTracking(tracking.id);
  const duplicate = existingFeedback.find((item) => item.checkInDayOffset === input.dayOffset);
  if (duplicate) {
    throw new Error("check-in already submitted");
  }

  const submittedAt = new Date();
  const feedback = await storage.createProductFeedback({
    trackingId: tracking.id,
    checkInDayOffset: input.dayOffset,
    submittedAt,
    itch: input.itch,
    dryness: input.dryness,
    reaction: input.reaction,
    relief: input.relief,
    satisfaction: input.satisfaction,
    note: input.note,
  });

  const submittedOffsets = new Set(
    [...existingFeedback, feedback]
      .map((item) => item.checkInDayOffset)
      .filter((v): v is number => typeof v === "number"),
  );

  const pending = schedule.filter((item) => !submittedOffsets.has(item.dayOffset));
  const next = pending[0];

  await storage.updateProductTracking(tracking.id, {
    nextCheckInAt: next?.dueAt ?? null,
    status: next ? tracking.status : "completed",
  });

  return {
    feedback,
    nextCheckInAt: next?.dueAt ?? null,
    completed: !next,
  };
}
