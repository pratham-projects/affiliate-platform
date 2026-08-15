import { describe, expect, it } from "bun:test"
import {
  buildSelfAnalyticsParams,
  summarizeAnalyticsRows,
  truncateReferrer,
} from "./analytics-utils"

describe("buildSelfAnalyticsParams", () => {
  it("maps the active tab query into the matching analytics parameter", () => {
    const params = buildSelfAnalyticsParams({
      affiliateId: 42,
      tab: "browsers",
      page: 3,
      pageSize: 50,
      query: "chrome",
      status: "approved",
      dateRange: {
        from: new Date("2026-06-01T00:00:00.000Z"),
        to: new Date("2026-06-03T00:00:00.000Z"),
      },
    })

    expect(params).toEqual({
      affiliateId: 42,
      page: 3,
      limit: 50,
      browser: "chrome",
      status: "approved",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
    })
  })

  it("falls back to a same-day end date and omits default filters", () => {
    const params = buildSelfAnalyticsParams({
      affiliateId: 7,
      tab: "referrers",
      page: 1,
      pageSize: 20,
      query: "   ",
      status: "all",
      dateRange: {
        from: new Date("2026-06-15T12:30:00.000Z"),
      },
    })

    expect(params).toEqual({
      affiliateId: 7,
      page: 1,
      limit: 20,
      startDate: "2026-06-15",
      endDate: "2026-06-15",
    })
  })
})

describe("summarizeAnalyticsRows", () => {
  it("totals clicks, customers, conversions, revenue, and commission", () => {
    const summary = summarizeAnalyticsRows([
      {
        totalClicks: 12,
        totalCustomers: 4,
        totalConversions: 2,
        totalConversionAmount: "125.50",
        totalCommission: "20.25",
      },
      {
        totalClicks: 8,
        totalCustomers: 3,
        totalConversions: 1,
        totalConversionAmount: "74.50",
        totalCommission: "11.75",
      },
    ])

    expect(summary).toEqual({
      clicks: 20,
      customers: 7,
      conversions: 3,
      revenue: 200,
      commission: 32,
    })
  })
})

describe("truncateReferrer", () => {
  it("preserves short labels and marks direct traffic", () => {
    expect(truncateReferrer("")).toEqual({
      full: "Direct / None",
      short: "Direct / None",
      truncated: false,
    })
  })

  it("truncates long values for table display", () => {
    const longValue = "https://example.com/some/really/long/referrer/path?with=query"

    expect(truncateReferrer(longValue, 24)).toEqual({
      full: longValue,
      short: "https://example.com/so…",
      truncated: true,
    })
  })
})
