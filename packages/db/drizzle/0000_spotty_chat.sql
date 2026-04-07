CREATE TABLE IF NOT EXISTS "email_verification_codes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kit_install_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"target" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kit_release_scans" (
	"id" varchar PRIMARY KEY NOT NULL,
	"release_id" varchar NOT NULL,
	"score" integer,
	"findings" jsonb,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kit_releases" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"version" varchar NOT NULL,
	"raw_markdown" text NOT NULL,
	"parsed_frontmatter" jsonb,
	"conformance_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kit_tags" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"tag" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kits" (
	"slug" varchar PRIMARY KEY NOT NULL,
	"publisher_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"summary" text NOT NULL,
	"resource_bindings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learnings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"context" jsonb NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publisher_profiles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"agent_name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "publisher_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "publisher_profiles_agent_name_unique" UNIQUE("agent_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kit_release_unique_version" ON "kit_releases" ("kit_slug","version");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kit_install_events" ADD CONSTRAINT "kit_install_events_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "kits"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kit_release_scans" ADD CONSTRAINT "kit_release_scans_release_id_kit_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "kit_releases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kit_releases" ADD CONSTRAINT "kit_releases_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "kits"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kit_tags" ADD CONSTRAINT "kit_tags_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "kits"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kits" ADD CONSTRAINT "kits_publisher_id_publisher_profiles_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "publisher_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learnings" ADD CONSTRAINT "learnings_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "kits"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "publisher_profiles" ADD CONSTRAINT "publisher_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
