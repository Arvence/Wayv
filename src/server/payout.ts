export function calculatePayoutCents(views: number, payoutPer1kViews: number) {
  return Math.floor(views / 1_000) * payoutPer1kViews;
}

export function isBudgetAvailable(
  candidatePayoutCents: number,
  spentCents: number,
  totalBudgetCents: number,
) {
  return candidatePayoutCents <= totalBudgetCents - spentCents;
}
