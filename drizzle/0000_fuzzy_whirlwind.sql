CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'creator');--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"platforms" "platform"[] NOT NULL,
	"payout_per_1k_views" integer NOT NULL,
	"total_budget" integer NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_title_not_blank" CHECK (length(btrim("campaign"."title")) > 0),
	CONSTRAINT "campaign_platforms_not_empty" CHECK (cardinality("campaign"."platforms") > 0),
	CONSTRAINT "campaign_payout_nonnegative" CHECK ("campaign"."payout_per_1k_views" >= 0),
	CONSTRAINT "campaign_budget_nonnegative" CHECK ("campaign"."total_budget" >= 0),
	CONSTRAINT "campaign_date_range" CHECK ("campaign"."ends_at" > "campaign"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "submission_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"captured_at" date NOT NULL,
	"views" bigint NOT NULL,
	"likes" bigint NOT NULL,
	"comments" bigint NOT NULL,
	CONSTRAINT "submission_metric_counts_nonnegative" CHECK ("submission_metric"."views" >= 0 and "submission_metric"."likes" >= 0 and "submission_metric"."comments" >= 0)
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"post_url" text NOT NULL,
	"platform" "platform" NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_post_url_not_blank" CHECK (length(btrim("submission"."post_url")) > 0),
	CONSTRAINT "submission_rejection_reason" CHECK (
    ("submission"."status" = 'rejected' and "submission"."rejection_reason" is not null and length(btrim("submission"."rejection_reason")) > 0)
    or ("submission"."status" <> 'rejected' and "submission"."rejection_reason" is null)
  )
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	CONSTRAINT "user_email_not_blank" CHECK (length(btrim("user"."email")) > 0)
);
--> statement-breakpoint
ALTER TABLE "submission_metric" ADD CONSTRAINT "submission_metric_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_status_dates_idx" ON "campaign" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_metric_submission_date_unique" ON "submission_metric" USING btree ("submission_id","captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "submission_campaign_post_url_unique" ON "submission" USING btree ("campaign_id","post_url");--> statement-breakpoint
CREATE INDEX "submission_campaign_status_idx" ON "submission" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "submission_creator_created_at_idx" ON "submission" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lower_unique" ON "user" USING btree (lower("email"));