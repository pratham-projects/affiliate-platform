import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import type { SelfAnalyticsParams } from "@/lib/api/reports"

export type AnalyticsTab = "referrers" | "os" | "browsers" | "countries" | "devices"

interface BuildSelfAnalyticsParamsArgs {
  affiliateId: number
  tab: AnalyticsTab
  page: number
  pageSize: number
  query: string
  status: string
  dateRange?: DateRange
}

type SummaryRow = {
  totalClicks: number
  totalCustomers: number
  totalConversions: number
  totalConversionAmount: string
  totalCommission: string
}

const TAB_QUERY_KEY: Record<AnalyticsTab, "referrer" | "os" | "browser" | "country" | "device"> = {
  referrers: "referrer",
  os: "os",
  browsers: "browser",
  countries: "country",
  devices: "device",
}

export function buildSelfAnalyticsParams({
  affiliateId,
  tab,
  page,
  pageSize,
  query,
  status,
  dateRange,
}: BuildSelfAnalyticsParamsArgs): SelfAnalyticsParams {
  const params: SelfAnalyticsParams = {
    affiliateId,
    page,
    limit: pageSize,
  }

  const trimmedQuery = query.trim()
  if (trimmedQuery) {
    params[TAB_QUERY_KEY[tab]] = trimmedQuery
  }

  if (status !== "all") {
    params.status = status
  }

  if (dateRange?.from) {
    params.startDate = format(dateRange.from, "yyyy-MM-dd")
    params.endDate = format(dateRange.to ?? dateRange.from, "yyyy-MM-dd")
  }

  return params
}

export function summarizeAnalyticsRows(rows: SummaryRow[]) {
  return rows.reduce(
    (summary, row) => ({
      clicks: summary.clicks + row.totalClicks,
      customers: summary.customers + row.totalCustomers,
      conversions: summary.conversions + row.totalConversions,
      revenue: summary.revenue + Number(row.totalConversionAmount),
      commission: summary.commission + Number(row.totalCommission),
    }),
    {
      clicks: 0,
      customers: 0,
      conversions: 0,
      revenue: 0,
      commission: 0,
    },
  )
}

export function truncateReferrer(value: string | null | undefined, maxLength = 40) {
  const full = value?.trim() ? value : "Direct / None"
  const truncated = full.length > maxLength

  return {
    full,
    short: truncated ? `${full.slice(0, Math.max(0, maxLength - 2))}…` : full,
    truncated,
  }
}
