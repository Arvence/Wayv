import { HealthCheck } from "@/components/health-check";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Example Project</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Full-stack Project</h1>
        <p className="max-w-2xl text-muted-foreground">
          The Next.js, tRPC, PostgreSQL, Drizzle, and Vitest foundation is ready for the application schema.
        </p>
      </div>
      <HealthCheck />
    </main>
  );
}
