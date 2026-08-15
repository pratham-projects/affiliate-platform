import { describe, expect, it } from "bun:test"
import {
  buildSiteFilters,
  getSiteStatusActionLabel,
  validateSiteForm,
} from "./sites-view-model"

describe("buildSiteFilters", () => {
  it("maps page and status UI state into site list request params", () => {
    expect(
      buildSiteFilters({
        page: 3,
        pageSize: 20,
        status: "active",
      }),
    ).toEqual({
      page: 3,
      limit: 20,
      status: "active",
    })
  })

  it("omits the status filter when all statuses are selected", () => {
    expect(
      buildSiteFilters({
        page: 1,
        pageSize: 20,
        status: "all",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
    })
  })
})

describe("validateSiteForm", () => {
  it("returns validation errors for missing and malformed fields", () => {
    expect(validateSiteForm({ name: " ", baseUrl: "example.com" })).toEqual({
      name: "Site name is required",
      baseUrl: "Must be a valid URL (http:// or https://)",
    })
  })

  it("accepts a valid site payload", () => {
    expect(validateSiteForm({ name: "Docs", baseUrl: "https://docs.example.com" })).toEqual({})
  })
})

describe("getSiteStatusActionLabel", () => {
  it("returns the inverse status action label", () => {
    expect(getSiteStatusActionLabel("active")).toEqual("Deactivate")
    expect(getSiteStatusActionLabel("inactive")).toEqual("Activate")
  })
})
