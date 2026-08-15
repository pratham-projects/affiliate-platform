import { describe, expect, it } from "bun:test"
import { buildAnalyticsParams, countActiveAnalyticsFilters } from "./analytics-view-model"

describe("buildAnalyticsParams", () => {
  it("maps analytics filters and date range into request params", () => {
    expect(
      buildAnalyticsParams({
        affiliate: "12",
        referrer: "google",
        os: "macOS",
        browser: "Safari",
        country: "IN",
        device: "desktop",
        status: "approved",
        page: 4,
        pageSize: 50,
        startDate: "2026-06-01",
        endDate: "2026-06-27",
      }),
    ).toEqual({
      affiliateId: 12,
      referrer: "google",
      os: "macOS",
      browser: "Safari",
      country: "IN",
      device: "desktop",
      status: "approved",
      page: 4,
      limit: 50,
      startDate: "2026-06-01",
      endDate: "2026-06-27",
    })
  })
})

describe("countActiveAnalyticsFilters", () => {
  it("counts only applied filters", () => {
    expect(
      countActiveAnalyticsFilters({
        affiliate: "all",
        referrer: "",
        os: "Windows",
        browser: "",
        country: "",
        device: "mobile",
        status: "approved",
        startDate: "2026-06-01",
        endDate: "2026-06-27",
        page: 1,
        pageSize: 20,
      }),
    ).toEqual(4)
  })
})
