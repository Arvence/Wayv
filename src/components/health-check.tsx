"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

export function HealthCheck() {
  const health = trpc.health.useQuery(undefined, { retry: 1 });

  const message = health.isPending
    ? "Checking the API and database connection..."
    : health.isError
      ? `Health check failed: ${health.error.message}`
      : `API ${health.data.api}; database ${health.data.database}.`;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div>
        <h2 className="font-medium">Foundation health</h2>
        <p className="mt-1 text-sm text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      </div>
      <Button variant="outline" disabled={health.isFetching} onClick={() => void health.refetch()}>
        {health.isFetching ? "Checking..." : "Check again"}
      </Button>
    </div>
  );
}
