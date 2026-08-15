import type { Payment, PaymentsParams } from "@/lib/api/payments"

type PaymentFilterState = {
  status: string
  affiliateId: string
  page: number
  pageSize: number
  tab: string
}

export function buildAdminPaymentParams(filters: PaymentFilterState): PaymentsParams {
  return {
    page: filters.page,
    limit: filters.pageSize,
    affiliateId: filters.affiliateId !== "all" ? Number(filters.affiliateId) : undefined,
    status: filters.tab === "pending"
      ? "pending"
      : filters.status !== "all"
        ? filters.status
        : undefined,
  }
}

export function getPaymentAmount(payment: Payment) {
  return payment.amount || payment.amountPaid || "0"
}

export function getPaymentDate(payment: Payment) {
  return payment.createdAt || payment.paymentDate || ""
}
