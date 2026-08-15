import type {
  AffiliateAnalyticsRow,
  BrowserAnalyticsRow,
  CountryAnalyticsRow,
  DeviceAnalyticsRow,
  OSAnalyticsRow,
  ReferrerAnalyticsRow,
} from "@/lib/api"

export type AnalyticsInsightRow =
  | AffiliateAnalyticsRow
  | ReferrerAnalyticsRow
  | OSAnalyticsRow
  | BrowserAnalyticsRow
  | CountryAnalyticsRow
  | DeviceAnalyticsRow

export interface AnalyticsChartPoint {
  label: string
  clicks: number
  customers: number
  conversions: number
  revenue: number
  commission: number
}

export interface CountryMapDatum {
  country: string
  value: number
  clicks: number
  conversions: number
  commission: number
}

export function getAnalyticsRowLabel(row: AnalyticsInsightRow, fallback = "Unknown") {
  const record = row as unknown as Record<string, unknown>
  return String(
    record.affiliateName ||
      record.referrer ||
      record.os ||
      record.browser ||
      record.country ||
      record.deviceType ||
      fallback,
  )
}

export function buildAnalyticsChartData(rows: AnalyticsInsightRow[], limit = 8): AnalyticsChartPoint[] {
  return rows.slice(0, limit).map((row, index) => ({
    label: getAnalyticsRowLabel(row, `Row ${index + 1}`),
    clicks: Number(row.totalClicks || 0),
    customers: Number(row.totalCustomers || 0),
    conversions: Number(row.totalConversions || 0),
    revenue: Number(row.totalConversionAmount || 0),
    commission: Number(row.totalCommission || 0),
  }))
}

export function buildCountryMapData(rows: CountryAnalyticsRow[]): CountryMapDatum[] {
  return rows
    .map((row) => ({
      country: row.country || "Unknown",
      value: Number(row.totalConversions || 0),
      clicks: Number(row.totalClicks || 0),
      conversions: Number(row.totalConversions || 0),
      commission: Number(row.totalCommission || 0),
    }))
    .filter((row) => row.country !== "Unknown" && row.value > 0)
}
