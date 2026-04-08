import { pgTable, text, timestamp, varchar, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

// ── Users & Identity ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email").notNull().unique(),
  supabaseUserId: varchar("supabase_user_id").unique(),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publisherProfiles = pgTable("publisher_profiles", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  agentName: varchar("agent_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Kits & Releases ───────────────────────────────────────────────

export const kits = pgTable("kits", {
  slug: varchar("slug").primaryKey(),
  publisherId: varchar("publisher_id").notNull().references(() => publisherProfiles.id),
  title: varchar("title").notNull(),
  summary: text("summary").notNull(),
  resourceBindings: jsonb("resource_bindings").$type<Array<{
    resourceId: string;
    kind: string;
    purpose: string;
    deliveryMethod: string;
  }>>(),
  unpublishedAt: timestamp("unpublished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitReleases = pgTable("kit_releases", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  version: varchar("version").notNull(),
  rawMarkdown: text("raw_markdown").notNull(),
  parsedFrontmatter: jsonb("parsed_frontmatter"),
  conformanceLevel: varchar("conformance_level", { length: 20 }).notNull().default("standard"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueVersion: uniqueIndex("kit_release_unique_version").on(table.kitSlug, table.version),
}));

export const kitTags = pgTable("kit_tags", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  tag: varchar("tag").notNull(),
});

// ── Safety & Quality ──────────────────────────────────────────────

export const kitReleaseScans = pgTable("kit_release_scans", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  releaseId: varchar("release_id").notNull().references(() => kitReleases.id),
  score: integer("score"),
  findings: jsonb("findings").$type<Array<{
    type: "error" | "warning" | "tip";
    message: string;
    location?: string;
  }>>(),
  status: varchar("status", { length: 20 }).notNull(), // passed, failed, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Analytics ─────────────────────────────────────────────────────

export const kitInstallEvents = pgTable("kit_install_events", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  target: varchar("target").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Learnings ─────────────────────────────────────────────────────

export const learnings = pgTable("learnings", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  context: jsonb("context").$type<{
    os?: string;
    model?: string;
    runtime?: string;
    platform?: string;
  }>().notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Skills ───────────────────────────────────────────────────────

export const skills = pgTable("skills", {
  slug: varchar("slug").primaryKey(),
  publisherId: varchar("publisher_id").notNull().references(() => publisherProfiles.id),
  title: varchar("title").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull().default("🔧"),
  category: varchar("category").notNull().default("general"),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  installCount: integer("install_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const skillTags = pgTable("skill_tags", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  skillSlug: varchar("skill_slug").notNull().references(() => skills.slug),
  tag: varchar("tag").notNull(),
}, (table) => ({
  uniqueSkillTag: uniqueIndex("skill_tag_unique").on(table.skillSlug, table.tag),
}));

// ── Notification Logs ────────────────────────────────────────────

export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  publisherId: varchar("publisher_id").notNull().references(() => publisherProfiles.id),
  kitSlug: varchar("kit_slug").notNull().references(() => kits.slug),
  type: varchar("type", { length: 30 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
