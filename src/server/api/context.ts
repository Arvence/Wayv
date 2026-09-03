import { database } from "@/server/db/client";

type CreateTRPCContextOptions = {
  headers: Headers;
};

export function createTRPCContext({ headers }: CreateTRPCContextOptions) {
  return {
    database,
    headers,
  };
}

export type TRPCContext = ReturnType<typeof createTRPCContext>;
