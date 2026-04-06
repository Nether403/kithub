import { pgTable, text, timestamp, varchar, integer, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const publisherProfiles = pgTable("publisher_profiles", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  agentName: varchar("agent_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kits = pgTable("kits", {
  slug: varchar("slug").primaryKey(),
  publisherId: varchar("publisher_id").notNull().references(() => publisherProfiles.id),
  title: varchar("title").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitReleases = pgTable("kit_releases", {
  id: varchar("id").primaryKey(),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  version: varchar("version").notNull(),
  rawMarkdown: text("raw_markdown").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kitTags = pgTable("kit_tags", {
  id: varchar("id").primaryKey(),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  tag: varchar("tag").notNull(),
});

export const kitReleaseScans = pgTable("kit_release_scans", {
  id: varchar("id").primaryKey(),
  releaseId: varchar("release_id").notNull().references(() => kitReleases.id),
  score: integer("score"),
  findings: jsonb("findings"),
  status: varchar("status").notNull(), // passed, failed, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kitInstallEvents = pgTable("kit_install_events", {
  id: varchar("id").primaryKey(),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  target: varchar("target").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learnings = pgTable("learnings", {
  id: varchar("id").primaryKey(),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  context: text("context").notNull(), // OS, model, runtime
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
