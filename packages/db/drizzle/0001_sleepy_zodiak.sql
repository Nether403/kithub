CREATE TABLE IF NOT EXISTS "notification_logs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"publisher_id" varchar NOT NULL,
	"kit_slug" varchar NOT NULL,
	"type" varchar(30) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_tags" (
	"id" varchar PRIMARY KEY NOT NULL,
	"skill_slug" varchar NOT NULL,
	"tag" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"slug" varchar PRIMARY KEY NOT NULL,
	"publisher_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"emoji" varchar(10) DEFAULT '🔧' NOT NULL,
	"category" varchar DEFAULT 'general' NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"install_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kits" ADD COLUMN "unpublished_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skill_tag_unique" ON "skill_tags" ("skill_slug","tag");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_publisher_id_publisher_profiles_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "publisher_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "kits"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_tags" ADD CONSTRAINT "skill_tags_skill_slug_skills_slug_fk" FOREIGN KEY ("skill_slug") REFERENCES "skills"("slug") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skills" ADD CONSTRAINT "skills_publisher_id_publisher_profiles_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "publisher_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
