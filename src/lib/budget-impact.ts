export function calculateBudgetPercentage(partCents: number, totalCents: number) {
  if (totalCents <= 0 || partCents <= 0) {
    return 0;
  }

  return (partCents / totalCents) * 100;
}

export function calculateBudgetImpactPercent(
  estimatedPayoutCents: number,
  totalBudgetCents: number,
) {
  return calculateBudgetPercentage(estimatedPayoutCents, totalBudgetCents);
}
