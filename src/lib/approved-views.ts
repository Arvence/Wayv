type DailyViews = {
  date: string;
  views: number;
};

type ApprovedMetric = {
  submissionId: string;
  capturedAt: string;
  views: number | string;
};

export function getLatestActiveDailyViews(dailyViews: DailyViews[]) {
  const activeDays = dailyViews.filter((day) => day.views > 0);
  const latest = activeDays.at(-1)?.views ?? null;
  const previous = activeDays.at(-2)?.views ?? null;

  return { latest, previous };
}

export function calculateViewsTrend(latest: number | null, previous: number | null) {
  if (latest === null || previous === null) {
    return null;
  }
  if (previous === 0) {
    return latest > 0 ? null : 0;
  }

  return ((latest - previous) / previous) * 100;
}

export function calculateTotalApprovedViews(
  submissions: Array<{ status: string; views: number | string }>,
) {
  return submissions
    .filter((submission) => submission.status === "approved")
    .reduce((total, submission) => total + Number(submission.views), 0);
}

export function getLatestCumulativeApprovedViews(metrics: ApprovedMetric[]) {
  const dates = [...new Set(metrics.map((metric) => metric.capturedAt))].sort();
  const latestViewsBySubmission = new Map<string, number>();
  const snapshots: number[] = [];

  for (const date of dates) {
    for (const metric of metrics) {
      if (metric.capturedAt === date) {
        latestViewsBySubmission.set(metric.submissionId, Number(metric.views));
      }
    }

    snapshots.push(
      [...latestViewsBySubmission.values()].reduce((total, views) => total + views, 0),
    );
  }

  return {
    latest: snapshots.at(-1) ?? null,
    previous: snapshots.at(-2) ?? null,
  };
}
