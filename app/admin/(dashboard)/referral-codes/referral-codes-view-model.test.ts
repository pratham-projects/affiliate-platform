import { describe, expect, it } from "bun:test"
import {
  buildAdminReferralCodeFilters,
  buildAdminReferralCodeFormState,
  buildReferralCodeSummary,
} from "./referral-codes-view-model"

describe("buildAdminReferralCodeFilters", () => {
  it("maps UI values into admin referral code query params", () => {
    expect(
      buildAdminReferralCodeFilters({
        affiliate: "5",
        site: "12",
        status: "false",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        page: 4,
        pageSize: 20,
      }),
    ).toEqual({
      page: 4,
      limit: 20,
      affiliateId: 5,
      siteId: 12,
      isActive: false,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    })
  })
})

describe("buildAdminReferralCodeFormState", () => {
  it("returns a stable dialog shape", () => {
    expect(buildAdminReferralCodeFormState({ affiliateId: "2", siteId: "7", code: "HELLO", label: "Summer" })).toEqual({
      affiliateId: "2",
      siteId: "7",
      code: "HELLO",
      label: "Summer",
    })
  })
})

describe("buildReferralCodeSummary", () => {
  it("counts active and inactive codes", () => {
    expect(
      buildReferralCodeSummary([
        { isActive: true },
        { isActive: false },
        { isActive: true },
      ]),
    ).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
    })
  })
})
