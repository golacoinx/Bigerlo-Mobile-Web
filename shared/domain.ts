import { z } from "zod";

export const productTypeSchema = z.enum([
  "cleanser",
  "serum",
  "moisturizer",
  "sunscreen",
  "treatment",
  "hair-care",
  "cleaning",
  "other",
]);

export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  brand: z.string().min(1),
  type: productTypeSchema,
  ingredients: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const analysisSuitabilitySchema = z.enum([
  "good",
  "caution",
  "avoid",
  "unknown",
]);

export const analysisResultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  summary: z.string().min(1),
  risks: z.array(z.string()).default([]),
  suitability: analysisSuitabilitySchema,
  confidence: z.number().min(0).max(1),
  sourceRef: z.string().optional(),
  rawResponse: z.string().optional(),
  createdAt: z.date(),
});

export const userProfileSchema = z.object({
  id: z.string(),
  skinType: z.string().optional(),
  hairType: z.string().optional(),
  sensitivities: z.array(z.string()).default([]),
  avoidIngredients: z.array(z.string()).default([]),
  knownReactions: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const productTrackingStatusSchema = z.enum([
  "planned",
  "active",
  "paused",
  "stopped",
  "completed",
]);

export const productTrackingSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  productId: z.string(),
  status: productTrackingStatusSchema,
  startedAt: z.date().nullable(),
  nextCheckInAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const productFeedbackSchema = z.object({
  id: z.string(),
  trackingId: z.string(),
  checkInDayOffset: z.number().int().positive().optional(),
  submittedAt: z.date(),
  itch: z.number().int().min(0).max(5).nullable(),
  dryness: z.number().int().min(0).max(5).nullable(),
  reaction: z.number().int().min(0).max(5).nullable(),
  relief: z.number().int().min(0).max(5).nullable(),
  satisfaction: z.number().int().min(0).max(5).nullable(),
  note: z.string().max(2000).optional(),
});

export const createProductInputSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createAnalysisResultInputSchema = analysisResultSchema.omit({
  id: true,
  createdAt: true,
});

export const createUserProfileInputSchema = userProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createProductTrackingInputSchema = productTrackingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createProductFeedbackInputSchema = productFeedbackSchema.omit({
  id: true,
});

export type Product = z.infer<typeof productSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type ProductTrackingStatus = z.infer<typeof productTrackingStatusSchema>;
export type ProductTracking = z.infer<typeof productTrackingSchema>;
export type ProductFeedback = z.infer<typeof productFeedbackSchema>;

export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type CreateAnalysisResultInput = z.infer<typeof createAnalysisResultInputSchema>;
export type CreateUserProfileInput = z.infer<typeof createUserProfileInputSchema>;
export type CreateProductTrackingInput = z.infer<typeof createProductTrackingInputSchema>;
export type CreateProductFeedbackInput = z.infer<typeof createProductFeedbackInputSchema>;
