type ReferralCodeFilterState = {
  affiliate: string
  site: string
  status: string
  startDate: string
  endDate: string
  page: number
  pageSize: number
}

type ReferralCodeFormState = {
  affiliateId: string
  siteId: string
  code: string
  label: string
}

export function buildAdminReferralCodeFilters(filters: ReferralCodeFilterState) {
  return {
    page: filters.page,
    limit: filters.pageSize,
    affiliateId: filters.affiliate !== "all" ? Number(filters.affiliate) : undefined,
    siteId: filters.site !== "all" ? Number(filters.site) : undefined,
    isActive: filters.status === "true" ? true : filters.status === "false" ? false : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }
}

export function buildAdminReferralCodeFormState(code?: Partial<ReferralCodeFormState> | null): ReferralCodeFormState {
  return {
    affiliateId: code?.affiliateId ?? "",
    siteId: code?.siteId ?? "",
    code: code?.code ?? "",
    label: code?.label ?? "",
  }
}

export function buildReferralCodeSummary(items: Array<{ isActive: boolean }>) {
  const active = items.filter((item) => item.isActive).length
  return {
    total: items.length,
    active,
    inactive: items.length - active,
  }
}
