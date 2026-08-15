import { describe, expect, it } from "bun:test"
import {
  buildAssignmentFilters,
  formatAssignmentDuration,
  fromStoredCommissionPercentage,
  toStoredCommissionPercentage,
} from "./assignments-view-model"

describe("buildAssignmentFilters", () => {
  it("maps select state into request filters", () => {
    expect(
      buildAssignmentFilters({
        affiliateId: "12",
        relatedId: "8",
        active: "false",
      }),
    ).toEqual({
      affiliateId: 12,
      relatedId: 8,
      isActive: false,
    })
  })

  it("drops all filters when the UI is set to all", () => {
    expect(
      buildAssignmentFilters({
        affiliateId: "all",
        relatedId: "all",
        active: "all",
      }),
    ).toEqual({})
  })
})

describe("formatAssignmentDuration", () => {
  it("formats month-based overrides", () => {
    expect(formatAssignmentDuration("x_months", 6)).toEqual("6 months")
  })

  it("formats fixed duration labels", () => {
    expect(formatAssignmentDuration("one_month", null)).toEqual("One month")
    expect(formatAssignmentDuration("lifetime", null)).toEqual("Lifetime")
    expect(formatAssignmentDuration(null, null)).toEqual("Plan default")
  })
})

describe("commission percentage conversion", () => {
  it("converts between UI percentages and stored basis-point strings", () => {
    expect(toStoredCommissionPercentage("12.5")).toEqual("1250")
    expect(fromStoredCommissionPercentage("1250")).toEqual("12.5")
  })
})
