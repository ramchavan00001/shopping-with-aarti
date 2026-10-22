CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"reel_code" text,
	"path" text,
	"source" text DEFAULT 'direct' NOT NULL,
	"visitor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD COLUMN "source" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ADD COLUMN "visitor" text;--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_kind_created_at_idx" ON "events" USING btree ("kind","created_at");