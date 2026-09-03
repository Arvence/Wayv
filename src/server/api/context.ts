import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { readUserCookie } from "@/server/auth/cookie";
import { database } from "@/server/db/client";
import { users } from "@/server/db/schema";

type CreateTRPCContextOptions = {
  headers: Headers;
  resHeaders: Headers;
};

export type TRPCContext = {
  database: typeof database;
  headers: Headers;
  resHeaders: Headers;
  user: InferSelectModel<typeof users> | null;
};

function getCookie(headers: Headers, name: string) {
  const cookieHeader = headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export async function createTRPCContext({
  headers,
  resHeaders,
}: CreateTRPCContextOptions): Promise<TRPCContext> {
  const cookieValue = getCookie(headers, "wavy_user");
  const userId = cookieValue ? readUserCookie(cookieValue) : null;

  const [user] = userId
    ? await database.select().from(users).where(eq(users.id, userId)).limit(1)
    : [];

  return {
    database,
    headers,
    resHeaders,
    user: user ?? null,
  };
}
