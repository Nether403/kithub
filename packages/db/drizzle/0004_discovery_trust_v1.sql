CREATE TABLE "collections" (
	"slug" varchar PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"curator" varchar DEFAULT 'SkillKitHub' NOT NULL,
	"emoji" varchar(10) DEFAULT '📦' NOT NULL,
	"kit_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kit_embeddings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"release_id" varchar,
	"model" varchar DEFAULT 'text-embedding-3-small' NOT NULL,
	"input_hash" varchar NOT NULL,
	"vector" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kit_embeddings_kit_slug_unique" UNIQUE("kit_slug")
);
--> statement-breakpoint
CREATE TABLE "kit_ratings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"stars" integer NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publisher_profiles" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "kit_embeddings" ADD CONSTRAINT "kit_embeddings_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "public"."kits"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_embeddings" ADD CONSTRAINT "kit_embeddings_release_id_kit_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."kit_releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_ratings" ADD CONSTRAINT "kit_ratings_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "public"."kits"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_ratings" ADD CONSTRAINT "kit_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_ratings" ADD CONSTRAINT "kit_ratings_publisher_id_publisher_profiles_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kit_embedding_kit_slug_idx" ON "kit_embeddings" USING btree ("kit_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "kit_rating_unique_user_kit" ON "kit_ratings" USING btree ("user_id","kit_slug");--> statement-breakpoint
CREATE INDEX "kit_rating_kit_slug_idx" ON "kit_ratings" USING btree ("kit_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "kit_tag_unique" ON "kit_tags" USING btree ("kit_slug","tag");