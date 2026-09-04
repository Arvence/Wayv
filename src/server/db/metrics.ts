export type MetricValues = {
  views: number;
  likes: number;
  comments: number;
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateInitialMetric(): MetricValues {
  const views = randomBetween(5_000, 10_000);
  const likes = randomBetween(Math.floor(views * 0.04), Math.floor(views * 0.1));
  const comments = randomBetween(Math.max(1, Math.floor(likes * 0.03)), Math.max(1, Math.floor(likes * 0.1)));

  return { views, likes, comments };
}

export function generateNextMetric(previous: MetricValues): MetricValues {
  const views = previous.views + randomBetween(500, 5_000);
  const likes = Math.max(previous.likes, previous.likes + randomBetween(10, 500));
  const comments = Math.max(previous.comments, previous.comments + randomBetween(1, 50));

  return { views, likes, comments };
}
