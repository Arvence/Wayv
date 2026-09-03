"use client";

import { useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/trpc/client";

export function DevUserSwitcher() {
  const queryClient = useQueryClient();

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const devUsers = trpc.auth.devUsers.useQuery();
  const me = trpc.auth.me.useQuery();
  const switchUser = trpc.auth.switchUser.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
    },
  });

  const users = devUsers.data ?? [];

  if (devUsers.isLoading || me.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading dev users...</div>;
  }

  return (
    <div className="flex flex-col gap-2 rounded border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-medium">Dev user</span>
        <span className="text-muted-foreground">
          {me.data ? `${me.data.email} (${me.data.role})` : "No active user"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="dev-user-switcher" className="text-muted-foreground">
          Switch:
        </label>
        <select
          id="dev-user-switcher"
          className="rounded border bg-background px-2 py-1"
          value={me.data?.id ?? ""}
          onChange={(event) => {
            const value = event.target.value;

            if (!value) {
              return;
            }

            switchUser.mutate({ userId: value });
          }}
          disabled={switchUser.isPending || users.length === 0}
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email} ({user.role})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
