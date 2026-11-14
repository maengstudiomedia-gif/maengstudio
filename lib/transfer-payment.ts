export function calculateInitialPaymentAmount(
  totalAmount: number,
  dpAmount: number,
  paymentPlan: "dp" | "full",
  paymentMethod: "cash" | "transfer",
  transferCode: number
) {
  const baseAmount = paymentPlan === "full" ? totalAmount : dpAmount;
  return baseAmount + (paymentMethod === "transfer" ? Math.max(transferCode, 0) : 0);
}

export function calculateExpectedSettlement(totalAmount: number, dpAmount: number) {
  return Math.max(totalAmount - dpAmount, 0);
}