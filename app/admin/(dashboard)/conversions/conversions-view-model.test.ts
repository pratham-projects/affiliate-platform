import { describe, expect, it } from "bun:test"
import {
  buildAdminConversionParams,
  getConversionCustomerEmail,
} from "./conversions-view-model"

describe("buildAdminConversionParams", () => {
  it("maps filter state into admin conversion request params", () => {
    expect(
      buildAdminConversionParams({
        status: "approved",
        affiliate: "14",
        site: "9",
        conversionType: "Sale",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        search: "alice@example.com",
        page: 3,
        pageSize: 20,
      }),
    ).toEqual({
      page: 3,
      limit: 20,
      status: "approved",
      affiliateId: 14,
      siteId: 9,
      conversionType: "Sale",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      search: "alice@example.com",
    })
  })

  it("omits cleared dropdown filters from admin conversion request params", () => {
    expect(
      buildAdminConversionParams({
        status: "all",
        affiliate: "",
        site: "",
        conversionType: "",
        startDate: "",
        endDate: "",
        search: "   ",
        page: 1,
        pageSize: 20,
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: undefined,
      affiliateId: undefined,
      siteId: undefined,
      conversionType: undefined,
      startDate: undefined,
      endDate: undefined,
      search: undefined,
    })
  })
})

describe("getConversionCustomerEmail", () => {
  it("falls back through raw payload shapes before returning unavailable", () => {
    expect(getConversionCustomerEmail({ customerEmail: "direct@example.com" } as any)).toEqual("direct@example.com")
    expect(
      getConversionCustomerEmail({ rawPayload: { customer: { email: "nested@example.com" } } } as any),
    ).toEqual("nested@example.com")
    expect(getConversionCustomerEmail({ rawPayload: {} } as any)).toEqual("Unavailable")
  })
})
