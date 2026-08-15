import { describe, expect, it } from "bun:test"
import {
  buildOverviewSummary,
  buildTopAffiliateRow,
  buildTopAffiliateQuery,
} from "./reports-view-model"

describe("buildOverviewSummary", () => {
  it("normalizes nullable overview stats", () => {
    expect(buildOverviewSummary(null)).toEqual({
      customers: 0,
      conversions: 0,
      revenue: 0,
      commission: 0,
    })
  })
})

describe("buildTopAffiliateRow", () => {
  it("falls back across affiliate response shapes", () => {
    expect(
      buildTopAffiliateRow({
        affiliateId: 7,
        fullName: "Jamie Doe",
        totalRevenue: "120.50",
        totalCommission: "20.25",
        totalConversions: 9,
      } as any),
    ).toEqual({
      id: "7",
      affiliateId: 7,
      affiliateName: "Jamie Doe",
      conversions: 9,
      revenue: 120.5,
      commission: 20.25,
    })
  })
})

describe("buildTopAffiliateQuery", () => {
  it("converts page and date range into report query params", () => {
    expect(
      buildTopAffiliateQuery({
        page: 2,
        pageSize: 20,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    ).toEqual({
      limit: 20,
      offset: 20,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    })
  })
})
