import type { submissionStatuses } from "@/schemas/submission";

export function getSubmissionStatusClasses(
  status: (typeof submissionStatuses)[number],
) {
  switch (status) {
    case "approved":
      return "border-green-800 bg-green-950/50 text-green-300";
    case "pending":
      return "border-amber-800 bg-amber-950/50 text-amber-300";
    case "rejected":
      return "border-red-800 bg-red-950/50 text-red-300";
    case "paid":
      return "border-blue-800 bg-blue-950/50 text-blue-300";
  }
}
