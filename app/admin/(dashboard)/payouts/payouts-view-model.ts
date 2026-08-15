import type { PayoutRequest, PayoutStatus } from "@/lib/api"

type AdminPayoutFilters = {
  tab: string
  status: string
  affiliate: string
  page: number
  pageSize: number
}

export function buildAdminPayoutParams(filters: AdminPayoutFilters): {
  page: number
  limit: number
  status: PayoutStatus | undefined
  affiliateId: number | undefined
} {
  return {
    page: filters.page,
    limit: filters.pageSize,
    status:
      filters.tab === "pending"
        ? "pending"
        : filters.status !== "all"
          ? (filters.status as PayoutStatus)
          : undefined,
    affiliateId: filters.affiliate !== "all" ? Number(filters.affiliate) : undefined,
  }
}

export function buildPayoutSummary(payouts: Pick<PayoutRequest, "status" | "requestedAmount">[]) {
  return payouts.reduce(
    (summary, payout) => {
      summary.total += 1
      summary.requestedAmount += Number(payout.requestedAmount || 0)
      if (payout.status === "pending") summary.pending += 1
      if (payout.status === "approved") summary.approved += 1
      if (payout.status === "completed") summary.completed += 1
      if (payout.status === "rejected") summary.rejected += 1
      return summary
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      requestedAmount: 0,
    },
  )
}
