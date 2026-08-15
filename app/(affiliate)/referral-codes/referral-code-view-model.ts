import type { ReferralCode } from "@/lib/api/referral-codes"

export function buildReferralCodeFilters(filters: {
  status: string
  site: string
  page: number
  pageSize: number
}) {
  return {
    page: filters.page,
    limit: filters.pageSize,
    siteId: filters.site !== "all" ? Number(filters.site) : undefined,
    isActive: filters.status === "true" ? true : filters.status === "false" ? false : undefined,
  }
}

export function buildReferralCodeFormState(code?: Pick<ReferralCode, "siteId" | "code" | "label"> | null) {
  return {
    siteId: code ? String(code.siteId) : "",
    code: code?.code ?? "",
    label: code?.label ?? "",
  }
}

export function getReferralCodeStatusLabel(isActive: boolean) {
  return isActive ? "active" : "inactive"
}
