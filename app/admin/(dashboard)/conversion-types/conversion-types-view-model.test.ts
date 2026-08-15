import { describe, expect, it } from "bun:test"
import {
  buildConversionTypeSummary,
  validateConversionTypeForm,
} from "./conversion-types-view-model"

describe("buildConversionTypeSummary", () => {
  it("returns total, enabled, and disabled counts", () => {
    expect(
      buildConversionTypeSummary([
        { id: 1, isActive: true },
        { id: 2, isActive: false },
        { id: 3, isActive: true },
      ] as any),
    ).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
    })
  })
})

describe("validateConversionTypeForm", () => {
  it("requires a name", () => {
    expect(validateConversionTypeForm({ name: " " })).toEqual({
      name: "Conversion type name is required",
    })
  })

  it("accepts a valid payload", () => {
    expect(validateConversionTypeForm({ name: "Signup" })).toEqual({})
  })
})
