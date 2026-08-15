type AnalyticsFilters = {
  affiliate: string
  referrer: string
  os: string
  browser: string
  country: string
  device: string
  status: string
  page: number
  pageSize: number
  startDate: string
  endDate: string
}

export function buildAnalyticsParams(filters: AnalyticsFilters) {
  return {
    affiliateId: filters.affiliate !== "all" ? Number(filters.affiliate) : undefined,
    referrer: filters.referrer || undefined,
    os: filters.os || undefined,
    browser: filters.browser || undefined,
    country: filters.country || undefined,
    device: filters.device || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    page: filters.page,
    limit: filters.pageSize,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }
}

export function countActiveAnalyticsFilters(filters: AnalyticsFilters) {
  return [
    filters.affiliate !== "all",
    Boolean(filters.referrer),
    Boolean(filters.os),
    Boolean(filters.browser),
    Boolean(filters.country),
    Boolean(filters.device),
    filters.status !== "all",
    Boolean(filters.startDate),
  ].filter(Boolean).length
}
