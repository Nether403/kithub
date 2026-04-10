CREATE TABLE "kit_view_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"kit_slug" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kit_view_events" ADD CONSTRAINT "kit_view_events_kit_slug_kits_slug_fk" FOREIGN KEY ("kit_slug") REFERENCES "public"."kits"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kit_view_events_kit_slug_created_at_idx" ON "kit_view_events" USING btree ("kit_slug","created_at");