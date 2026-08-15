import type { PayoutBalanceResponse, PayoutRequest } from "@/lib/api/payouts"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export function buildAffiliatePayoutStats(balance: PayoutBalanceResponse | null) {
  const currency = balance?.currency

  return [
    {
      key: "total-earned",
      label: "Total earned",
      value: formatCurrency(balance?.totalEarned ?? 0, currency),
      hint: "Approved commissions",
    },
    {
      key: "paid-out",
      label: "Paid out",
      value: formatCurrency(balance?.totalPaidOut ?? 0, currency),
      hint: "Completed payouts",
    },
    {
      key: "pending",
      label: "Pending payouts",
      value: formatCurrency(balance?.pendingPayouts ?? 0, currency),
      hint: "Already requested",
    },
    {
      key: "available",
      label: "Available balance",
      value: formatCurrency(balance?.availableBalance ?? 0, currency),
      hint: "Ready to request",
    },
  ]
}

export function getPayoutRequestEnabled(balance: Pick<PayoutBalanceResponse, "availableBalance"> | null) {
  return Number(balance?.availableBalance ?? 0) > 0
}

export function getAffiliatePayoutDetailMeta(
  payout: Pick<
    PayoutRequest,
    | "id"
    | "requestedAmount"
    | "approvedAmount"
    | "currency"
    | "notes"
    | "createdAt"
    | "updatedAt"
    | "approvedAt"
    | "completedAt"
  >,
) {
  return [
    { label: "Request ID", value: `#${payout.id}` },
    { label: "Requested amount", value: formatCurrency(payout.requestedAmount, payout.currency) },
    {
      label: "Approved amount",
      value: formatCurrency(payout.approvedAmount ?? payout.requestedAmount, payout.currency),
    },
    { label: "Created", value: formatDateTime(payout.createdAt) },
    { label: "Updated", value: formatDateTime(payout.updatedAt ?? payout.createdAt) },
    {
      label: "Approved at",
      value: payout.approvedAt ? formatDateTime(payout.approvedAt) : "Not approved yet",
    },
    {
      label: "Completed at",
      value: payout.completedAt ? formatDateTime(payout.completedAt) : "Not completed yet",
    },
    { label: "Notes", value: payout.notes || "None" },
  ]
}
