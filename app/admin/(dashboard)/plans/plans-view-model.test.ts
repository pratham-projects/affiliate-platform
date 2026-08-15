import { describe, expect, it } from "bun:test"
import {
  formatPlanDurationLabel,
  validatePlanForm,
} from "./plans-view-model"

describe("formatPlanDurationLabel", () => {
  it("formats each supported duration type", () => {
    expect(formatPlanDurationLabel("one_month", null)).toEqual("One month")
    expect(formatPlanDurationLabel("lifetime", null)).toEqual("Lifetime")
    expect(formatPlanDurationLabel("x_months", 9)).toEqual("9 months")
  })
})

describe("validatePlanForm", () => {
  it("returns errors for invalid plan input", () => {
    expect(
      validatePlanForm({
        planName: " ",
        baseCommissionPercentage: "0",
        commissionDurationType: "x_months",
        durationMonths: "",
      }),
    ).toEqual({
      planName: "Plan name is required",
      baseCommissionPercentage: "Commission must be between 0.01 and 100",
      durationMonths: "Duration months are required for custom durations",
    })
  })

  it("accepts a valid plan payload", () => {
    expect(
      validatePlanForm({
        planName: "Starter",
        baseCommissionPercentage: "12.5",
        commissionDurationType: "lifetime",
        durationMonths: "",
      }),
    ).toEqual({})
  })
})
