import { CampaignList } from "@/components/campaign-list";
import { SubmissionList } from "@/components/submission-list";
import { MySubmissions } from "@/components/my-submissions";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Full-stack Project
        </h1>
        <p className="max-w-2xl text-muted-foreground ">
          The Next.js, tRPC, PostgreSQL, Drizzle, and Vitest foundation is ready
          for the application schema.
        </p>
      </div>
      <CampaignList />
      <SubmissionList />
      <MySubmissions />
    </main>
  );
}
