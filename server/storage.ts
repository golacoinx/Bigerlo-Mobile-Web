import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type AnalysisResult,
  type InsertAnalysisResult,
  type UserProfile,
  type UpsertUserProfile,
  type ProductTracking,
  type InsertProductTracking,
  type ProductFeedback,
  type InsertProductFeedback,
} from "@shared/schema";
import { randomUUID } from "crypto";

function now(): Date {
  return new Date();
}

function safeArray(input: string[] | null | undefined): string[] {
  return Array.isArray(input) ? input : [];
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProduct(id: string): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  getAnalysisResult(id: string): Promise<AnalysisResult | undefined>;
  listAnalysisResultsByProduct(productId: string): Promise<AnalysisResult[]>;
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;

  getUserProfile(id: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: UpsertUserProfile): Promise<UserProfile>;

  getProductTracking(id: string): Promise<ProductTracking | undefined>;
  listProductTrackingsByProfile(profileId: string): Promise<ProductTracking[]>;
  createProductTracking(tracking: InsertProductTracking): Promise<ProductTracking>;
  updateProductTracking(
    id: string,
    patch: Partial<Pick<ProductTracking, "status" | "nextCheckInAt">>
  ): Promise<ProductTracking | undefined>;

  listProductFeedbackByTracking(trackingId: string): Promise<ProductFeedback[]>;
  createProductFeedback(feedback: InsertProductFeedback): Promise<ProductFeedback>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private analysisResults: Map<string, AnalysisResult>;
  private userProfiles: Map<string, UserProfile>;
  private productTrackings: Map<string, ProductTracking>;
  private productFeedbacks: Map<string, ProductFeedback>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.analysisResults = new Map();
    this.userProfiles = new Map();
    this.productTrackings = new Map();
    this.productFeedbacks = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async listProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const createdAt = now();
    const product: Product = {
      id: randomUUID(),
      name: insertProduct.name,
      brand: insertProduct.brand ?? "unknown",
      type: insertProduct.type ?? "unknown",
      ingredients: safeArray(insertProduct.ingredients),
      createdAt,
      updatedAt: createdAt,
    };

    this.products.set(product.id, product);
    return product;
  }

  async getAnalysisResult(id: string): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(id);
  }

  async listAnalysisResultsByProduct(productId: string): Promise<AnalysisResult[]> {
    return Array.from(this.analysisResults.values()).filter(
      (result) => result.productId === productId
    );
  }

  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const analysisResult: AnalysisResult = {
      id: randomUUID(),
      productId: insertResult.productId,
      summary: insertResult.summary,
      risks: safeArray(insertResult.risks),
      suitability: insertResult.suitability ?? "unknown",
      confidence: insertResult.confidence ?? 0,
      source: insertResult.source ?? null,
      createdAt: now(),
    };

    this.analysisResults.set(analysisResult.id, analysisResult);
    return analysisResult;
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(id);
  }

  async upsertUserProfile(profile: UpsertUserProfile): Promise<UserProfile> {
    const profileId = profile.id ?? randomUUID();
    const existing = this.userProfiles.get(profileId);
    const createdAt = existing?.createdAt ?? now();

    const merged: UserProfile = {
      id: profileId,
      skinType: profile.skinType ?? existing?.skinType ?? "unknown",
      hairType: profile.hairType ?? existing?.hairType ?? "unknown",
      sensitivities: profile.sensitivities ?? existing?.sensitivities ?? [],
      avoidIngredients: profile.avoidIngredients ?? existing?.avoidIngredients ?? [],
      knownReactions: profile.knownReactions ?? existing?.knownReactions ?? [],
      createdAt,
      updatedAt: now(),
    };

    this.userProfiles.set(profileId, merged);
    return merged;
  }

  async getProductTracking(id: string): Promise<ProductTracking | undefined> {
    return this.productTrackings.get(id);
  }

  async listProductTrackingsByProfile(profileId: string): Promise<ProductTracking[]> {
    return Array.from(this.productTrackings.values()).filter(
      (tracking) => tracking.profileId === profileId
    );
  }

  async createProductTracking(
    insertTracking: InsertProductTracking
  ): Promise<ProductTracking> {
    const createdAt = now();

    const tracking: ProductTracking = {
      id: randomUUID(),
      profileId: insertTracking.profileId,
      productId: insertTracking.productId,
      status: insertTracking.status ?? "active",
      startedAt: insertTracking.startedAt ?? createdAt,
      nextCheckInAt: insertTracking.nextCheckInAt ?? null,
      createdAt,
      updatedAt: createdAt,
    };

    this.productTrackings.set(tracking.id, tracking);
    return tracking;
  }

  async updateProductTracking(
    id: string,
    patch: Partial<Pick<ProductTracking, "status" | "nextCheckInAt">>
  ): Promise<ProductTracking | undefined> {
    const current = this.productTrackings.get(id);
    if (!current) return undefined;

    const updated: ProductTracking = {
      ...current,
      status: patch.status ?? current.status,
      nextCheckInAt:
        patch.nextCheckInAt === undefined ? current.nextCheckInAt : patch.nextCheckInAt,
      updatedAt: now(),
    };

    this.productTrackings.set(id, updated);
    return updated;
  }

  async listProductFeedbackByTracking(trackingId: string): Promise<ProductFeedback[]> {
    return Array.from(this.productFeedbacks.values()).filter(
      (feedback) => feedback.trackingId === trackingId
    );
  }

  async createProductFeedback(
    insertFeedback: InsertProductFeedback
  ): Promise<ProductFeedback> {
    const feedback: ProductFeedback = {
      id: randomUUID(),
      trackingId: insertFeedback.trackingId,
      submittedAt: insertFeedback.submittedAt ?? now(),
      itch: insertFeedback.itch ?? null,
      dryness: insertFeedback.dryness ?? null,
      reaction: insertFeedback.reaction ?? null,
      relief: insertFeedback.relief ?? null,
      satisfaction: insertFeedback.satisfaction ?? null,
      note: insertFeedback.note ?? null,
    };

    this.productFeedbacks.set(feedback.id, feedback);
    return feedback;
  }
}

export const storage = new MemStorage();
