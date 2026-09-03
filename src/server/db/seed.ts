import type { InferInsertModel } from "drizzle-orm";
import { inArray } from "drizzle-orm";

import { database } from "./client";
import { campaigns, users } from "./schema";

const seedUserValues = [
  { email: "admin@wavy.test", role: "admin" as const },
  { email: "creator1@wavy.test", role: "creator" as const },
  { email: "creator2@wavy.test", role: "creator" as const },
];

const seedCampaignValues = [
  {
    title: "Summer Streetwear Clips",
    platforms: ["tiktok", "instagram"] as const,
    payoutPer1kViews: 250,
    totalBudget: 250_000,
    status: "active" as const,
    startsAt: new Date("2026-06-01T00:00:00Z"),
    endsAt: new Date("2026-09-30T23:59:59Z"),
  },
  {
    title: "Indie Game Launch",
    platforms: ["youtube", "tiktok"] as const,
    payoutPer1kViews: 400,
    totalBudget: 500_000,
    status: "active" as const,
    startsAt: new Date("2026-07-15T00:00:00Z"),
    endsAt: new Date("2026-10-31T23:59:59Z"),
  },
  {
    title: "Mindful Morning Routine",
    platforms: ["instagram", "youtube"] as const,
    payoutPer1kViews: 300,
    totalBudget: 150_000,
    status: "draft" as const,
    startsAt: new Date("2026-10-01T00:00:00Z"),
    endsAt: new Date("2026-12-31T23:59:59Z"),
  },
] satisfies InferInsertModel<typeof campaigns>[];

async function seedUsers() {
  await database
    .insert(users)
    .values(seedUserValues)
    .onConflictDoNothing();
}

async function seedCampaigns() {
  const titles = seedCampaignValues.map((campaign) => campaign.title);
  const existingCampaigns = await database
    .select({ title: campaigns.title })
    .from(campaigns)
    .where(inArray(campaigns.title, titles));
  const existingTitles = new Set(existingCampaigns.map((campaign) => campaign.title));
  const campaignsToInsert = seedCampaignValues.filter(
    (campaign) => !existingTitles.has(campaign.title),
  );

  if (campaignsToInsert.length > 0) {
    await database.insert(campaigns).values(campaignsToInsert);
  }

  return campaignsToInsert.length;
}

async function seed() {
  await seedUsers();
  const createdCampaigns = await seedCampaigns();

  console.log(`Seed completed. ${createdCampaigns} campaign(s) created.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });