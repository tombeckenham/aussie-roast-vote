import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema (kept from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Electoral Seats
export const electoralSeats = pgTable("electoral_seats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state").notNull(),
  description: text("description"),
  isMarginial: boolean("is_marginial").default(false),
  currentMp: text("current_mp"),
  currentParty: text("current_party"),
  keyIssues: text("key_issues").array(),
  previousResults: json("previous_results"),
  slug: text("slug").notNull().unique(),
  position: json("position") // For map positioning
});

export const insertElectoralSeatSchema = createInsertSchema(electoralSeats).omit({
  id: true
});

export type InsertElectoralSeat = z.infer<typeof insertElectoralSeatSchema>;
export type ElectoralSeat = typeof electoralSeats.$inferSelect;

// Political Parties
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  shortName: text("short_name"),
  color: text("color"), // Hex color code
  logoUrl: text("logo_url")
});

export const insertPartySchema = createInsertSchema(parties).omit({
  id: true
});

export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof parties.$inferSelect;

// Candidates
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partyId: integer("party_id"),
  isIndependent: boolean("is_independent").default(false),
  electoralSeatId: integer("electoral_seat_id").notNull(),
  position: text("position"),
  bio: text("bio"),
  imageUrl: text("image_url"),
  twitterHandle: text("twitter_handle"),
  facebookUrl: text("facebook_url"),
  websiteUrl: text("website_url"),
  keyPolicies: text("key_policies").array(),
  isIncumbent: boolean("is_incumbent").default(false)
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Campaign Activities
export const campaignActivities = pgTable("campaign_activities", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  dateTime: timestamp("date_time").notNull(),
  endDateTime: timestamp("end_date_time"),
  type: text("type") // e.g. "speech", "meet-and-greet", "debate"
});

export const insertCampaignActivitySchema = createInsertSchema(campaignActivities).omit({
  id: true
});

export type InsertCampaignActivity = z.infer<typeof insertCampaignActivitySchema>;
export type CampaignActivity = typeof campaignActivities.$inferSelect;

// AI Roasts
export const aiRoasts = pgTable("ai_roasts", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  content: text("content").notNull(),
  fullContent: text("full_content"), // Extended roast for detailed view
  generatedAt: timestamp("generated_at").defaultNow(),
  isSpicy: boolean("is_spicy").default(false)
});

export const insertAiRoastSchema = createInsertSchema(aiRoasts).omit({
  id: true,
  generatedAt: true
});

export type InsertAiRoast = z.infer<typeof insertAiRoastSchema>;
export type AiRoast = typeof aiRoasts.$inferSelect;

// Candidate Q&A History
export const candidateQA = pgTable("candidate_qa", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertCandidateQASchema = createInsertSchema(candidateQA).omit({
  id: true,
  timestamp: true
});

export type InsertCandidateQA = z.infer<typeof insertCandidateQASchema>;
export type CandidateQA = typeof candidateQA.$inferSelect;
