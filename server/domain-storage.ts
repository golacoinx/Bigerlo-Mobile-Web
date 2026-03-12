import { randomUUID } from "crypto";
import type {
  AnalysisResult,
  CreateAnalysisResultInput,
  CreateProductFeedbackInput,
  CreateProductInput,
  CreateProductTrackingInput,
  CreateUserProfileInput,
  Product,
  ProductFeedback,
  ProductTracking,
  UserProfile,
} from "@shared/domain";

export interface IDomainStorage {
  createProduct(input: CreateProductInput): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;

  createAnalysisResult(input: CreateAnalysisResultInput): Promise<AnalysisResult>;
  listAnalysisResultsByProduct(productId: string): Promise<AnalysisResult[]>;

  createUserProfile(input: CreateUserProfileInput): Promise<UserProfile>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  updateUserProfile(
    id: string,
    patch: Partial<Omit<UserProfile, "id" | "createdAt">>,
  ): Promise<UserProfile | undefined>;

  createProductTracking(input: CreateProductTrackingInput): Promise<ProductTracking>;
  listProductTrackingsByProfile(profileId: string): Promise<ProductTracking[]>;
  updateProductTracking(
    id: string,
    patch: Partial<Omit<ProductTracking, "id" | "createdAt">>,
  ): Promise<ProductTracking | undefined>;

  createProductFeedback(input: CreateProductFeedbackInput): Promise<ProductFeedback>;
  listFeedbackByTracking(trackingId: string): Promise<ProductFeedback[]>;
}

export class MemDomainStorage implements IDomainStorage {
  private products = new Map<string, Product>();
  private analysisResults = new Map<string, AnalysisResult>();
  private userProfiles = new Map<string, UserProfile>();
  private productTrackings = new Map<string, ProductTracking>();
  private productFeedback = new Map<string, ProductFeedback>();

  async createProduct(input: CreateProductInput): Promise<Product> {
    const now = new Date();
    const product: Product = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.products.set(product.id, product);
    return product;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async listProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createAnalysisResult(input: CreateAnalysisResultInput): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      id: randomUUID(),
      createdAt: new Date(),
      ...input,
    };
    this.analysisResults.set(result.id, result);
    return result;
  }

  async listAnalysisResultsByProduct(productId: string): Promise<AnalysisResult[]> {
    return Array.from(this.analysisResults.values()).filter(
      (result) => result.productId === productId,
    );
  }

  async createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const now = new Date();
    const profile: UserProfile = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.userProfiles.set(profile.id, profile);
    return profile;
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(id);
  }

  async updateUserProfile(
    id: string,
    patch: Partial<Omit<UserProfile, "id" | "createdAt">>,
  ): Promise<UserProfile | undefined> {
    const current = this.userProfiles.get(id);
    if (!current) return undefined;

    const updated: UserProfile = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    this.userProfiles.set(id, updated);
    return updated;
  }

  async createProductTracking(input: CreateProductTrackingInput): Promise<ProductTracking> {
    const now = new Date();
    const tracking: ProductTracking = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.productTrackings.set(tracking.id, tracking);
    return tracking;
  }

  async listProductTrackingsByProfile(profileId: string): Promise<ProductTracking[]> {
    return Array.from(this.productTrackings.values()).filter(
      (tracking) => tracking.profileId === profileId,
    );
  }

  async updateProductTracking(
    id: string,
    patch: Partial<Omit<ProductTracking, "id" | "createdAt">>,
  ): Promise<ProductTracking | undefined> {
    const current = this.productTrackings.get(id);
    if (!current) return undefined;

    const updated: ProductTracking = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    this.productTrackings.set(id, updated);
    return updated;
  }

  async createProductFeedback(input: CreateProductFeedbackInput): Promise<ProductFeedback> {
    const feedback: ProductFeedback = {
      id: randomUUID(),
      ...input,
    };
    this.productFeedback.set(feedback.id, feedback);
    return feedback;
  }

  async listFeedbackByTracking(trackingId: string): Promise<ProductFeedback[]> {
    return Array.from(this.productFeedback.values()).filter(
      (feedback) => feedback.trackingId === trackingId,
    );
  }
}
