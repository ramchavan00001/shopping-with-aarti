CREATE TABLE "error_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"origin" text NOT NULL,
	"fingerprint" text NOT NULL,
	"message" text NOT NULL,
	"detail" text,
	"path" text,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"name" text PRIMARY KEY NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_finished_at" timestamp with time zone,
	"last_status" text,
	"last_summary" text
);
--> statement-breakpoint
CREATE TABLE "link_checks" (
	"target_id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"final_url" text,
	"detail" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "reels" ADD COLUMN "instagram_media_id" text;--> statement-breakpoint
CREATE INDEX "error_log_fingerprint_idx" ON "error_log" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "error_log_last_seen_idx" ON "error_log" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");