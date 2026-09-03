import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/server/api/context";
import { appRouter } from "@/server/api/root";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: ({ resHeaders }) =>
      createTRPCContext({
        headers: request.headers,
        resHeaders,
      }),
  });
}

export { handler as GET, handler as POST };