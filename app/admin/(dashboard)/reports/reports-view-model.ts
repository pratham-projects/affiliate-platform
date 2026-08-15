import type { OverviewStats, TopAffiliate } from "@/lib/api"

export function buildOverviewSummary(stats: OverviewStats | null) {
  return {
    customers: stats?.customers ?? 0,
    conversions: stats?.conversions ?? 0,
    revenue: Number(stats?.revenue ?? 0),
    commission: Number(stats?.commission ?? 0),
  }
}

export function buildTopAffiliateRow(affiliate: TopAffiliate) {
  return {
    id: String(affiliate.affiliateId),
    affiliateId: affiliate.affiliateId,
    affiliateName: affiliate.affiliateName || affiliate.fullName || "Unknown",
    conversions: affiliate.conversionCount ?? affiliate.totalConversions ?? 0,
    revenue: Number(affiliate.totalRevenue || affiliate.totalEarned || 0),
    commission: Number(affiliate.totalCommission || affiliate.totalEarned || 0),
  }
}

export function buildTopAffiliateQuery(filters: {
  page: number
  pageSize: number
  startDate: string
  endDate: string
}) {
  return {
    limit: filters.pageSize,
    offset: (filters.page - 1) * filters.pageSize,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }
}
