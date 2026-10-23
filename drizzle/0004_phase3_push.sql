CREATE TABLE "push_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"title_hi" text,
	"body_hi" text,
	"url" text NOT NULL,
	"image" text,
	"status" text DEFAULT 'sending' NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"lang" text DEFAULT 'en' NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sent_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
