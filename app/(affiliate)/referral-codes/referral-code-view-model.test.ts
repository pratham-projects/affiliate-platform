import { describe, expect, it } from "bun:test"
import {
  buildReferralCodeFilters,
  buildReferralCodeFormState,
  getReferralCodeStatusLabel,
} from "./referral-code-view-model"

describe("buildReferralCodeFilters", () => {
  it("maps UI filter strings into affiliate referral-code request params", () => {
    expect(
      buildReferralCodeFilters({
        status: "true",
        site: "12",
        page: 3,
        pageSize: 20,
      }),
    ).toEqual({
      page: 3,
      limit: 20,
      siteId: 12,
      isActive: true,
    })
  })
})

describe("buildReferralCodeFormState", () => {
  it("prefills the edit dialog from an existing referral code", () => {
    expect(
      buildReferralCodeFormState({
        id: 9,
        siteId: 14,
        code: "SUMMER9",
        label: "Homepage CTA",
      } as any),
    ).toEqual({
      siteId: "14",
      code: "SUMMER9",
      label: "Homepage CTA",
    })
  })
})

describe("getReferralCodeStatusLabel", () => {
  it("returns active and inactive labels for table display", () => {
    expect(getReferralCodeStatusLabel(true)).toEqual("active")
    expect(getReferralCodeStatusLabel(false)).toEqual("inactive")
  })
})
