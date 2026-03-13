import type { Product, ProductTrackingStatus } from "@shared/domain";
import type { IDomainStorage } from "../domain-storage";
import type { StartTrackingInput, TrackingScheduleItem, TrackingSummary } from "./tracking-types";

const CHECK_IN_DAY_OFFSETS = [4, 7, 14] as const;
const ACTIVE_STATUSES: ProductTrackingStatus[] = ["active", "planned", "paused"];

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export function buildTrackingSchedule(startedAt: Date): TrackingScheduleItem[] {
  return CHECK_IN_DAY_OFFSETS.map((dayOffset) => ({
    dayOffset,
    dueAt: addDays(startedAt, dayOffset),
  }));
}

export async function findOrCreateProductForTracking(
  storage: IDomainStorage,
  input: Required<StartTrackingInput>["product"],
): Promise<Product> {
  const products = await storage.listProducts();
  const normalizedName = input.name.trim().toLowerCase();
  const normalizedBrand = input.brand.trim().toLowerCase();
  const normalizedType = input.type.trim().toLowerCase();

  const existing = products.find(
    (product) =>
      product.name.trim().toLowerCase() === normalizedName &&
      product.brand.trim().toLowerCase() === normalizedBrand &&
      product.type.trim().toLowerCase() === normalizedType,
  );

  if (existing) return existing;

  return storage.createProduct({
    name: input.name,
    brand: input.brand,
    type: input.type,
    ingredients: input.ingredients ?? [],
  });
}

export async function startProductTracking(
  storage: IDomainStorage,
  input: StartTrackingInput,
): Promise<{ tracking: TrackingSummary; alreadyTracked: boolean }> {
  const now = new Date();

  let productId = input.productId;
  if (!productId && input.product) {
    const product = await findOrCreateProductForTracking(storage, input.product);
    productId = product.id;
  }

  if (!productId) {
    throw new Error("productId is required");
  }

  const product = await storage.getProduct(productId);
  if (!product) {
    throw new Error("product not found");
  }

  const existingTrackings = await storage.listProductTrackingsByProfile(input.profileId);
  const existingActive = existingTrackings.find(
    (item) => item.productId === product.id && ACTIVE_STATUSES.includes(item.status),
  );

  if (existingActive) {
    return {
      tracking: toTrackingSummary(existingActive, product),
      alreadyTracked: true,
    };
  }

  const schedule = buildTrackingSchedule(now);
  const created = await storage.createProductTracking({
    profileId: input.profileId,
    productId: product.id,
    status: "active",
    startedAt: now,
    nextCheckInAt: schedule[0]?.dueAt ?? null,
  });

  return {
    tracking: toTrackingSummary(created, product),
    alreadyTracked: false,
  };
}

function toTrackingSummary(
  tracking: Awaited<ReturnType<IDomainStorage["createProductTracking"]>>,
  product: Product,
): TrackingSummary {
  const startedAt = tracking.startedAt ?? tracking.createdAt;

  return {
    trackingId: tracking.id,
    productId: product.id,
    productName: product.name,
    productBrand: product.brand,
    productType: product.type,
    status: tracking.status,
    startedAt,
    nextCheckInAt: tracking.nextCheckInAt,
    checkInSchedule: startedAt ? buildTrackingSchedule(startedAt) : [],
  };
}

export async function listTrackedProducts(
  storage: IDomainStorage,
  profileId: string,
): Promise<TrackingSummary[]> {
  const trackings = await storage.listProductTrackingsByProfile(profileId);
  const sorted = [...trackings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const products = await storage.listProducts();

  return sorted
    .filter((tracking) => ACTIVE_STATUSES.includes(tracking.status))
    .map((tracking) => {
      const product = products.find((item) => item.id === tracking.productId);
      if (!product) return null;
      return toTrackingSummary(tracking, product);
    })
    .filter((item): item is TrackingSummary => Boolean(item));
}
