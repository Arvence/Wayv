import { database } from "./client";
import { users } from "./schema";

const seedUsers = [
  { email: "admin@wavy.test", role: "admin" as const },
  { email: "creator1@wavy.test", role: "creator" as const },
  { email: "creator2@wavy.test", role: "creator" as const },
];

async function seed() {
  await database
    .insert(users)
    .values(seedUsers)
    .onConflictDoNothing();

  console.log("Seed completed.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });