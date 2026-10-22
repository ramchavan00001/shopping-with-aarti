CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"target_id" text NOT NULL,
	"kind" text NOT NULL,
	"reel_code" text,
	"store" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"type" text NOT NULL,
	"budget" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loot_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"store" text NOT NULL,
	"image" text NOT NULL,
	"deal_price" integer NOT NULL,
	"mrp" integer NOT NULL,
	"coupon" text,
	"category" text NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone NOT NULL,
	"affiliate_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"reel_code" text NOT NULL,
	"title" text NOT NULL,
	"store" text NOT NULL,
	"affiliate_url" text NOT NULL,
	"image" text NOT NULL,
	"approx_price" integer,
	"mrp" integer,
	"category" text NOT NULL,
	"note" text,
	"size_tip" text,
	"colour" text,
	"occasions" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"code" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"video" text NOT NULL,
	"poster" text NOT NULL,
	"instagram_url" text,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_at" date NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"store" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"affiliate_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_reel_code_reels_code_fk" FOREIGN KEY ("reel_code") REFERENCES "public"."reels"("code") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_category_categories_slug_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "clicks_created_at_idx" ON "clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clicks_target_id_idx" ON "clicks" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_reel_code_idx" ON "products" USING btree ("reel_code");--> statement-breakpoint
CREATE INDEX "reels_published_at_idx" ON "reels" USING btree ("published_at");