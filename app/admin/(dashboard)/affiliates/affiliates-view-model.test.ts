import { describe, expect, it } from "bun:test"
import {
  buildAffiliateFilters,
  formatAffiliateContact,
  getAffiliatePrimaryAction,
} from "./affiliates-view-model"

describe("buildAffiliateFilters", () => {
  it("maps list state into affiliate request params", () => {
    expect(
      buildAffiliateFilters({
        page: 2,
        pageSize: 20,
        status: "approved",
      }),
    ).toEqual({
      page: 2,
      limit: 20,
      status: "approved",
    })
  })

  it("omits the status when all statuses are selected", () => {
    expect(
      buildAffiliateFilters({
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

describe("formatAffiliateContact", () => {
  it("renders a readable platform + handle string", () => {
    expect(formatAffiliateContact("telegram", "@partner")).toEqual("Telegram: @partner")
  })

  it("falls back when contact details are missing", () => {
    expect(formatAffiliateContact(null, null)).toEqual("Not provided")
  })
})

describe("getAffiliatePrimaryAction", () => {
  it("returns the correct next action for each status", () => {
    expect(getAffiliatePrimaryAction("pending")).toEqual("Approve")
    expect(getAffiliatePrimaryAction("approved")).toEqual("Suspend")
    expect(getAffiliatePrimaryAction("suspended")).toEqual("Reactivate")
  })
})
