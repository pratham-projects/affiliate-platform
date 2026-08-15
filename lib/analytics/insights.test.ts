import { describe, expect, it } from "bun:test"
import { buildAnalyticsChartData, buildCountryMapData } from "./insights"

describe("analytics insights view model", () => {
  it("builds multi-metric chart points from analytics rows", () => {
    const rows = buildAnalyticsChartData([
      {
        referrer: "example.com",
        totalClicks: 20,
        totalCustomers: 4,
        totalConversions: 3,
        totalConversionAmount: "12000",
        totalCommission: "2400",
      },
    ])

    expect(rows).toEqual([
      {
        label: "example.com",
        clicks: 20,
        customers: 4,
        conversions: 3,
        revenue: 12000,
        commission: 2400,
      },
    ])
  })

  it("filters empty country map rows", () => {
    const rows = buildCountryMapData([
      {
        country: "IN",
        totalClicks: 10,
        totalCustomers: 2,
        totalConversions: 1,
        totalConversionAmount: "5000",
        totalCommission: "1000",
      },
      {
        country: "Unknown",
        totalClicks: 10,
        totalCustomers: 2,
        totalConversions: 0,
        totalConversionAmount: "0",
        totalCommission: "0",
      },
    ])

    expect(rows).toEqual([
      {
        country: "IN",
        value: 1,
        clicks: 10,
        conversions: 1,
        commission: 1000,
      },
    ])
  })
})
