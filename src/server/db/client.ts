import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/server/env";

declare global {
  var fullStackPostgresClient: ReturnType<typeof postgres> | undefined;
}

const client = globalThis.fullStackPostgresClient ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") {
  globalThis.fullStackPostgresClient = client;
}

export const database = drizzle(client);
