import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand").notNull().default("unknown"),
  type: text("type").notNull().default("unknown"),
  ingredients: text("ingredients")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analysisResults = pgTable("analysis_results", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  risks: text("risks")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  suitability: text("suitability").notNull().default("unknown"),
  confidence: real("confidence").notNull().default(0),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  skinType: text("skin_type").notNull().default("unknown"),
  hairType: text("hair_type").notNull().default("unknown"),
  sensitivities: text("sensitivities")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  avoidIngredients: text("avoid_ingredients")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  knownReactions: text("known_reactions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productTrackings = pgTable("product_trackings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  nextCheckInAt: timestamp("next_check_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productFeedbacks = pgTable("product_feedbacks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  trackingId: varchar("tracking_id")
    .notNull()
    .references(() => productTrackings.id, { onDelete: "cascade" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  itch: boolean("itch"),
  dryness: boolean("dryness"),
  reaction: text("reaction"),
  relief: text("relief"),
  satisfaction: real("satisfaction"),
  note: text("note"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  brand: true,
  type: true,
  ingredients: true,
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).pick({
  productId: true,
  summary: true,
  risks: true,
  suitability: true,
  confidence: true,
  source: true,
});

export const upsertUserProfileSchema = createInsertSchema(userProfiles)
  .pick({
    id: true,
    skinType: true,
    hairType: true,
    sensitivities: true,
    avoidIngredients: true,
    knownReactions: true,
  })
  .partial({
    id: true,
    skinType: true,
    hairType: true,
    sensitivities: true,
    avoidIngredients: true,
    knownReactions: true,
  });

export const insertProductTrackingSchema = createInsertSchema(productTrackings).pick({
  profileId: true,
  productId: true,
  status: true,
  startedAt: true,
  nextCheckInAt: true,
});

export const insertProductFeedbackSchema = createInsertSchema(productFeedbacks).pick({
  trackingId: true,
  submittedAt: true,
  itch: true,
  dryness: true,
  reaction: true,
  relief: true,
  satisfaction: true,
  note: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;

export type UpsertUserProfile = z.infer<typeof upsertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertProductTracking = z.infer<typeof insertProductTrackingSchema>;
export type ProductTracking = typeof productTrackings.$inferSelect;

export type InsertProductFeedback = z.infer<typeof insertProductFeedbackSchema>;
export type ProductFeedback = typeof productFeedbacks.$inferSelect;
