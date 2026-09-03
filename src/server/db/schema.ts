import { sql } from "drizzle-orm";
import { bigint, check, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "creator"]);
export const platformEnum = pgEnum("platform", ["tiktok", "instagram", "youtube"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "paused", "completed"]);
export const submissionStatusEnum = pgEnum("submission_status", ["pending", "approved", "rejected", "paid"]);

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull(),
}, (table) => [
  uniqueIndex("user_email_lower_unique").on(sql`lower(${table.email})`),
  check("user_email_not_blank", sql`length(btrim(${table.email})) > 0`),
]);

export const campaigns = pgTable("campaign", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  platforms: platformEnum("platforms").array().notNull(),
  payoutPer1kViews: integer("payout_per_1k_views").notNull(),
  totalBudget: integer("total_budget").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("campaign_status_dates_idx").on(table.status, table.startsAt, table.endsAt),
  check("campaign_title_not_blank", sql`length(btrim(${table.title})) > 0`),
  check("campaign_platforms_not_empty", sql`cardinality(${table.platforms}) > 0`),
  check("campaign_payout_nonnegative", sql`${table.payoutPer1kViews} >= 0`),
  check("campaign_budget_nonnegative", sql`${table.totalBudget} >= 0`),
  check("campaign_date_range", sql`${table.endsAt} > ${table.startsAt}`),
]);

export const submissions = pgTable("submission", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  postUrl: text("post_url").notNull(),
  platform: platformEnum("platform").notNull(),
  status: submissionStatusEnum("status").default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("submission_campaign_post_url_unique").on(table.campaignId, table.postUrl),
  index("submission_campaign_status_idx").on(table.campaignId, table.status),
  index("submission_creator_created_at_idx").on(table.creatorId, table.createdAt),
  check("submission_post_url_not_blank", sql`length(btrim(${table.postUrl})) > 0`),
  check("submission_rejection_reason", sql`
    (${table.status} = 'rejected' and ${table.rejectionReason} is not null and length(btrim(${table.rejectionReason})) > 0)
    or (${table.status} <> 'rejected' and ${table.rejectionReason} is null)
  `),
]);

export const submissionMetrics = pgTable("submission_metric", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  capturedAt: date("captured_at").notNull(),
  views: bigint("views", { mode: "number" }).notNull(),
  likes: bigint("likes", { mode: "number" }).notNull(),
  comments: bigint("comments", { mode: "number" }).notNull(),
}, (table) => [
  uniqueIndex("submission_metric_submission_date_unique").on(table.submissionId, table.capturedAt.desc()),
  check("submission_metric_counts_nonnegative", sql`${table.views} >= 0 and ${table.likes} >= 0 and ${table.comments} >= 0`),
]);
